import { BotClient } from '../structures/BotClient';
import { TextChannel, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();
import { StaticDataService } from './staticDataService';
import { DatabaseService } from './databaseService';
import { TibiaDataService } from './tibiaDataService'; // <--- Importamos el nuevo servicio

interface NewsItem {
  id: number;
  date: string;
  news: string;
  category: string;
  type: string;
  url: string;
}

interface HouseItem {
  house_id: number;
  name: string;
  size: number;
  rent: number;
  rented: boolean;
  auctioned: boolean;
  town?: string; // Manually added
  status?: string; // Derived
  auction?: {
    current_bid: number;
    time_left: string; // "2 days", "4 hours"
    finished: boolean;
  };
}

export class SchedulerService {
  private client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  public init() {
    console.log('[SchedulerService] Iniciando servicios programados...');
    
    // Check news every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.checkNews();
    });

    // Check houses daily at 08:00 AM
    cron.schedule('0 8 * * *', () => {
      this.checkHouses();
      this.checkDailyStats();
    });

    // Check tracked characters every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      this.checkTrackedCharacters();
    });

    console.log('[SchedulerService] Ejecutando chequeo inicial...');
    // this.checkNews();
    // this.checkDailyStats();
    // this.checkHouses();
    this.checkTrackedCharacters();
  }

  private async checkNews() {
    try {
      console.log('[SchedulerService] Buscando nuevas noticias...');
      // REFACTORIZADO: Usamos el servicio en lugar de fetch directo
      const data = await TibiaDataService.getLatestNews();
      
      if (!data || !data.news) return;

      const newsList: NewsItem[] = data.news;
      const reversedNews = [...newsList].reverse();

      for (const item of reversedNews) {
        const exists = await prisma.news.findUnique({
          where: { tibiaId: item.id }
        });

        if (!exists) {
          // Get all guilds with news channel configured
          const guilds = await prisma.guildConfig.findMany({
            where: { newsChannelId: { not: null } }
          });

          for (const guild of guilds) {
            if (!guild.newsChannelId) continue;
            try {
              const channel = await this.client.channels.fetch(guild.newsChannelId) as TextChannel;
              if (channel) {
                await channel.send({
                  content: `📢 **Nueva Noticia de Tibia**\n\n**${item.news}**\n${item.category} - ${item.date}\n${item.url}`
                });
              }
            } catch (err) {
              console.error(`[SchedulerService] Error enviando noticia a guild ${guild.id}:`, err);
            }
          }

          await prisma.news.create({
            data: {
              tibiaId: item.id,
              title: item.news,
              date: new Date(item.date)
            }
          });
          console.log(`[SchedulerService] Noticia guardada: ${item.id}`);
        }
      }

    } catch (error) {
      console.error('[SchedulerService] Error checking news:', error);
    }
  }

  private async checkHouses() {
    try {
      // Get all unique worlds configured
      const configs = await prisma.guildConfig.findMany({
        where: { dailyChannelId: { not: null }, tibiaWorld: { not: null } }
      });

      if (configs.length === 0) return;

      // Group by world to avoid duplicate API calls
      const worlds = [...new Set(configs.map(c => c.tibiaWorld as string))];
      const towns = [
        "Ab'Dendriel", "Ankrahmun", "Carlin", "Darashia", "Edron", "Farmine", 
        "Gray Beach","Issavi", "Kazordoon", "Liberty Bay", "Port Hope", "Rathleton", 
        "Svargrond", "Thais", "Venore", "Yalahar"
      ];
      // const today = new Date().toISOString().split('T')[0];

      for (const world of worlds) {
        console.log(`[SchedulerService] Revisando casas para ${world}...`);
        let auctionEndingHouses: HouseItem[] = [];

        for (const town of towns) {
          // REFACTORIZADO: Usamos el servicio en lugar de fetch directo
          const data = await TibiaDataService.getHouses(world, town);

          if (!data || !data.houses || !data.houses.house_list) continue;

          // Map API response to our HouseItem type
          const houses: HouseItem[] = data.houses.house_list.map((h: any) => ({
            ...h,
            town, // Inject town from loop
            status: h.auctioned ? 'auctioned' : h.rented ? 'rented' : 'available'
          }));
          for (const house of houses) {
            if (house.status === 'auctioned' && house.auction && house.auction.time_left) {
               // Exclude 7, 6, 5, 4 days (keep 3 days or less)
               const timeLeftMinutes = this.parseTimeLeft(house.auction.time_left);
               const threeDaysMinutes = 3 * 24 * 60;
               
               if (timeLeftMinutes <= threeDaysMinutes) {
                 auctionEndingHouses.push(house);
               }
            }
          }
        }

        if (auctionEndingHouses.length > 0) {
          // Sort by time left (shortest time first)
          auctionEndingHouses.sort((a, b) => {
            const timeA = this.parseTimeLeft(a.auction?.time_left || '');
            const timeB = this.parseTimeLeft(b.auction?.time_left || '');
            return timeA - timeB;
          });

          const houseLines = auctionEndingHouses.map(h => {
             const bid = h.auction?.current_bid ? h.auction.current_bid.toLocaleString() : '0';
             const rent = (h.rent / 1000).toLocaleString();
             return `> 🏠 **${h.name}** (${h.town}) \n> 📏 ${h.size}sqm  ⏳ ${h.auction?.time_left} \n> 💰 Puja actual ${bid}gp \n`;
          });

          // Split into chunks to respect Embed description limit (4096)
          // We use 4000 to be safe
          const chunks: string[] = [];
          let currentChunk = '';

          for (const line of houseLines) {
            if (currentChunk.length + line.length + 2 > 4000) {
              chunks.push(currentChunk);
              currentChunk = `${line}\n`;
            } else {
              currentChunk += `${line}\n`;
            }
          }
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
          }

          // Send to all guilds tracking this world
          const interestedGuilds = configs.filter(c => c.tibiaWorld === world);
          
          for (const guild of interestedGuilds) {
            if (!guild.dailyChannelId) continue;
            try {
              const channel = await this.client.channels.fetch(guild.dailyChannelId) as TextChannel;
              if (channel) {
                for (let i = 0; i < chunks.length; i++) {
                   const embed = new EmbedBuilder()
                     .setColor(0x00AAFF)
                     .setDescription(chunks[i])
                     .setFooter({ text: `WarSnakes Bot • Page ${i + 1}/${chunks.length}` })
                     .setTimestamp();
                   
                   if (i === 0) {
                     embed.setTitle(`🏠 Casas en Subasta (${world})`);
                   } else {
                     embed.setTitle(`🏠 Casas en Subasta (${world}) - Continuación`);
                   }

                   await channel.send({ embeds: [embed] });
                }
              }
            } catch (err) {
              console.error(`[SchedulerService] Error enviando casas a guild ${guild.id}:`, err);
            }
          }
        }
      }

    } catch (error) {
      console.error('[SchedulerService] Error checking houses:', error);
    }
  }

  private async checkDailyStats() {
    try {
      console.log('[SchedulerService] Enviando estadísticas diarias...');
      
      const configs = await prisma.guildConfig.findMany({
        where: { dailyChannelId: { not: null } }
      });

      if (configs.length === 0) return;

      // Obtén los datos directamente desde DatabaseService
      const daysWithoutAccidents = await DatabaseService.getDaysWithoutAccidents();
      const lastAccident = await DatabaseService.getLastAccident();
      const lastAccidentReason = lastAccident ? lastAccident.detail : 'Ninguno registrado';

      const embed = new EmbedBuilder()
        .setTitle('📋 Notificación Diaria')
        .setColor('#00bfff')
        .addFields(
          { name: '✅ Días sin Accidentes', value: `**${daysWithoutAccidents}** días`, inline: false },
          { name: '💥 Último Accidente', value: lastAccidentReason, inline: false },
          { name: '👳 Rashid', value: StaticDataService.getRashidDay(), inline: false },
          { name: '⚔️ Drome', value: `${StaticDataService.getDromeTime()} restantes`, inline: false }
        )
        .setTimestamp();

      // Only add footer/image if we can get client user
      if (this.client.user) {
        embed.setImage(this.client.user.avatarURL() ?? '');
      }
      
      for (const config of configs) {
        if (!config.dailyChannelId) continue;
        try {
          const channel = await this.client.channels.fetch(config.dailyChannelId) as TextChannel;
          if (channel) {
            await channel.send({ embeds: [embed] });
          }
        } catch (err) {
          console.error(`[SchedulerService] Error enviando daily a guild ${config.id}:`, err);
        }
      }

    } catch (error) {
      console.error('[SchedulerService] Error checking daily stats:', error);
    }
  }

  private parseTimeLeft(timeLeft: string): number {
    // Expected formats: "2 hours", "1 day", "2 days", "30 minutes"
    // Returns total minutes for sorting
    if (!timeLeft) return 99999999;
    
    let minutes = 0;
    const parts = timeLeft.split(' ');
    if (parts.length < 2) return 99999999; // Unknown format

    const value = parseInt(parts[0]);
    const unit = parts[1].toLowerCase(); // hour, hours, day, days, minute, minutes

    if (unit.includes('minute')) {
        minutes = value;
    } else if (unit.includes('hour')) {
        minutes = value * 60;
    } else if (unit.includes('day')) {
        minutes = value * 24 * 60;
    }

    return minutes;
  }

  private async checkTrackedCharacters() {
    try {
      console.log('[SchedulerService] Revisando personajes rastreados...');
      const trackedChars = await prisma.trackedCharacter.findMany();
      if (trackedChars.length === 0) return;

      // Deduplicate names to avoid spamming API
      const uniqueNames = [...new Set(trackedChars.map(c => c.name))];

      for (const name of uniqueNames) {
         try {
           // REFACTORIZADO: Usamos el servicio en lugar de fetch directo
           const data = await TibiaDataService.getCharacter(name);

           if (!data || !data.character || !data.character.character) {
             console.log(`[SchedulerService] No se encontró data para ${name}`);
             continue;
           }

           const charData = data.character.character;
           const deaths = data.character.deaths || [];
           
           // Process all DB entries for this character name
           const entries = trackedChars.filter(c => c.name === name);

           for (const entry of entries) {
             const updates: any = {};
             let notificationType = '';
             let notificationDetails = '';
             let shouldNotify = false;
             // Actually, looking at fresh docs or experience: TibiaData v4 response for character:
             // { character: { name, ... last_login, ... } }
             // No "online" bool.
             // To check online, I'd need to cross reference with World Online list.
             // Doing that for every world is expensive.
             // I'll stick to Level and Death for now, and maybe "Last Login" update?
             // If "last_login" changes, they logged in.
             // Wait, `last_login` only updates on Logout? Or login? Usually on Logout.
             // So catching "Online" is hard with just this endpoint.
             // I'll skip "Online/Offline" notification for now unless I find a way, OR I just implement Level/Death as they are most important. 
             // I'll add a comment.
             // WAIT! I recall `getCharacter` sometimes returning it? No.
             // Let's stick to Level and Death.
             
             // 2. Check Level
             const currentLevel = charData.level;
             if (entry.lastLevel !== null) {
               if (currentLevel > entry.lastLevel) {
                 shouldNotify = true;
                 notificationType = 'Level Up';
                 notificationDetails = `🆙 ${entry.name} subió de nivel ${entry.lastLevel} a ${currentLevel}!`;
               } else if (currentLevel < entry.lastLevel) {
                 shouldNotify = true;
                 notificationType = 'Level Down';
                 notificationDetails = `🔻 ${entry.name} bajó de nivel ${entry.lastLevel} a ${currentLevel}.`;
               }
             }
             updates.lastLevel = currentLevel;

             // 3. Check Deaths
             if (deaths.length > 0) {
               const latestDeath = deaths[0]; // { time: "...", level: ..., reason: "..." }
               // Create a unique time string or ID
               const deathTime = latestDeath.time; 
               if (entry.lastDeath !== deathTime) {
                 // New death!
                 // Only notify if we had a previous record (to avoid notifying on first add)
                 if (entry.lastDeath) { 
                    shouldNotify = true;
                    notificationType = 'Nueva Muerte';
                    notificationDetails = `☠️ ${entry.name} murió a nivel ${latestDeath.level} por ${latestDeath.reason}.\n`;
                 }
                  // Automatically register accident if it's a friendly character (not enemy)
                  if (shouldNotify && notificationType === 'Nueva Muerte' && !entry.isEnemy) {
                    try {
                        await DatabaseService.createAccident(notificationDetails);
                        console.log(`[SchedulerService] Accidente registrado automáticamente para ${entry.name}`);
                    } catch (dbErr) {
                        console.error(`[SchedulerService] Error registrando accidente para ${entry.name}:`, dbErr);
                    }
                  }
                  updates.lastDeath = deathTime;
               }
             }

             // Save updates
             if (Object.keys(updates).length > 0) {
               await prisma.trackedCharacter.update({
                 where: { id: entry.id },
                 data: updates
               });
             }

             // Send Notification
             if (shouldNotify) {
                const guildConfig = await prisma.guildConfig.findUnique({ where: { id: entry.guildId } });
                if (guildConfig && guildConfig.trackerChannelId) {
                  const channel = await this.client.channels.fetch(guildConfig.trackerChannelId) as TextChannel;
                  if (channel) {
                    const embed = new EmbedBuilder()
                      .setTitle(`${entry.isEnemy ? 'Enemigo: ' : ''}${notificationType}`)
                      .setDescription(`**${notificationDetails}**`)
                      .setColor(entry.isEnemy ? 0xFF0000 : 0x00FF00) // Red for enemy, Green for friend
                      .setTimestamp();
                    
                    await channel.send({ embeds: [embed] });
                  }
                }
             }
           }

         } catch (err) {
           console.error(`[SchedulerService] Error updating character ${name}:`, err);
         }
      }
    } catch (error) {
      console.error('[SchedulerService] Error in checkTrackedCharacters:', error);
    }
  }


}

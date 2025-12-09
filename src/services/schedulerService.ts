import { BotClient } from '../structures/BotClient';
import { TextChannel, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();
import { StaticDataService } from './staticDataService';
import { DatabaseService } from './databaseService';

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

    console.log('[SchedulerService] Ejecutando chequeo inicial...');
    // this.checkNews();
    // this.checkDailyStats();
    // this.checkHouses();
  }

  private async checkNews() {
    try {
      console.log('[SchedulerService] Buscando nuevas noticias...');
      const response = await fetch('https://api.tibiadata.com/v4/news/latest');
      const data = await response.json() as any;
      
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
          const url = `https://api.tibiadata.com/v4/houses/${world}/${encodeURIComponent(town)}`;
          const response = await fetch(url);
          const data = await response.json() as any;

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
}

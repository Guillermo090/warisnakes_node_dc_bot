import { BotClient } from '../structures/BotClient';
import { PrismaClient } from '@prisma/client';
import { TextChannel, EmbedBuilder } from 'discord.js';
import { IHouseRepository } from '../interfaces/repositories';
import { HouseItem } from '../interfaces/models';

const prisma = new PrismaClient();

export class CheckHousesUseCase {
  constructor(private client: BotClient, private houseRepository: IHouseRepository) {}

  public async execute() {
    try {
      const configs = await prisma.guildConfig.findMany({
        where: { dailyChannelId: { not: null }, tibiaWorld: { not: null } }
      });

      if (configs.length === 0) return;

      const worlds = [...new Set(configs.map(c => c.tibiaWorld as string))];
      const towns = [
        "Ab'Dendriel", "Ankrahmun", "Carlin", "Darashia", "Edron", "Farmine", 
        "Gray Beach","Issavi", "Kazordoon", "Liberty Bay", "Port Hope", "Rathleton", 
        "Svargrond", "Thais", "Venore", "Yalahar"
      ];

      for (const world of worlds) {
        console.log(`[CheckHousesUseCase] Revisando casas para ${world}...`);
        let auctionEndingHouses: HouseItem[] = [];

        for (const town of towns) {
          const houseList = await this.houseRepository.getHouses(world, town);

          if (!houseList) continue;

          const houses: HouseItem[] = houseList.map((h: any) => ({
            ...h,
            town,
            status: h.auctioned ? 'auctioned' : h.rented ? 'rented' : 'available'
          }));

          for (const house of houses) {
            if (house.status === 'auctioned' && house.auction && house.auction.time_left) {
               const timeLeftMinutes = this.parseTimeLeft(house.auction.time_left);
               const threeDaysMinutes = 3 * 24 * 60;
               
               if (timeLeftMinutes <= threeDaysMinutes) {
                 auctionEndingHouses.push(house);
               }
            }
          }
        }

        if (auctionEndingHouses.length > 0) {
          this.notifyGuilds(world, auctionEndingHouses, configs);
        }
      }
    } catch (error) {
      console.error('[CheckHousesUseCase] Error:', error);
    }
  }

  private async notifyGuilds(world: string, houses: HouseItem[], allConfigs: any[]) {
      // Sort by time left
      houses.sort((a, b) => {
        const timeA = this.parseTimeLeft(a.auction?.time_left || '');
        const timeB = this.parseTimeLeft(b.auction?.time_left || '');
        return timeA - timeB;
      });

      const houseLines = houses.map(h => {
         const bid = h.auction?.current_bid ? h.auction.current_bid.toLocaleString() : '0';
         return `> 🏠 **${h.name}** (${h.town}) \n> 📏 ${h.size}sqm  ⏳ ${h.auction?.time_left} \n> 💰 Puja actual ${bid}gp \n`;
      });

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
      if (currentChunk.length > 0) chunks.push(currentChunk);

      const interestedGuilds = allConfigs.filter(c => c.tibiaWorld === world);
      
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
               
               embed.setTitle(i === 0 ? `🏠 Casas en Subasta (${world})` : `🏠 Casas en Subasta (${world}) - Continuación`);
               await channel.send({ embeds: [embed] });
            }
          }
        } catch (err) {
          console.error(`[CheckHousesUseCase] Error enviando a guild ${guild.id}:`, err);
        }
      }
  }

  private parseTimeLeft(timeLeft: string): number {
    if (!timeLeft) return 99999999;
    let minutes = 0;
    const parts = timeLeft.split(' ');
    if (parts.length < 2) return 99999999;

    const value = parseInt(parts[0]);
    const unit = parts[1].toLowerCase();

    if (unit.includes('minute')) minutes = value;
    else if (unit.includes('hour')) minutes = value * 60;
    else if (unit.includes('day')) minutes = value * 24 * 60;

    return minutes;
  }
}
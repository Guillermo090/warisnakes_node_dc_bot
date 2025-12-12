import { BotClient } from '../structures/BotClient';
import { PrismaClient } from '@prisma/client';
import { EmbedBuilder, TextChannel } from 'discord.js';
import { DatabaseService } from '../services/databaseService';
import { StaticDataService } from '../services/staticDataService';

const prisma = new PrismaClient();

export class CheckDailyStatsUseCase {
  constructor(private client: BotClient) {}

  public async execute() {
    try {
      console.log('[CheckDailyStatsUseCase] Enviando estadísticas diarias...');
      
      const configs = await prisma.guildConfig.findMany({
        where: { dailyChannelId: { not: null } }
      });

      if (configs.length === 0) return;

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
          console.error(`[CheckDailyStatsUseCase] Error enviando daily a guild ${config.id}:`, err);
        }
      }

    } catch (error) {
      console.error('[CheckDailyStatsUseCase] Error checking daily stats:', error);
    }
  }
}
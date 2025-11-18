import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { StaticDataService } from '../../services/staticDataService';
import { DatabaseService } from '../../services/databaseService';

interface DailyNotification {
  channelId: string;
  time: string; // HH:mm
  cronJob?: ScheduledTask;
}

const dailyNotifications: DailyNotification[] = [];

function timeToCron(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${minute} ${hour} * * *`;
}

export default class DailyCommand extends BaseCommand {
  constructor() {
    super({
      name: 'daily',
      description: 'Configura una notificación diaria en este canal a la hora indicada (solo administradores). Ejemplo: /daily 10:00',
      category: 'utility',
      aliases: ['/daily'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (!message.member?.permissions.has('Administrator')) {
      await message.reply('Solo los administradores pueden usar este comando.');
      return;
    }

    const timeArg = args[0];
    if (!timeArg || !/^\d{1,2}:\d{2}$/.test(timeArg)) {
      await message.reply('Debes especificar la hora en formato HH:mm. Ejemplo: /daily 10:00');
      return;
    }

    const exists = dailyNotifications.find(
      n => n.channelId === message.channel.id && n.time === timeArg
    );
    if (exists) {
      await message.reply('Ya existe una notificación diaria configurada para este canal y hora.');
      return;
    }

    const cronTime = timeToCron(timeArg);
    const job = cron.schedule(cronTime, async () => {
      const channel = await client.channels.fetch(message.channel.id);
      
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
        .setImage(client.user?.avatarURL() ?? '')
        .setTimestamp();
      
      // @ts-ignore
      await channel.send({ embeds: [embed] });
    });

    dailyNotifications.push({
      channelId: message.channel.id,
      time: timeArg,
      cronJob: job,
    });

    await message.reply(`Notificación diaria configurada para las ${timeArg} en este canal.`);
  }
}
import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { ScrapingService } from '../../services/scrapingService'; // 1. Importa el servicio
import { StaticDataService } from '../../services/staticDataService';

interface DailyNotification {
  channelId: string;
  time: string; // HH:mm
  cronJob?: ScheduledTask;
}

const dailyNotifications: DailyNotification[] = [];

function timeToCron(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  // Formato: 'minuto hora * * *'
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
    // Solo administradores
    if (!message.member?.permissions.has('Administrator')) {
      await message.reply('Solo los administradores pueden usar este comando.');
      return;
    }

    const timeArg = args[0];
    if (!timeArg || !/^\d{1,2}:\d{2}$/.test(timeArg)) {
      await message.reply('Debes especificar la hora en formato HH:mm. Ejemplo: /daily 10:00');
      return;
    }

    // Verifica si ya existe una notificación para este canal y hora
    const exists = dailyNotifications.find(
      n => n.channelId === message.channel.id && n.time === timeArg
    );
    if (exists) {
      await message.reply('Ya existe una notificación diaria configurada para este canal y hora.');
      return;
    }

    // Crea el cron job
    const cronTime = timeToCron(timeArg);
    const job = cron.schedule(cronTime, async () => {
      const channel = await client.channels.fetch(message.channel.id);
      const embed = new EmbedBuilder()
        .setTitle('Notificación Diaria')
        .setColor('#00bfff')
        .addFields(
          { name: 'Rashid', value: StaticDataService.getRashidDay(), inline: false },
          { name: 'Drome', value: `${await ScrapingService.getDaysForDrome()} días restantes`, inline: false }
        )
        .setImage(client.user?.avatarURL() ?? '')
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
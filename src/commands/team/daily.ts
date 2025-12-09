import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class DailyCommand extends BaseCommand {
  constructor() {
    super({
      name: 'daily',
      description: 'Configura las notificaciones diarias en este canal (se envían todos los días a las 08:00 AM). Solo administradores.',
      category: 'utility',
      aliases: ['/daily'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (!message.member?.permissions.has('Administrator')) {
      await message.reply('Solo los administradores pueden usar este comando.');
      return;
    }

    if (!message.guild) return;

    try {
      // Upsert guild config
      await prisma.guildConfig.upsert({
        where: { id: message.guild.id },
        update: { 
          dailyChannelId: message.channel.id 
        },
        create: {
          id: message.guild.id,
          dailyChannelId: message.channel.id,
          tibiaWorld: 'Antica' // Default world if creating for first time
        }
      });

      await message.reply('✅ Notificaciones diarias configuradas para este canal.\nSe enviarán automáticamente todos los días a las **08:00 AM** (Server Save).');
      
    } catch (error) {
      console.error('Error configuring daily channel:', error);
      await message.reply('Hubo un error al guardar la configuración.');
    }
  }
}

import { BaseCommand } from '../../structures/BaseCommand';
import { BotClient } from '../../structures/BotClient';
import { Message, PermissionsBitField } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SetCharsDataCommand extends BaseCommand {
  constructor() {
    super({
      name: 'set_chars_data',
      description: 'Establece el canal para notificaciones de rastreo de personajes (niveles, muertes, conexión).',
      category: 'Config',
      aliases: ['scd']
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      message.reply('Necesitas permisos de Administrador para usar este comando.');
      return;
    }

    try {
      await prisma.guildConfig.upsert({
        where: { id: message.guild.id },
        update: { trackerChannelId: message.channel.id },
        create: { id: message.guild.id, trackerChannelId: message.channel.id }
      });

      message.reply(`✅ Canal de rastreo de personajes establecido en: ${message.channel}`);
    } catch (error) {
      console.error(error);
      message.reply('Hubo un error al guardar la configuración.');
    }
  }
}

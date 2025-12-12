import { BaseCommand } from '../../structures/BaseCommand';
import { BotClient } from '../../structures/BotClient';
import { Message, PermissionsBitField } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SetNewsChannelCommand extends BaseCommand {
  constructor() {
    super({
      name: 'set_news_channel',
      description: 'Establece el canal actual para recibir noticias de Tibia.',
      category: 'Config',
      aliases: ['snc']
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
        update: { newsChannelId: message.channel.id },
        create: { id: message.guild.id, newsChannelId: message.channel.id }
      });

      message.reply(`✅ Canal de noticias establecido en: ${message.channel}`);
    } catch (error) {
      console.error(error);
      message.reply('Hubo un error al guardar la configuración.');
    }
  }
}

export class SetDailyChannelCommand extends BaseCommand {
  constructor() {
    super({
      name: 'set_daily_channel',
      description: 'Establece el canal actual para recibir el resumen diario de casas.',
      category: 'Config',
      aliases: ['sdc']
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
        update: { dailyChannelId: message.channel.id },
        create: { id: message.guild.id, dailyChannelId: message.channel.id }
      });

      message.reply(`✅ Canal diario establecido en: ${message.channel}`);
    } catch (error) {
      console.error(error);
      message.reply('Hubo un error al guardar la configuración.');
    }
  }
}

export class SetTibiaWorldCommand extends BaseCommand {
  constructor() {
    super({
      name: 'set_tibia_world',
      description: 'Establece el mundo de Tibia para este servidor.',
      category: 'Config',
      aliases: ['stw']
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      message.reply('Necesitas permisos de Administrador para usar este comando.');
      return;
    }

    if (args.length === 0) {
      message.reply('Por favor especifica el nombre del mundo. Ejemplo: `!set_tibia_world Antica`');
      return;
    }

    const world = args[0];
    // Capitalize first letter
    const formattedWorld = world.charAt(0).toUpperCase() + world.slice(1).toLowerCase();

    try {
      await prisma.guildConfig.upsert({
        where: { id: message.guild.id },
        update: { tibiaWorld: formattedWorld },
        create: { id: message.guild.id, tibiaWorld: formattedWorld }
      });

      message.reply(`✅ Mundo de Tibia establecido en: **${formattedWorld}**`);
    } catch (error) {
      console.error(error);
      message.reply('Hubo un error al guardar la configuración.');
    }
  }
}

export class SetOnlineListChannelCommand extends BaseCommand {
  constructor() {
    super({
      name: 'set_online_list_channel',
      description: 'Establece el canal actual para mostrar la lista de personajes online.',
      category: 'Config',
      aliases: ['solc', 'set_online_list']
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
        update: { onlineListChannelId: message.channel.id },
        create: { id: message.guild.id, onlineListChannelId: message.channel.id }
      });

      message.reply(`✅ Canal para lista de conectados establecido en: ${message.channel}`);
    } catch (error) {
      console.error(error);
      message.reply('Hubo un error al guardar la configuración.');
    }
  }
}

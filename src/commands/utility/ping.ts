import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';

export default class PingCommand extends BaseCommand {
  constructor() {
    super({
      name: 'ping',
      description: 'Muestra la latencia del bot y la API.',
      category: 'utility',
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const msg = await message.reply('Calculando ping...');
    const latency = msg.createdTimestamp - message.createdTimestamp;
    msg.edit(`¡Pong! 🏓\nLatencia del Bot: \`${latency}ms\`\nLatencia de la API: \`${Math.round(client.ws.ping)}ms\``);
  }
}
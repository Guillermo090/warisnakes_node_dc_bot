import { BaseEvent } from '../../structures/BaseEvent';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';

export default class MessageCreateEvent extends BaseEvent {
  constructor() {
    super({ name: 'messageCreate' });
  }

  public execute(client: BotClient, message: Message): void {
    if (message.author.bot || !message.content.startsWith(client.config.prefix)) {
      return;
    }

    const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
    const commandName = args.shift()!.toLowerCase(); // El '!' asegura a TS que shift() no será undefined aquí

    const command = client.commands.get(commandName) ||
                    client.commands.find(cmd => !!cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    try {
      command.execute(client, message, args);
    } catch (error) {
      console.error(`Error al ejecutar el comando ${command.name}:`, error);
      message.reply('Hubo un error al intentar ejecutar ese comando.');
    }
  }
}
import type { Message } from 'discord.js';
import type { BotClient } from './BotClient';

interface CommandOptions {
  name: string;
  description: string;
  category: string;
  aliases?: string[];
}

export abstract class BaseCommand {
  public name: string;
  public description: string;
  public category: string;
  public aliases: string[];

  constructor(options: CommandOptions) {
    this.name = options.name;
    this.description = options.description;
    this.category = options.category;
    this.aliases = options.aliases || [];
  }

  // El método abstracto debe ser implementado por cada clase de comando que herede de esta.
  public abstract execute(client: BotClient, message: Message, args: string[]): Promise<void> | void;
}
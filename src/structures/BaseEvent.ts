import type { ClientEvents } from 'discord.js';
import type { BotClient } from './BotClient';

interface EventOptions {
  name: keyof ClientEvents; // ¡Esto asegura que solo usemos nombres de eventos válidos!
  once?: boolean;
}

export abstract class BaseEvent {
  public name: keyof ClientEvents;
  public once: boolean;

  constructor(options: EventOptions) {
    this.name = options.name;
    this.once = options.once || false;
  }

  // Usamos 'any' para los argumentos porque varían para cada evento.
  // La implementación concreta del evento usará los tipos correctos.
  public abstract execute(client: BotClient, ...args: any[]): Promise<void> | void;
}
import { BaseEvent } from '../../structures/BaseEvent';
import type { BotClient } from '../../structures/BotClient';
import { ActivityType } from 'discord.js';
import { config } from '../../config'; // ajusta según tu ruta real

export default class ReadyEvent extends BaseEvent {
  constructor() {
    super({ name: 'ready', once: true });
  }

  public execute(client: BotClient): void {
    if (!client.user) {
      return;
    }
    console.log(`Bot conectado como ${client.user.tag}`);
    // Usamos el enum 'ActivityType' en lugar de un string mágico
    client.user.setActivity(`${config.prefix}ping`, { type: ActivityType.Listening });
  }
}
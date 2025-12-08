import { BaseEvent } from '../../structures/BaseEvent';
import type { BotClient } from '../../structures/BotClient';
import { ActivityType } from 'discord.js';
import { config } from '../../config';

export default class ReadyEvent extends BaseEvent {
  constructor() {
    super({ name: 'ready', once: true });
  }

  public execute(client: BotClient): void {
    if (!client.user) {
      return;
    }
    console.log(`Bot conectado como ${client.user.tag}`);
    
    client.user.setActivity(`${config.prefix}ping`, { type: ActivityType.Listening });

    // Iniciar servicios programados
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SchedulerService } = require('../../services/schedulerService');
      const scheduler = new SchedulerService(client);
      scheduler.init();
    } catch (error) {
      console.error('Error al iniciar SchedulerService:', error);
    }
  }
}

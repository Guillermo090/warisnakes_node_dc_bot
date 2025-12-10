import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';

export default class GGCommand extends BaseCommand {
  constructor() {
    super({
      name: 'gg',
      description: 'Registra un "accidente" y reinicia el contador de días sin incidentes. Uso: !gg [detalle del accidente]',
      category: 'teamCommands',
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    // Command disabled as per request (automated in SchedulerService)
    const embed = new EmbedBuilder()
      .setColor('#FFAA00')
      .setTitle('⚠️ Comando Desactivado')
      .setDescription('El registro de muertes ahora es automático cuando el sistema detecta una muerte en un personaje rastreado.')
      .setTimestamp();

    if (message.channel && 'send' in message.channel) {
        // @ts-ignore - We know it has send because of the check
        await message.channel.send({ embeds: [embed] });
    }
  }
}
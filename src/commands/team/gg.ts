import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { StaticDataService } from '../../services/staticDataService';

export default class GGCommand extends BaseCommand {
  constructor() {
    super({
      name: 'gg',
      description: 'Registra un "accidente" y reinicia el contador de días sin incidentes. Uso: !gg [detalle del accidente]',
      category: 'teamCommands',
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const accidentDetail = args.join(' ') || 'No especificado';
    const daysSinceLastAccident = StaticDataService.getDaysWithoutAccidents();

    // Reinicia el contador con el motivo
    StaticDataService.resetAccidentCounter(accidentDetail);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('☠️ ¡Contador de días reiniciado! ☠️')
      .setDescription(`**Récord anterior:** ${daysSinceLastAccident} días sin accidentes.`)
      .addFields({ name: '🔥 Causa', value: accidentDetail })
      .setFooter({ text: '¡Mejor suerte la próxima vez!' })
      .setTimestamp();

    if('send' in message.channel){
        await message.channel.send({ embeds: [embed] });
    }

  }
}
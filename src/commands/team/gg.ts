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
    const accidentDetail = args.join(' ') || 'No especificado';
    
    // Obtiene los días antes de registrar el nuevo accidente
    const daysSinceLastAccident = await DatabaseService.getDaysWithoutAccidents();

    // Registra el nuevo accidente en la base de datos
    await DatabaseService.createAccident(accidentDetail);

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
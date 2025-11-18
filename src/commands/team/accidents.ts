import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';
import type { Accident } from '@prisma/client';

export default class AccidentsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'accidents',
      description: 'Lista todos los accidentes registrados.',
      category: 'teamCommands',
      aliases: ['accidentes', 'historial'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const accidents = await DatabaseService.getAllAccidents();

    if (accidents.length === 0) {
      await message.reply('¡No hay accidentes registrados! 🎉');
      return;
    }

    // Limita a los últimos 10 accidentes para no saturar el mensaje
    const limit = 10;
    const recentAccidents = accidents.slice(0, limit);

    const embed = new EmbedBuilder()
      .setTitle('📋 Historial de Accidentes')
      .setColor('#FFA500')
      .setDescription(`Mostrando los últimos ${recentAccidents.length} de ${accidents.length} accidentes registrados.`)
      .setTimestamp();

    recentAccidents.forEach((accident: Accident, index: number) => {
      const date = new Date(accident.date);
      const formattedDate = date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      embed.addFields({
        name: `${index + 1}. ${formattedDate}`,
        value: accident.detail || 'Sin detalles',
        inline: false,
      });
    });

    if (accidents.length > limit) {
      embed.setFooter({ text: `Hay ${accidents.length - limit} accidentes más en la base de datos.` });
    }

    await message.reply({ embeds: [embed] });
  }
}
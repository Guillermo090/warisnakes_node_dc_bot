import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { ScrapingService } from '../../services/scrapingService';

export default class DromeCommand extends BaseCommand {
  constructor() {
    super({
      name: 'drome',
      description: 'Muestra el estado actual del Drome según la web scrapeada.',
      category: 'teamCommands',
      aliases: ['!drome'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    // Obtiene el dato usando el servicio de scraping
    const dromeText = await ScrapingService.getDromeTime();

    const embed = new EmbedBuilder()
      .setTitle('Tiempo para el siguiente Drome')
      .setDescription(dromeText)
      .setImage(client.user?.avatarURL() ?? '')
      .setColor('#00bfff')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}
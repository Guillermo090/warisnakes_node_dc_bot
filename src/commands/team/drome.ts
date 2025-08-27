import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { StaticDataService } from '../../services/staticDataService';

export default class DromeCommand extends BaseCommand {
  constructor() {
    super({
      name: 'drome',
      description: 'Muestra el tiempo restante para el siguiente Drome.',
      category: 'teamCommands',
      aliases: ['!drome'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const dromeText = StaticDataService.getDromeTime();

    const embed = new EmbedBuilder()
      .setTitle('Tiempo para el siguiente Drome')
      .setDescription(dromeText)
      .setImage(client.user?.avatarURL() ?? '')
      .setColor('#00bfff')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}
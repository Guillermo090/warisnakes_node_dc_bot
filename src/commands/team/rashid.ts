import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { StaticDataService } from '../../services/staticDataService';

export default class RashidCommand extends BaseCommand {
  constructor() {
    super({
      name: 'rashid',
      description: 'Indica en qué ciudad está Rashid hoy.',
      category: 'teamCommands',
      aliases: ['!rashid'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const city = StaticDataService.getRashidDay();

    const embed = new EmbedBuilder()
      .setTitle('Rashid')
      .setDescription(`Rashid está en **${city}** hoy.`)
      .setColor('#00bfff')
      .setImage(client.user?.avatarURL() ?? '')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}
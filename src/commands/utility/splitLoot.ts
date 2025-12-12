
import { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { BaseCommand } from '../../structures/BaseCommand';
import { BotClient } from '../../structures/BotClient';

export class SplitLootCommand extends BaseCommand {
  constructor() {
    super({
      name: 'loot',
      description: 'Abre el asistente para repartir el loot de una party.',
      category: 'Utility',
      aliases: ['split', 'splitloot']
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const button = new ButtonBuilder()
      .setCustomId('open_split_loot_modal')
      .setLabel('⚔️ Split Loot')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(button);

    await message.reply({
      content: 'Pulsa el botón para introducir los datos de la sesión de Tibia:',
      components: [row]
    });
  }
}

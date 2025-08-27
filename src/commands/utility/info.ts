import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';

export default class HelpCommand extends BaseCommand {
  constructor() {
    super({
      name: 'info',
      description: 'Muestra la lista de comandos disponibles.',
      category: 'utility',
      aliases: ['ayuda'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const { EmbedBuilder } = await import('discord.js');
    const prefix = client.config.prefix;

    const commandsByCategory = client.commands.reduce((acc, command) => {
      const category = command.category || 'Sin categoría';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(`\`${prefix}${command.name}\`: ${command.description}`);
      return acc;
    }, {} as Record<string, string[]>);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Lista de Comandos')
      .setDescription(`Aquí tienes todos los comandos disponibles.  Mi prefijo es \`${prefix}\`.`)
      .setTimestamp();

    for (const category in commandsByCategory) {
      embed.addFields({
        name: `**${category.charAt(0).toUpperCase() + category.slice(1)}**`,
        value: commandsByCategory[category].join('\n'),
      });
    }

    await message.reply({ embeds: [embed] });
  }
}
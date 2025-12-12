
import { BaseCommand } from '../../structures/BaseCommand';
import { BotClient } from '../../structures/BotClient';
import { Message } from 'discord.js';

export class ShareCommand extends BaseCommand {
  constructor() {
    super({
      name: 'share',
      description: 'Muestra el rango de niveles con los que puedes compartir experiencia.',
      category: 'Utility',
      aliases: ['shared', 'party']
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      message.reply('Por favor especifica un nivel. Ejemplo: `!share 100`');
      return;
    }

    const level = parseInt(args[0], 10);

    if (isNaN(level) || level <= 0) {
      message.reply('Por favor ingresa un nivel válido (número mayor a 0).');
      return;
    }

    const minLevel = Math.floor((level * 2) / 3);
    const maxLevel = Math.floor((level * 3) / 2);

    message.reply(
      `Un personaje de nivel **${level}** puede compartir experiencia con:\n` +
      `🔽 Mínimo: **${minLevel}**\n` +
      `🔼 Máximo: **${maxLevel}**`
    );
  }
}

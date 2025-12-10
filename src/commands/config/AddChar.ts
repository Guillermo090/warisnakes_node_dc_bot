import { BaseCommand } from '../../structures/BaseCommand';
import { BotClient } from '../../structures/BotClient';
import { Message, PermissionsBitField } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AddCharCommand extends BaseCommand {
  constructor() {
    super({
      name: 'add_char',
      description: 'Añade un personaje para rastrear. Usa -Nombre para marcarlo como enemigo.',
      category: 'Config',
      aliases: ['ac']
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (!message.guild) return;
    // Allow users with ManageGuild or similar perms, strictly speaking usually config is admin only 
    // but maybe adding chars could be more open? sticking to Admin for config commands usually.
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      message.reply('Necesitas permisos de Administrador para usar este comando.');
      return;
    }

    if (args.length === 0) {
      message.reply('Por favor especifica el nombre del personaje. Ejemplo: `!add_char TestChar` o `!add_char -EnemyChar`');
      return;
    }

    let charName = args.join(' '); // Allow names with spaces? Tibia names can have spaces.
    let isEnemy = false;

    if (charName.startsWith('-')) {
      isEnemy = true;
      charName = charName.substring(1).trim();
    }

    // Capitalize properly if needed, but Tibia is case insensitive often, better to store as typed?
    // Tibia API usually handles it, but let's try to keep it clean.
    // For now, store as provided but trimmed.

    try {
      // Check if already exists for this guild
      const existing = await prisma.trackedCharacter.findFirst({
        where: {
            name: charName,
            guildId: message.guild.id
        }
      });

      if (existing) {
        // Update enemy status?
        await prisma.trackedCharacter.update({
            where: { id: existing.id },
            data: { isEnemy }
        });
        message.reply(`✅ Personaje **${charName}** actualizado. Enemigo: ${isEnemy ? 'Sí' : 'No'}.`);
      } else {
        await prisma.trackedCharacter.create({
            data: {
                name: charName,
                guildId: message.guild.id,
                isEnemy
            }
        });
        message.reply(`✅ Personaje **${charName}** añadido a la lista de rastreo. Enemigo: ${isEnemy ? 'Sí' : 'No'}.`);
      }

    } catch (error) {
      console.error(error);
      message.reply('Hubo un error al guardar el personaje.');
    }
  }
}

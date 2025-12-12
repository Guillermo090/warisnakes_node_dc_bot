import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';
import type { TrackedCharacter } from '@prisma/client';

export default class AllCharsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'all_chars',
      description: 'Lista todos los personajes rastreados con su información básica.',
      category: 'teamCommands',
      aliases: ['chars', 'personajes', 'allchars'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.reply('❌ No tienes permisos para usar este comando.');
      return;
    }
    const chars = await DatabaseService.getAllTrackedCharacters();

    if (chars.length === 0) {
      await message.reply('¡No hay personajes rastreados actualmente! 🕵️‍♂️');
      return;
    }

    const charLines = chars.map((char: TrackedCharacter) => {
      // Formateo de fecha de muerte
      let lastDeathText = 'Sin registro';
      if (char.lastDeath) {
        // Intentar parsear como fecha si es un string de fecha estándar
        const date = new Date(char.lastDeath);
        // Validamos si es una fecha válida
        if (!isNaN(date.getTime())) {
          lastDeathText = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } else {
            // Si no es fecha válida, mostramos el texto tal cual (por si es texto libre)
            lastDeathText = char.lastDeath;
        }
      }

      // Iconos y texto para estado online
      // Nota: El usuario indicó que pronto llenarán este registro
      const isOnline = char.isOnline ?? false;
      const statusIcon = isOnline ? '🟢' : '🔴';
      
      // Formato solicitado: Nombre, Nivel, Online, Fecha última muerte
      // Estilo basado en casas: citas (>) y negritas
    //   return `> ${statusIcon} **${char.name}** *  Nivel: ${char.lastLevel ?? 'N/A'}\n> Última Muerte: ${lastDeathText}\n`;
        return `> ${statusIcon} **${char.name}** *  Nivel: ${char.lastLevel ?? 'N/A'}\n> 💀 Última Muerte: ${lastDeathText}\n`;
    });

    // Paginación por chunks para evitar límites de Discord (4096 caracteres por descripción)
    // Usamos 4000 para margén de seguridad
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of charLines) {
      if (currentChunk.length + line.length + 2 > 4000) {
        chunks.push(currentChunk);
        currentChunk = `${line}\n`;
      } else {
        currentChunk += `${line}\n`;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    // Enviar mensajes (paginados si es necesario)
    for (let i = 0; i < chunks.length; i++) {
       const embed = new EmbedBuilder()
         .setColor('#00AAFF') // Color azul claro similar a listings
         .setDescription(chunks[i])
         .setFooter({ text: `WarSnakes Bot • Página ${i + 1}/${chunks.length} • Total: ${chars.length} personajes` })
         .setTimestamp();
       
       if (i === 0) {
         embed.setTitle('📋 Lista de Personajes Rastreados');
         // El primer mensaje como respuesta
         await message.reply({ embeds: [embed] });
       } else {
         embed.setTitle('📋 Personajes Rastreados - Continuación');
         // Los siguientes en el canal
          if (message.channel.isSendable()) {
            await message.channel.send({ embeds: [embed] });
          }
       }
    }
  }
}

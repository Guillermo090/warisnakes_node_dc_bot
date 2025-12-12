import { BotClient } from '../structures/BotClient';
import { PrismaClient } from '@prisma/client';
import { EmbedBuilder, TextChannel, Message } from 'discord.js';
import { DatabaseService } from '../services/databaseService';
import { ICharacterRepository } from '../interfaces/repositories';

const prisma = new PrismaClient();

export class CheckTrackedCharactersUseCase {
  constructor(private client: BotClient, private characterRepository: ICharacterRepository) {}

  public async execute() {
    try {
      console.log('[CheckTrackedCharactersUseCase] Revisando personajes rastreados...');
      const trackedChars = await prisma.trackedCharacter.findMany();
      if (trackedChars.length === 0) return;

      const uniqueNames = [...new Set(trackedChars.map(c => c.name))];
      const involvedGuilds = new Set<string>();

      for (const name of uniqueNames) {
         try {
           const data = await this.characterRepository.getCharacter(name);

           if (!data || !data.character) {
             console.log(`[CheckTrackedCharactersUseCase] No se encontró data para ${name}`);
             continue;
           }

           const charData = data.character;
           const deaths = data.deaths || [];
           
           const entries = trackedChars.filter(c => c.name === name);

           for (const entry of entries) {
             involvedGuilds.add(entry.guildId);
             const updates: any = {};
             let notificationType = '';
             let notificationDetails = '';
             let shouldNotify = false;
             
             // 1. Check Level
             const currentLevel = charData.level;
             if (entry.lastLevel !== null) {
               if (currentLevel > entry.lastLevel) {
                 shouldNotify = true;
                 notificationType = 'Level Up';
                 notificationDetails = `🆙 ${entry.name} subió de nivel ${entry.lastLevel} a ${currentLevel}!`;
               } else if (currentLevel < entry.lastLevel) {
                 shouldNotify = true;
                 notificationType = 'Level Down';
                 notificationDetails = `🔻 ${entry.name} bajó de nivel ${entry.lastLevel} a ${currentLevel}.`;
               }
             }
             updates.lastLevel = currentLevel;

             // 2. Check Deaths
             if (deaths.length > 0) {
               const latestDeath = deaths[0]; 
               const deathTime = latestDeath.time; 
               
               if (entry.lastDeath !== deathTime) {
                 if (entry.lastDeath) { 
                    shouldNotify = true;
                    notificationType = 'Nueva Muerte';
                    notificationDetails = `☠️ ${entry.name} murió a nivel ${latestDeath.level} por ${latestDeath.reason}.\n`;
                 }
                  
                  // Registrar accidente automáticamente si es amigo
                  if (shouldNotify && notificationType === 'Nueva Muerte' && !entry.isEnemy) {
                    try {
                        await DatabaseService.createAccident(notificationDetails);
                        console.log(`[CheckTrackedCharactersUseCase] Accidente registrado automáticamente para ${entry.name}`);
                    } catch (dbErr) {
                        console.error(`[CheckTrackedCharactersUseCase] Error registrando accidente para ${entry.name}:`, dbErr);
                    }
                  }
                  updates.lastDeath = deathTime;
               }
             }

             // 3. Update Online Status (Silently)
             const isOnline = charData.status?.toLowerCase() === 'online';
             if (isOnline !== (entry.isOnline ?? false)) {
                 updates.isOnline = isOnline;
                 // NO notification for online/offline anymore
             }

             // Save updates
             if (Object.keys(updates).length > 0) {
               await prisma.trackedCharacter.update({
                 where: { id: entry.id },
                 data: updates
               });
             }

             // Send Notification (Only for Level/Death)
             if (shouldNotify) {
                const guildConfig = await prisma.guildConfig.findUnique({ where: { id: entry.guildId } });
                if (guildConfig && guildConfig.trackerChannelId) {
                  const channel = await this.client.channels.fetch(guildConfig.trackerChannelId) as TextChannel;
                  if (channel) {
                    const embed = new EmbedBuilder()
                      .setTitle(`${entry.isEnemy ? 'Enemigo: ' : ''}${notificationType}`)
                      .setDescription(`**${notificationDetails}**`)
                      .setColor(entry.isEnemy ? 0xFF0000 : 0x00FF00)
                      .setTimestamp();
                    
                    await channel.send({ embeds: [embed] });
                  }
                }
             }
           }

         } catch (err) {
           console.error(`[CheckTrackedCharactersUseCase] Error updating character ${name}:`, err);
         }
      }

      // Update Online Lists per Guild
      for (const guildId of involvedGuilds) {
        await this.updateGuildOnlineList(guildId);
      }

    } catch (error) {
      console.error('[CheckTrackedCharactersUseCase] Error in execute:', error);
    }
  }

  private async updateGuildOnlineList(guildId: string) {
    try {
      const guildConfig = await prisma.guildConfig.findUnique({ where: { id: guildId } });
      if (!guildConfig || !guildConfig.onlineListChannelId) return;

      const onlineChars = await prisma.trackedCharacter.findMany({
        where: {
          guildId: guildId,
          isOnline: true
        }
      });

      const enemies = onlineChars.filter(c => c.isEnemy);
      const friends = onlineChars.filter(c => !c.isEnemy);

      const embed = new EmbedBuilder()
        .setTitle('📋 Personajes Online ')
        .setColor(0x0099FF)
        .setTimestamp()
        .setFooter({ text: 'Actualizado' });

      let enemiesText = enemies.length > 0 ? enemies.map(c => `${c.name} (Lv. ${c.lastLevel})`).join('\n') : 'Ninguno';
      let friendsText = friends.length > 0 ? friends.map(c => `${c.name} (Lv. ${c.lastLevel})`).join('\n') : 'Ninguno';

      // Truncate if too long (Discord limit 1024 chars per field)
      if (enemiesText.length > 1024) enemiesText = enemiesText.substring(0, 1021) + '...';
      if (friendsText.length > 1024) friendsText = friendsText.substring(0, 1021) + '...';

      embed.addFields(
        { name: `Amigos Online (${friends.length})`, value: friendsText, inline: true },
        { name: `Enemigos Online (${enemies.length})`, value: enemiesText, inline: true }
      );

      const channel = await this.client.channels.fetch(guildConfig.onlineListChannelId) as TextChannel;
      if (!channel) return;

      let message: Message | null = null;

      if (guildConfig.onlineListMessageId) {
        try {
          message = await channel.messages.fetch(guildConfig.onlineListMessageId);
        } catch (e) {
          // Message not found (deleted?)
          message = null;
        }
      }

      if (message) {
        await message.edit({ embeds: [embed] });
      } else {
        const sentMessage = await channel.send({ embeds: [embed] });
        await prisma.guildConfig.update({
          where: { id: guildId },
          data: { onlineListMessageId: sentMessage.id }
        });
      }

    } catch (error) {
      console.error(`[CheckTrackedCharactersUseCase] Error updating online list for guild ${guildId}:`, error);
    }
  }
}
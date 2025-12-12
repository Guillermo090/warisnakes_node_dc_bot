import { BotClient } from '../structures/BotClient';
import { PrismaClient } from '@prisma/client';
import { EmbedBuilder, TextChannel } from 'discord.js';
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

             // Save updates
             if (Object.keys(updates).length > 0) {
               await prisma.trackedCharacter.update({
                 where: { id: entry.id },
                 data: updates
               });
             }

             // Send Notification
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
    } catch (error) {
      console.error('[CheckTrackedCharactersUseCase] Error in execute:', error);
    }
  }
}
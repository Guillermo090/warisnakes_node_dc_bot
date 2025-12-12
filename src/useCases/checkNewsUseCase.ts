import { BotClient } from '../structures/BotClient';
import { PrismaClient } from '@prisma/client';
import { TextChannel } from 'discord.js';
import { INewsRepository } from '../interfaces/repositories';
import { NewsItem } from '../interfaces/models';

const prisma = new PrismaClient();

export class CheckNewsUseCase {
  constructor(private client: BotClient, private newsRepository: INewsRepository) {}

  public async execute() {
    try {
      console.log('[CheckNewsUseCase] Buscando nuevas noticias...');
      const newsList = await this.newsRepository.getLatestNews();
      
      if (!newsList) return;

      const reversedNews = [...newsList].reverse();

      for (const item of reversedNews) {
        const exists = await prisma.news.findUnique({
            where: { tibiaId: item.id }
        });

        if (!exists) {
            const guilds = await prisma.guildConfig.findMany({
              where: { newsChannelId: { not: null } }
            });

            for (const guild of guilds) {
              if (!guild.newsChannelId) continue;
              try {
                  const channel = await this.client.channels.fetch(guild.newsChannelId) as TextChannel;
                  if (channel) {
                    await channel.send({
                        content: `📢 **Nueva Noticia de Tibia**\n\n**${item.news}**\n${item.category} - ${item.date}\n${item.url}`
                    });
                  }
              } catch (err) {
                  console.error(`[CheckNewsUseCase] Error enviando noticia a guild ${guild.id}:`, err);
              }
            }

            await prisma.news.create({
              data: {
                  tibiaId: item.id,
                  title: item.news,
                  date: new Date(item.date)
              }
            });
            console.log(`[CheckNewsUseCase] Noticia guardada: ${item.id}`);
        }
      }

    } catch (error) {
        console.error('[CheckNewsUseCase] Error checking news:', error);
    }
  }
}
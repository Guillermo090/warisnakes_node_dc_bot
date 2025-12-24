import { BotClient } from '../structures/BotClient';
import { PrismaClient } from '@prisma/client';
import { TextChannel } from 'discord.js';
import { INewsRepository } from '../interfaces/repositories';
import { translate } from 'google-translate-api-x';

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

            let content = `📢 **Nueva Noticia de Tibia**\n\n**${item.news}**\n${item.category} - ${item.date}\n${item.url}`;
            
            try {
              const detailedNews = await this.newsRepository.getNews(item.id);
              if (detailedNews && detailedNews.content) {
                 let cleanContent = detailedNews.content.replace(/<[^>]*>?/gm, ''); // Remove HTML tags
                 let title = detailedNews.title || item.news;

                 // --- TRADUCCIÓN ---
                 try {
                    const resTitle = await translate(title, { to: 'es' });
                    const resContent = await translate(cleanContent, { to: 'es' });
                    
                    if (resTitle?.text) title = resTitle.text;
                    if (resContent?.text) cleanContent = resContent.text;
                 } catch (transErr) {
                    console.error('[CheckNewsUseCase] Error traduciendo noticia:', transErr);
                    // Continuamos con el texto original si falla
                 }
                 // ------------------

                 if (cleanContent.length > 1500) {
                    cleanContent = cleanContent.substring(0, 1500) + '...';
                 }

                 content = `📢 **Nueva Noticia de Tibia**\n\n**${title}**\n*${detailedNews.category} - ${detailedNews.date}*\n\n${cleanContent}\n\n🔗 ${detailedNews.url || item.url}`;
              }
            } catch (err) {
              console.error(`[CheckNewsUseCase] Error obteniendo detalle de noticia ${item.id}, usando basica.`, err);
            }

            const guilds = await prisma.guildConfig.findMany({
              where: { newsChannelId: { not: null } }
            });

            for (const guild of guilds) {
              if (!guild.newsChannelId) continue;
              try {
                  const channel = await this.client.channels.fetch(guild.newsChannelId) as TextChannel;
                  if (channel) {
                    await channel.send({ content });
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
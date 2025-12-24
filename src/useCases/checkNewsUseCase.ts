import { BotClient } from '../structures/BotClient';
import { PrismaClient } from '@prisma/client';
import { TextChannel, EmbedBuilder } from 'discord.js';
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

            let embed = new EmbedBuilder()
              .setTitle(`📢 Nueva Noticia de Tibia: ${item.news}`)
              .setColor(0xFFAA00) // Color ámbar/naranja para noticias
              .setURL(item.url)
              .setTimestamp(new Date(item.date))
              .setFooter({ text: 'WarSnakes Bot' });

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

                 if (cleanContent.length > 3000) {
                    cleanContent = cleanContent.substring(0, 3000) + '...';
                 }

                 embed.setTitle(`📢 ${title}`);
                 embed.setDescription(cleanContent);
                 embed.addFields(
                    { name: 'Categoría', value: detailedNews.category, inline: true },
                    { name: 'Fecha', value: detailedNews.date, inline: true }
                 );
                 embed.setURL(detailedNews.url || item.url);
              } else {
                 // Fallback si no hay detalle
                 embed.setDescription(`${item.category} - ${item.date}`);
              }
            } catch (err) {
              console.error(`[CheckNewsUseCase] Error obteniendo detalle de noticia ${item.id}, usando basica.`, err);
              // Fallback en error
              embed.setDescription(`${item.category} - ${item.date}`);
            }

            const guilds = await prisma.guildConfig.findMany({
              where: { newsChannelId: { not: null } }
            });

            for (const guild of guilds) {
              if (!guild.newsChannelId) continue;
              try {
                  const channel = await this.client.channels.fetch(guild.newsChannelId) as TextChannel;
                  if (channel) {
                    await channel.send({ embeds: [embed] });
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
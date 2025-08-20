import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

interface GTEvent {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  users: string[];
  organizerId?: string; // ID del organizador
  organizerName?: string; // Nombre del organizador
  messageId?: string; // ID del mensaje del evento
  channelId?: string; // ID del canal donde se creó el evento
}

export default class GTCommand extends BaseCommand {
  static events: GTEvent[] = [];

  constructor() {
    super({
      name: 'gt',
      description: 'Crea o únete a un evento GT a una hora específica.',
      category: 'teamCommands',
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const timeArg = args[0];
    if (!timeArg || !/^(\d{1,2})(:\d{2})?$/.test(timeArg)) {
      message.reply('Formato inválido. Usa `!gt 19` o `!gt 19:30`');
      return;
    }

    // Normaliza la hora
    let [hour, minute] = timeArg.split(':');
    if (!minute) minute = '00';
    hour = hour.padStart(2, '0');
    minute = minute.padStart(2, '0');
    const time = `${hour}:${minute}`;

    // Fecha de hoy
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    // Busca evento existente
    let event = GTCommand.events.find(e => e.date === dateStr && e.time === time);

    // Formatea fecha completa
    const localeDate = today.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const fechaCompleta = `${localeDate} ${time}`;
    const diasRestantes = 0; // Si el evento es hoy

    // Helper para formatear participantes
    const participantes = event
      ? event.users
          .map((userId, idx) => `${idx + 1}. <@${userId}>`)
          .join('\n')
      : `1. <@${message.author.id}>`;

    const embed = new EmbedBuilder()
 
 
    if (!event) {

      // Crea embed
      embed.setColor('#0099ff')
      .setTitle(`📅 Gold Token ${time}`)
      .setDescription(
        `Organizado por ${message.author.displayName    }\n` +
        `Hora: ${time}\n` +
        `Participantes\n${participantes} 👤\n`
      )
      .setFooter({text: `Evento estimado para las ${time} del dia ${dateStr.split('-').reverse().join('-')}`})
      .setImage(client.user?.avatarURL() ?? '');


      // Crea evento nuevo y envía embed
      const sentMsg = await message.channel.send({ embeds: [embed] });
      console.log(` obtenido eventMsg id ${sentMsg.id} `)
      event = {
        date: dateStr,
        time,
        users: [message.author.id],
        messageId: sentMsg.id,
        channelId: message.channel.id,
        organizerId: message.author.id,
      };
      GTCommand.events.push(event);
      message.reply(`Evento GT creado para hoy a las ${time}. ¡Te has unido!`).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 3000); 
        });
      return;
    }

    if (event.users.includes(message.author.id)) {
        message.reply('Ya estás en el evento.').then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 3000); 
        });
        return;
    }

    if (event.users.length >= 5) {
      message.reply('El evento ya tiene 5 personas, no puedes unirte.').then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 3000); 
        });
      return;
    }

    event.users.push(message.author.id);

    // Recalcula la lista de participantes después de agregar el nuevo usuario
    const participantesActualizados = event.users
      .map((userId, idx) => `${idx + 1}. <@${userId}>`)
      .join('\n');

    // Actualiza el mensaje del evento
    try {
      const channel = await client.channels.fetch(event.channelId!);
      // @ts-ignore
      console.log(` recuperado channel id ${channel.id} `)
      if (channel && channel.isTextBased()) {
        // @ts-ignore
        console.log(` pase por que es texto `)
        const eventMsg = await channel.messages.fetch(event.messageId!);
        console.log(` recuperado eventMsg id ${eventMsg.id} `)
        if (eventMsg) {
          embed.setDescription(
            `Organizado por <@${event?.organizerId}>\n` +
            `Hora: ${time}\n` +
            `Participantes\n${participantesActualizados} 👤\n`
          )
          .setColor('#0099ff')
          .setTitle(`📅 Gold Token ${time}`)
          .setFooter({text: `Evento estimado para las ${time} del dia ${dateStr.split('-').reverse().join('-')}`})
          .setImage(client.user?.avatarURL() ?? '');
              await eventMsg.edit({ embeds: [embed] });
            }
      }
    } catch (err) {
      // Si no se puede editar el mensaje, ignora el error
    }

    message.reply(`Te has unido al evento GT de hoy a las ${time}. (${event.users.length}/5)`).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 3000); 
        });;
    return;
  }
}
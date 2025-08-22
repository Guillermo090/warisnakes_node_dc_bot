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
      return this.sendReply(message, 'Formato inválido. Usa `!gt 19` o `!gt 19:30`');
    }

    // Normaliza la hora
    let [hour, minute] = timeArg.split(':');
    if (!minute) minute = '00';
    hour = hour.padStart(2, '0');
    minute = minute.padStart(2, '0');
    const time = `${hour}:${minute}`;

    // Fecha de hoy
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-CL').replace(/\//g, '-');

    // Busca evento existente
    let event = GTCommand.events.find(e => e.date === todayStr && e.time === time);

    // Helper para formatear participantes
    const participantes = event
      ? event.users
        .map((userId, idx) => `${idx + 1}. <@${userId}>`)
        .join('\n')
      : `1. <@${message.author.id}>`;

    // Crea embed base
    const embed = this.getBaseEmbed(client, todayStr, time);
    
    if (!event) {
      embed.setDescription(
        `Organizado por <@${message.author.id}>\n` +
        `Hora: ${time}\n` +
        `Participantes\n1. <@${message.author.id}>\n`
      )

      // Crea evento nuevo y envía embed
      const sentMsg = await message.reply({ embeds: [embed] });

      event = {
        date: todayStr,
        time,
        users: [message.author.id],
        messageId: sentMsg.id,
        channelId: message.channel.id,
        organizerId: message.author.id,
      };

      GTCommand.events.push(event);

      return this.sendReply( message,
        `Evento GT creado para hoy a las ${time}. ¡Te has unido!`
      , false);
    }

    if (event.users.includes(message.author.id)) {
      return this.sendReply(message, 'Ya estás en el evento.');
    }

    if (event.users.length >= 5) {
      return this.sendReply(message, 'El evento ya tiene 5 personas, no puedes unirte.');
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
      if (channel && channel.isTextBased()) {
        // @ts-ignore
        const eventMsg = await channel.messages.fetch(event.messageId!);
        if (eventMsg) {
          embed.setDescription(
            `Organizado por <@${event?.organizerId}>\n` +
            `Hora: ${time}\n` +
            `Participantes\n${participantesActualizados}\n`
          )
          
          await eventMsg.edit({ embeds: [embed] });
        }
      }
    } catch (err) {
      // Si no se puede editar el mensaje, ignora el error
    }

    if (event.users.length === 5) {
      // Crea evento nuevo y envía embed
      await message.reply({ embeds: [embed] });
    }

    return this.sendReply(message,
      `Te has unido al evento GT de hoy a las ${time}. (${event.users.length}/5)`
    );

  }

  private getBaseEmbed(client:any, todayStr: string, time:string ): EmbedBuilder {
    // const reverseDate = todayStr.split('-').reverse().join('-');
    return new EmbedBuilder()
      .setColor('#0099ff')  
      .setTitle(`📅 Gold Token ${time}`)
      .setFooter({
        text: `Evento estimado para las ${time} del dia ${todayStr}`
      })
      .setImage(client.user?.avatarURL() ?? '')
      .setTimestamp();
  }

  private sendReply(message: Message, content: string, deleteInitiator : boolean = true): void {
    message.reply(content).then( msg => {
      setTimeout(() => msg.delete().catch(() => {}), 2500); 
    });
    if (deleteInitiator) {
      message.delete().catch(() => {});
    }
  }
}
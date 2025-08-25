import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

interface GTEvent {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  users: string[];
  organizerId?: string;
  organizerName?: string;
  messageId?: string;
  channelId?: string;
  guildId?: string; // <--- Agregado
}

export default class GTCommand extends BaseCommand {
  static events: GTEvent[] = [];

  // Método para limpiar eventos antiguos
  static cleanOldEvents() {
    const todayStr = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
    GTCommand.events = GTCommand.events.filter(e => e.date === todayStr);
  }

  constructor() {
    super({
      name: 'gt',
      description: 'Crea o únete a un evento GT a una hora específica.',
      category: 'teamCommands',
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    GTCommand.cleanOldEvents(); // Limpia eventos viejos antes de continuar

    const timeArg = args[0];
    if (!timeArg) {
      return this.sendReply(message, 
        'Debes especificar una hora. Usa `!gt 19` para unirte o `!gt -19` para salir.');
    }

    const isLeaveCommand = timeArg.startsWith('-');
    const timeString = isLeaveCommand ? timeArg.substring(1) : timeArg;

    if (!/^\d{1,2}(:\d{2})?$/.test(timeString)) {
      return this.sendReply(message, 'Formato de hora inválido. Usa `19` o `19:30`.');
    }

    // Normaliza la hora
    let [hour, minute] = timeString.split(':');
    if (!minute) minute = '00';
    hour = hour.padStart(2, '0');
    minute = minute.padStart(2, '0');
    const time = `${hour}:${minute}`;

    // Fecha de hoy
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-CL').replace(/\//g, '-');
    const guildId = message.guild?.id ?? 'global';

    // Busca evento existente
    const eventIndex = GTCommand.events
      .findIndex(e => e.date === todayStr && e.time === time && e.guildId === guildId);
    let event = eventIndex !== -1 ? GTCommand.events[eventIndex] : undefined;

    // Lógica para SALIR de un evento
    if (isLeaveCommand) {
      if (!event) {
        return this.sendReply(message, 
          `No se encontró un evento a las ${time} para que puedas salir.`);
      }

      const userIndex = event.users.indexOf(message.author.id);
      if (userIndex === -1) {
        return this.sendReply(message, `No estás en el evento de las ${time}.`);
      }

      // Elimina al usuario
      event.users.splice(userIndex, 1);

      // Si el evento queda vacío, elimínalo
      if (event.users.length === 0) {
        GTCommand.events.splice(eventIndex, 1);
        try {
          const channel = await client.channels.fetch(event.channelId!);
          // @ts-ignore
          const eventMsg = await channel.messages.fetch(event.messageId!);
          await eventMsg.delete();
        } catch (err) { /* Ignorar si no se puede borrar */ }
        return this.sendReply(message, 
          `Has salido del evento de las ${time}. El evento ha sido cancelado.`);
      }

      // Si el organizador se va, asigna uno nuevo
      if (event.organizerId === message.author.id) {
        event.organizerId = event.users[0];
      }

      // Actualiza el mensaje del evento
      const participantesActualizados = event.users
        .map((userId, idx) => `${idx + 1}. <@${userId}>`)
        .join('\n')
      const embed = this.getBaseEmbed(client, todayStr, time);
      embed.setDescription(
        `Organizado por <@${event.organizerId}>\n` +
        `Hora: ${time}\n` +
        `Participantes\n${participantesActualizados}\n`
      );
      
      try {
        const channel = await client.channels.fetch(event.channelId!);
        // @ts-ignore
        const eventMsg = await channel.messages.fetch(event.messageId!);
        await eventMsg.edit({ embeds: [embed] });
      } catch (err) { /* Ignorar si no se puede editar */ }

      return this.sendReply(message, `Has salido del evento de las ${time}.`);
    }

    // Lógica para CREAR o UNIRSE a un evento (código existente)
    if (!event) {
      const embed = this.getBaseEmbed(client, todayStr, time);
      embed.setDescription(
        `Organizado por <@${message.author.id}>\n` +
        `Hora: ${time}\n` +
        `Participantes\n1. <@${message.author.id}>\n`
      );

      const sentMsg = await message.reply({ embeds: [embed] });

      event = {
        date: todayStr,
        time,
        users: [message.author.id],
        messageId: sentMsg.id,
        channelId: message.channel.id,
        organizerId: message.author.id,
        guildId,
      };

      GTCommand.events.push(event);
      return this.sendReply(message, `Evento GT creado para hoy a las ${time}. ¡Te has unido!`, false);
    }

    if (event.users.includes(message.author.id)) {
      return this.sendReply(message, 'Ya estás en el evento.');
    }

    if (event.users.length >= 5) {
      return this.sendReply(message, 'El evento ya tiene 5 personas, no puedes unirte.');
    }

    event.users.push(message.author.id);

    const participantesActualizados = event.users
      .map((userId, idx) => `${idx + 1}. <@${userId}>`)
      .join('\n');
    const embed = this.getBaseEmbed(client, todayStr, time);
    embed.setDescription(
      `Organizado por <@${event.organizerId}>\n` +
      `Hora: ${time}\n` +
      `Participantes\n${participantesActualizados}\n`
    );

    try {
      const channel = await client.channels.fetch(event.channelId!);
      // @ts-ignore
      const eventMsg = await channel.messages.fetch(event.messageId!);
      await eventMsg.edit({ embeds: [embed] });
    } catch (err) { /* Ignorar si no se puede editar */ }

    if (event.users.length === 5) {
      await message.reply({ embeds: [embed] });
    }

    return this.sendReply(message, `Te has unido al evento GT de hoy a las ${time}. (${event.users.length}/5)`);
  }

  private getBaseEmbed(client: any, todayStr: string, time: string): EmbedBuilder {
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
      setTimeout(() => message.delete().catch(() => {}), 5000);
    }
  }
}
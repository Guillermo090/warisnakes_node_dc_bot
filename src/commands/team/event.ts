import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

interface CustomEvent {
  id: string;
  date: string; // DD-MM-YYYY
  time: string; // HH:mm
  name: string;
  users: string[];
  organizerId: string;
  messageId?: string;
  channelId: string;
  guildId: string;
  reminderTimeout?: NodeJS.Timeout;
}

export default class EventCommand extends BaseCommand {
  static events: CustomEvent[] = [];
  static nextId = 454875; // Contador para IDs de eventos
  private static timeZone = 'America/Santiago';

  // Método para limpiar eventos que ya han pasado, basado en la hora de Chile.
  static cleanUpPastEvents() {
    const now = new Date();
    const nowInChile = {
      year: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, year: 'numeric' })),
      month: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, month: 'numeric' })) - 1, // JS month is 0-indexed
      day: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, day: '2-digit' })),
      hour: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, hour: '2-digit', hour12: false })),
      minute: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, minute: '2-digit' })),
    };
    const nowTimestamp = new Date(nowInChile.year, nowInChile.month, nowInChile.day, nowInChile.hour, nowInChile.minute).getTime();

    console.log('Eventos actuales antes de la limpieza:');
    EventCommand.events.map(event => {
      console.log(`Evento ID: ${event.id}, Fecha: ${event.date}, Hora: ${event.time}`);
    });

    EventCommand.events = EventCommand.events.filter(event => {
      const [day, month, year] = event.date.split('-').map(Number);
      const [hour, minute] = event.time.split(':').map(Number);
      const eventTimestamp = new Date(year, month - 1, day, hour, minute).getTime();
      
      if (eventTimestamp < nowTimestamp) {
        if (event.reminderTimeout) clearTimeout(event.reminderTimeout);
        console.log(`Limpiando evento pasado: ${event.name} (ID: ${event.id})`);
        return false;
      }
      return true;
    });
  }

  constructor() {
    super({
      name: 'evento',
      description: 'Crea, únete o sal de un evento.\nCrear: `!evento [hora] [nombre]`\nUnirse: `!evento [ID]`\nSalir: `!evento -[ID]`',
      category: 'teamCommands',
      aliases: ['event'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    EventCommand.cleanUpPastEvents();

    if (!message.guild || !message.channel) {
      return;
    }

    // Lógica para SALIR de un evento por ID
    if (args.length === 1 && /^-\d+$/.test(args[0])) {
      const eventId = args[0].substring(1);
      const eventIndex = EventCommand.events.findIndex(e => e.id === eventId && e.guildId === message.guild!.id);

      if (eventIndex === -1) {
        await this.sendTemporaryReply(message, `No se encontró ningún evento con el ID \`${eventId}\`.`);
        return;
      }

      const event = EventCommand.events[eventIndex];
      const userIndex = event.users.indexOf(message.author.id);

      if (userIndex === -1) {
        await this.sendTemporaryReply(message, `No estás en el evento "${event.name}".`);
        return;
      }

      event.users.splice(userIndex, 1);

      if (event.users.length === 0) {
        EventCommand.events.splice(eventIndex, 1);
        if (event.reminderTimeout) clearTimeout(event.reminderTimeout);
        try {
          const channel = await client.channels.fetch(event.channelId);
          if (channel?.isTextBased() && event.messageId) {
            const eventMsg = await channel.messages.fetch(event.messageId);
            await eventMsg.delete();
          }
        } catch (err) { console.error(`Error al borrar msg del evento ${event.id}:`, err); }
        await this.sendTemporaryReply(message, `Has salido del evento "${event.name}". El evento ha sido cancelado.`);
        return;
      }

      if (event.organizerId === message.author.id) {
        event.organizerId = event.users[0];
      }

      const updatedEmbed = this.createEventEmbed(client, event);
      try {
        const channel = await client.channels.fetch(event.channelId);
        if (channel?.isTextBased() && event.messageId) {
          const eventMsg = await channel.messages.fetch(event.messageId);
          await eventMsg.edit({ embeds: [updatedEmbed] });
        }
      } catch (err) { console.error('Error al editar el mensaje del evento:', err); }

      await this.sendTemporaryReply(message, `Has salido del evento "${event.name}".`);
      return;
    }

    // Lógica para UNIRSE a un evento por ID
    if (args.length === 1 && /^\d{4,}$/.test(args[0])) {
      const eventId = args[0];
      const event = EventCommand.events.find(e => e.id === eventId && e.guildId === message.guild!.id);

      if (!event) {
        await this.sendTemporaryReply(message, `No se encontró ningún evento con el ID \`${eventId}\`.`);
        return;
      }

      if (event.users.includes(message.author.id)) {
        await this.sendTemporaryReply(message, 'Ya estás en este evento.');
        return;
      }

      event.users.push(message.author.id);

      const updatedEmbed = this.createEventEmbed(client, event);
      try {
        const channel = await client.channels.fetch(event.channelId);
        if (channel?.isTextBased() && event.messageId) {
          const eventMsg = await channel.messages.fetch(event.messageId);
          await eventMsg.edit({ embeds: [updatedEmbed] });
        }
      } catch (err) { console.error('Error al editar el mensaje del evento:', err); }

      await this.sendTemporaryReply(message, `Te has unido al evento "${event.name}".`);
      return;
    }

    // Lógica para CREAR un evento
    const { date, time, name } = this.parseCreationArguments(args);

    if (!time || !name) {
      await this.sendTemporaryReply(message, 'Formato incorrecto. Crear: `!evento [hora] [nombre]` o `!evento [DD-MM-YYYY] [hora] [nombre]`. Unirse: `!evento [ID]`');
      return;
    }
    
    const existingEvent = EventCommand.events.find(e => e.guildId === message.guild!.id && e.date === date && e.time === time);
    if (existingEvent) {
        await this.sendTemporaryReply(message, `Ya existe un evento (ID: ${existingEvent.id}) a las ${time} del ${date}.`);
        return;
    }

    const newEvent: CustomEvent = {
      id: (EventCommand.nextId++).toString(),
      date,
      time,
      name,
      users: [message.author.id],
      organizerId: message.author.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
    };

    if (!message.channel.isTextBased()) {
        await this.sendTemporaryReply(message, 'No puedo crear un evento en este tipo de canal.');
        return;
    }

    const embed = this.createEventEmbed(client, newEvent);
    if (message.channel.isTextBased() && 'send' in message.channel) {
      const eventMessage = await message.channel.send({ embeds: [embed] });
      newEvent.messageId = eventMessage.id;
    }

    this.scheduleReminder(client, newEvent);
    EventCommand.events.push(newEvent);
    await this.sendTemporaryReply(message, `✅ Evento "${name}" creado con ID \`${newEvent.id}\`.`, false);
  }

  private parseCreationArguments(args: string[]): { date: string, time: string | null, name: string | null } {
    const today = new Date().toLocaleDateString('es-CL', { timeZone: EventCommand.timeZone }).replace(/\//g, '-');
    
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    const timeRegex = /^\d{1,2}(:\d{2})?$/;

    let date = today;
    let time: string | null = null;
    let name: string | null = null;

    if (dateRegex.test(args[0]) && timeRegex.test(args[1])) {
      date = args[0];
      time = this.normalizeTime(args[1]);
      name = args.slice(2).join(' ');
    } else if (timeRegex.test(args[0])) {
      time = this.normalizeTime(args[0]);
      name = args.slice(1).join(' ');
    }

    return { date, time, name: name || null };
  }

  private normalizeTime(timeStr: string): string {
    let [hour, minute] = timeStr.split(':');
    if (!minute) minute = '00';
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  private scheduleReminder(client: BotClient, event: CustomEvent): void {
    const [day, month, year] = event.date.split('-').map(Number);
    const [hour, minute] = event.time.split(':').map(Number);
    
    const eventDate = new Date(year, month - 1, day, hour, minute);
    const reminderTime = eventDate.getTime() - (60 * 60 * 1000);

    const now = new Date();
    const nowInChile = {
      year: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, year: 'numeric' })),
      month: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, month: 'numeric' })) - 1,
      day: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, day: '2-digit' })),
      hour: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, hour: '2-digit', hour12: false })),
      minute: parseInt(now.toLocaleString('en-US', { timeZone: EventCommand.timeZone, minute: '2-digit' })),
    };
    const nowTimestamp = new Date(nowInChile.year, nowInChile.month, nowInChile.day, nowInChile.hour, nowInChile.minute).getTime();

    if (reminderTime > nowTimestamp) {
      const delay = reminderTime - nowTimestamp;
      event.reminderTimeout = setTimeout(async () => {
        try {
          const channel = await client.channels.fetch(event.channelId);
          if (channel && channel.isTextBased() && 'send' in channel) {
            const reminderEmbed = new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle(`🔔 Recordatorio: ¡El evento comienza en 1 hora!`)
              .setDescription(`**Evento:** ${event.name} (ID: ${event.id})\n**Hora:** ${event.time}`)
              .setTimestamp();
            await channel.send({ content: `@here ¡Atención!`, embeds: [reminderEmbed] });
          }
        } catch (error) {
          console.error(`Error al enviar recordatorio para el evento ${event.name}:`, error);
        }
      }, delay);
    }
  }

  private createEventEmbed(client: BotClient, event: Omit<CustomEvent, 'channelId' | 'guildId' | 'messageId' | 'reminderTimeout'>): EmbedBuilder {
    const participantsList = event.users.length > 0
      ? event.users.map((userId, idx) => `${idx + 1}. <@${userId}>`).join('\n')
      : 'Aún no hay nadie registrado.';

    return new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🎉 Evento: ${event.name}`)
      .setDescription(`Organizado por <@${event.organizerId}>`)
      .addFields(
        { name: '🆔 ID del Evento', value: `**${event.id}**`, inline: true },
        { name: '🗓️ Fecha', value: event.date, inline: true },
        { name: '⏰ Hora', value: event.time, inline: true },
        { name: `👥 Participantes (${event.users.length})`, value: participantsList }
      )
      .setImage(client.user?.avatarURL() ?? '')
      .setFooter({ text: `Usa !evento ${event.id} para unirte.` })
      .setTimestamp();
  }

  private async sendTemporaryReply(message: Message, content: string, deleteInitiator: boolean = true): Promise<void> {
    const reply = await message.reply(content);
    setTimeout(() => reply.delete().catch(() => {}), 6000);
    if (deleteInitiator) {
      setTimeout(() => message.delete().catch(() => {}), 6000);
    }
  }
}
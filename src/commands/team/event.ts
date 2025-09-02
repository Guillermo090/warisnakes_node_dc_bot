import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message, TextChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

interface CustomEvent {
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
  // Almacenamos los eventos en memoria. Se reiniciarán si el bot se reinicia.
  static events: CustomEvent[] = [];

  constructor() {
    super({
      name: 'evento',
      description: 'Crea o únete a un evento. Uso:\n`!evento [hora] [nombre]` (para hoy)\n`!evento [fecha] [hora] [nombre]` (DD-MM-YYYY)',
      category: 'teamCommands',
      aliases: ['event'],
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    if (!message.guild) {
      await message.reply('Este comando solo puede usarse en un servidor.');
      return;
    }

    const { date, time, name } = this.parseArguments(args);

    if (!time || !name) {
      await this.sendTemporaryReply(message, 'Formato incorrecto. Uso:\n`!evento [hora] [nombre]`\n`!evento [DD-MM-YYYY] [hora] [nombre]`');
      return;
    }

    // Busca un evento existente
    const eventIndex = EventCommand.events.findIndex(e =>
      e.guildId === message.guild!.id &&
      e.date === date &&
      e.time === time &&
      e.name.toLowerCase() === name.toLowerCase()
    );

    let event = eventIndex !== -1 ? EventCommand.events[eventIndex] : undefined;

    // Si el evento no existe, lo crea
    if (!event) {
      const embed = this.createEventEmbed(client, {
        date,
        time,
        name,
        organizerId: message.author.id,
        users: [message.author.id] // El creador se une automáticamente
      });
      const eventMessage = await message.channel.send({ embeds: [embed] });

      const newEvent: CustomEvent = {
        date,
        time,
        name,
        users: [message.author.id],
        organizerId: message.author.id,
        messageId: eventMessage.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
      };

      this.scheduleReminder(client, newEvent);
      EventCommand.events.push(newEvent);
      await this.sendTemporaryReply(message, `✅ Evento "${name}" creado para el ${date} a las ${time}. ¡Te has unido!`, false);
      return;
    }

    // Si el evento ya existe, el usuario se une
    if (event.users.includes(message.author.id)) {
      await this.sendTemporaryReply(message, 'Ya estás en este evento.');
      return;
    }

    event.users.push(message.author.id);

    // Actualiza el embed con la nueva lista de participantes
    const updatedEmbed = this.createEventEmbed(client, event);
    try {
      const channel = await client.channels.fetch(event.channelId!) as TextChannel;
      const eventMsg = await channel.messages.fetch(event.messageId!);
      await eventMsg.edit({ embeds: [updatedEmbed] });
    } catch (err) {
      console.error('Error al editar el mensaje del evento:', err);
    }

    await this.sendTemporaryReply(message, `Te has unido al evento "${name}" del ${date} a las ${time}.`);
  }

  private parseArguments(args: string[]): { date: string, time: string | null, name: string | null } {
    const today = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    
    if (args.length < 2) return { date: today, time: null, name: null };

    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    const timeRegex = /^\d{1,2}(:\d{2})?$/;

    let date = today;
    let time: string | null = null;
    let name: string | null = null;

    if (dateRegex.test(args[0]) && timeRegex.test(args[1])) {
      // Formato: !evento [fecha] [hora] [nombre]
      date = args[0];
      time = this.normalizeTime(args[1]);
      name = args.slice(2).join(' ');
    } else if (timeRegex.test(args[0])) {
      // Formato: !evento [hora] [nombre]
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
    
    // OJO: El mes en el constructor de Date es 0-indexado (0=Enero, 11=Diciembre)
    const eventDate = new Date(year, month - 1, day, hour, minute);
    const reminderTime = eventDate.getTime() - (60 * 60 * 1000); // 1 hora antes
    const now = Date.now();

    if (reminderTime > now) {
      const delay = reminderTime - now;
      event.reminderTimeout = setTimeout(async () => {
        try {
          const channel = await client.channels.fetch(event.channelId) as TextChannel;
          if (channel) {
            const reminderEmbed = new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle(`🔔 Recordatorio: ¡El evento comienza en 1 hora!`)
              .setDescription(`**Evento:** ${event.name}\n**Hora:** ${event.time}`)
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
        { name: '🗓️ Fecha', value: event.date, inline: true },
        { name: '⏰ Hora', value: event.time, inline: true },
        { name: `👥 Participantes (${event.users.length})`, value: participantsList }
      )
      .setImage(client.user?.avatarURL() ?? '')
      .setFooter({ text: `Usa !evento ${event.date !== new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') ? event.date + ' ' : ''}${event.time} ${event.name} para unirte.` })
      .setTimestamp();
  }

  private async sendTemporaryReply(message: Message, content: string, deleteInitiator: boolean = true): Promise<void> {
    const reply = await message.reply(content);
    setTimeout(() => reply.delete().catch(() => {}), 5000);
    if (deleteInitiator) {
      setTimeout(() => message.delete().catch(() => {}), 5000);
    }
  }
}
import { BaseCommand } from '../../structures/BaseCommand';
import type { BotClient } from '../../structures/BotClient';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../../services/databaseService';

export default class GTCommand extends BaseCommand {

  constructor() {
    super({
      name: 'gt',
      description: 'Crea, únete o sal de un evento GT a una hora específica.\n' +
      '!gt 19 para ingresar o !gt -19 para salir',
      category: 'teamCommands',
    });
  }

  public async execute(client: BotClient, message: Message, args: string[]): Promise<void> {
    const timeArg = args[0];
    if (!timeArg) {
      return this.sendReply(message, 
        'Debes especificar una hora. Usa `!gt 19` para unirte o `!gt -19` para salir.');
    }

    // Fecha de hoy y Guild ID
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-CL').replace(/\//g, '-');
    const guildId = message.guild?.id;

    if (!guildId) return; // No funciona en DMs

    // --- LÓGICA PARA LISTAR EVENTOS DE HOY ---
    if (timeArg.toLowerCase() === 'hoy') {
        const events = await DatabaseService.getGtEventsForDate(guildId, todayStr);
        
        if (events.length === 0) {
            return this.sendReply(message, `No hay eventos GT programados para hoy (${todayStr}).`);
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📅 Eventos GT de Hoy (${todayStr})`)
            .setDescription(events.map(e => {
                const spotsLeft = 5 - e.participants.length;
                const status = spotsLeft === 0 ? '🔴 Lleno' : `🟢 ${spotsLeft} cupos`;
                // Enlace al mensaje original si existe
                const link = e.messageId ? `[Ver](${`https://discord.com/channels/${e.guildId}/${e.channelId}/${e.messageId}`})` : '';
                return `**${e.time}** - ${status} - ${link} - Creado por: <@${e.organizerId}>`;
            }).join('\n'))
            .setTimestamp();
            
        message.reply({ embeds: [embed] });
        return;
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

    // 1. Buscar evento en Base de Datos
    let event = await DatabaseService.getActiveGtEvent(guildId, todayStr, time);

    // --- LÓGICA PARA SALIR (-HH:mm) ---
    if (isLeaveCommand) {
      if (!event) {
        return this.sendReply(message, 
          `No se encontró un evento activo a las ${time} para que puedas salir.`);
      }

      const isParticipant = event.participants.some(p => p.userId === message.author.id);
      if (!isParticipant) {
        return this.sendReply(message, `No estás en el evento de las ${time}.`);
      }

      // Eliminar participante de la BD
      await DatabaseService.removeGtParticipant(event.id, message.author.id);
      
      // Refrescar datos del evento
      event = await DatabaseService.getActiveGtEvent(guildId, todayStr, time);
      
      // Si no quedan participantes, cancelar evento
      if (!event || event.participants.length === 0) {
        if (event) {
            await DatabaseService.updateGtEvent(event.id, { status: 'CANCELLED' });
        }
        try {
          const channel = await client.channels.fetch(event!.channelId);
          if (channel?.isTextBased() && event!.messageId) {
             // @ts-ignore
            const eventMsg = await channel.messages.fetch(event!.messageId);
            await eventMsg.delete();
          }
        } catch (err) { /* Ignorar */ }
        return this.sendReply(message, 
          `Has salido del evento de las ${time}. El evento ha sido cancelado.`);
      }

      // Si el organizador se fue, asignar uno nuevo (el siguiente en la lista)
      let currentOrganizerId = event.organizerId;
      if (event.organizerId === message.author.id) {
        const newOrganizer = event.participants[0]; // El primero de la lista (ordenado por joinedAt)
        if (newOrganizer) {
            await DatabaseService.updateGtEvent(event.id, { organizerId: newOrganizer.userId });
            currentOrganizerId = newOrganizer.userId;
        }
      }

      // Actualizar Embed
      await this.updateEventMessage(client, event, currentOrganizerId, todayStr, time);
      return this.sendReply(message, `Has salido del evento de las ${time}.`);
    }

    // --- LÓGICA PARA CREAR O UNIRSE ---
    
    // A) Crear nuevo evento si no existe
    if (!event) {
      // Enviamos el mensaje primero para obtener el ID
      const embed = this.getBaseEmbed(client, todayStr, time);
      embed.setDescription(
        `Organizado por <@${message.author.id}>\n` +
        `Hora: ${time}\n` +
        `Participantes\n1. <@${message.author.id}>\n`
      );

      const sentMsg = await message.reply({ embeds: [embed] });

      // Guardar en BD
      await DatabaseService.createGtEvent({
        guildId,
        channelId: message.channel.id,
        messageId: sentMsg.id,
        organizerId: message.author.id,
        date: todayStr,
        time: time
      });

      return this.sendReply(message, `Evento GT creado para hoy a las ${time}. ¡Te has unido!`, false);
    }

    // B) Unirse a evento existente
    const isParticipant = event.participants.some(p => p.userId === message.author.id);
    if (isParticipant) {
      return this.sendReply(message, 'Ya estás en el evento.');
    }

    if (event.participants.length >= 5) {
      return this.sendReply(message, 'El evento ya tiene 5 personas, no puedes unirte.');
    }

    // Agregar a BD
    await DatabaseService.addGtParticipant(event.id, message.author.id);
    
    // Refrescar evento para tener la lista actualizada
    event = await DatabaseService.getActiveGtEvent(guildId, todayStr, time);
    
    if(event) {
        await this.updateEventMessage(client, event, event.organizerId, todayStr, time);
        
        if (event.participants.length === 5) {
            // Notificar que se llenó (opcional, re-enviando el embed o un mensaje nuevo)
            // await message.channel.send(`¡El evento de las ${time} está lleno!`);
        }
    }

    return this.sendReply(message, `Te has unido al evento GT de hoy a las ${time}. (${event?.participants.length}/5)`);
  }

  private async updateEventMessage(client: BotClient, event: any, organizerId: string, dateStr: string, time: string) {
      const participantsList = event.participants
        .map((p: any, idx: number) => `${idx + 1}. <@${p.userId}>`)
        .join('\n');

      const embed = this.getBaseEmbed(client, dateStr, time);
      embed.setDescription(
        `Organizado por <@${organizerId}>\n` +
        `Hora: ${time}\n` +
        `Participantes\n${participantsList}\n`
      );

      try {
        const channel = await client.channels.fetch(event.channelId);
        if (channel?.isTextBased() && event.messageId) {
            // @ts-ignore
            const eventMsg = await channel.messages.fetch(event.messageId);
            await eventMsg.edit({ embeds: [embed] });
        }
      } catch (err) { console.error("Error actualizando mensaje GT:", err); }
  }

  private getBaseEmbed(client: any, todayStr: string, time: string): EmbedBuilder {
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
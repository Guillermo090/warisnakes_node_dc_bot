import { PrismaClient } from '@prisma/client';

export class DatabaseService {
  private static prisma = new PrismaClient();

  /**
   * Registra un nuevo accidente en la base de datos
   * @param detail - Detalle del accidente
   * @returns El accidente creado
   */
  static async createAccident(detail: string) {
    return await this.prisma.accident.create({
      data: {
        detail,
      },
    });
  }

  /**
   * Obtiene el último accidente registrado
   * @returns El último accidente o null si no hay ninguno
   */
  static async getLastAccident() {
    return await this.prisma.accident.findFirst({
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Obtiene todos los accidentes
   * @returns Array de accidentes
   */
  static async getAllAccidents() {
    return await this.prisma.accident.findMany({
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Calcula los días sin accidentes desde el último registrado
   * @returns Número de días sin accidentes
   */
  static async getDaysWithoutAccidents(): Promise<number> {
    const lastAccident = await this.getLastAccident();
    
    if (!lastAccident) {
      // Si no hay accidentes, retorna días desde el 1 de enero de 2025
      const initialDate = new Date(2025, 0, 1);
      const now = new Date();
      const diffMs = now.getTime() - initialDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const now = new Date();
    const diffMs = now.getTime() - lastAccident.date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene todos los personajes rastreados
   * @returns Array de personajes rastreados
   */
  static async getAllTrackedCharacters() {
    return await this.prisma.trackedCharacter.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  // --- MÉTODOS PARA GT ---

  /**
   * Busca un evento GT activo para una fecha, hora y servidor específicos.
   * Incluye la lista de participantes.
   */
  static async getActiveGtEvent(guildId: string, date: string, time: string) {
    return await this.prisma.gtEvent.findFirst({
      where: {
        guildId,
        date,
        time,
        status: 'CREATED', // Solo buscamos eventos activos
      },
      include: {
        participants: {
          orderBy: {
            joinedAt: 'asc', // Para mantener el orden de llegada
          },
        },
      },
    });
  }

  /**
   * Crea un nuevo evento GT y añade al organizador como primer participante.
   */
  static async createGtEvent(data: {
    guildId: string;
    channelId: string;
    messageId: string;
    organizerId: string;
    date: string;
    time: string;
  }) {
    return await this.prisma.gtEvent.create({
      data: {
        guildId: data.guildId,
        channelId: data.channelId,
        messageId: data.messageId,
        organizerId: data.organizerId,
        date: data.date,
        time: data.time,
        participants: {
          create: {
            userId: data.organizerId,
          },
        },
      },
      include: {
        participants: true,
      },
    });
  }

  /**
   * Añade un participante a un evento existente.
   */
  static async addGtParticipant(eventId: number, userId: string) {
    return await this.prisma.gtParticipant.create({
      data: {
        eventId,
        userId,
      },
    });
  }

  /**
   * Elimina un participante de un evento.
   */
  static async removeGtParticipant(eventId: number, userId: string) {
    // Buscamos el registro específico para borrarlo
    const participant = await this.prisma.gtParticipant.findFirst({
      where: { eventId, userId },
    });

    if (participant) {
      await this.prisma.gtParticipant.delete({
        where: { id: participant.id },
      });
    }
  }

  /**
   * Actualiza el organizador o el estado del evento (por ejemplo, a CANCELLED).
   */
  static async updateGtEvent(eventId: number, data: { organizerId?: string; status?: string }) {
    return await this.prisma.gtEvent.update({
      where: { id: eventId },
      data,
    });
  }

  /**
   * Obtiene todos los eventos GT activos para una fecha y servidor específicos.
   */
  static async getGtEventsForDate(guildId: string, date: string) {
    return await this.prisma.gtEvent.findMany({
      where: {
        guildId,
        date,
        status: 'CREATED',
      },
      include: {
        participants: true,
      },
      orderBy: {
        time: 'asc',
      },
    });
  }
  
  /**
   * Cierra la conexión con la base de datos
   */
  static async disconnect() {
    await this.prisma.$disconnect();
  }
}
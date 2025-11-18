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
   * Cierra la conexión con la base de datos
   */
  static async disconnect() {
    await this.prisma.$disconnect();
  }
}
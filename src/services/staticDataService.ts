export class StaticDataService {
  // --- LÓGICA DE RASHID (EXISTENTE) ---
  static getRashidDay(): string {
    const rashidCitiesByDay: Record<number, string> = {
      0: 'Carlin',       // Domingo
      1: 'Svargrond',    // Lunes
      2: 'Liberty Bay',  // Martes
      3: 'Port Hope',    // Miércoles
      4: 'Ankrahmun',    // Jueves
      5: 'Darashia',     // Viernes
      6: 'Edron'         // Sábado
    };
    const today = new Date().getDay();
    return rashidCitiesByDay[today];
  }

  // --- NUEVA LÓGICA PARA EL DROME ---
  private static readonly LAST_DROME_START = new Date(2025, 7, 20, 4, 0, 0); // Miércoles 20 de Agosto 2025, 04:00
  private static readonly DROME_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000; // 14 días en milisegundos

  /**
   * Calcula la fecha del próximo evento del Drome.
   */
  private static getNextDromeDate(): Date {
    const now = new Date();
    let nextDromeDate = new Date(this.LAST_DROME_START.getTime());

    // Mientras la fecha calculada sea en el pasado, le sumamos 14 días hasta encontrar la próxima futura.
    while (nextDromeDate.getTime() <= now.getTime()) {
      nextDromeDate = new Date(nextDromeDate.getTime() + this.DROME_INTERVAL_MS);
    }
    return nextDromeDate;
  }

  /**
   * Devuelve el tiempo restante para el próximo Drome en formato "X días, Y horas, Z minutos".
   */
  static getDromeTime(): string {
    const now = new Date();
    const nextDromeDate = this.getNextDromeDate();
    const diffMs = nextDromeDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'El Drome está activo.';
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${days} días, ${hours} horas, ${minutes} minutos`;
  }
}
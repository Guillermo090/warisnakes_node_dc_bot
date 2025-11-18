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

  // --- LÓGICA DEL DROME (EXISTENTE) ---
  private static readonly LAST_DROME_START = new Date(2025, 7, 20, 4, 0, 0);
  private static readonly DROME_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

  private static getNextDromeDate(): Date {
    const now = new Date();
    let nextDromeDate = new Date(this.LAST_DROME_START.getTime());

    while (nextDromeDate.getTime() <= now.getTime()) {
      nextDromeDate = new Date(nextDromeDate.getTime() + this.DROME_INTERVAL_MS);
    }
    return nextDromeDate;
  }

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

  // --- NUEVA LÓGICA PARA ACCIDENTES ---
  private static lastAccidentDate: Date = new Date(2025, 0, 1); // Fecha inicial
  private static lastAccidentReason: string = 'Ninguno registrado';

  /**
   * Reinicia el contador de accidentes a la fecha y hora actuales.
   * @param reason - Motivo del accidente
   */
  static resetAccidentCounter(reason: string): void {
    this.lastAccidentDate = new Date();
    this.lastAccidentReason = reason;
  }

  /**
   * Calcula los días transcurridos desde el último accidente.
   * @returns El número de días sin accidentes.
   */
  static getDaysWithoutAccidents(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.lastAccidentDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene el motivo del último accidente registrado.
   * @returns El motivo del último accidente.
   */
  static getLastAccidentReason(): string {
    return this.lastAccidentReason;
  }
}
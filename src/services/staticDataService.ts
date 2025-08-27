
export class StaticDataService {
  // Devuelve la ciudad donde está Rashid según el día de la semana
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
}
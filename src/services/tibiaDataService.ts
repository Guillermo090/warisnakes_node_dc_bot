export class TibiaDataService {
  private static readonly BASE_URL = 'https://api.tibiadata.com/v4';

  /**
   * Obtiene las últimas noticias de Tibia.
   */
  static async getLatestNews(): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/news/latest`);
      return await response.json();
    } catch (error) {
      console.error('[TibiaDataService] Error obteniendo noticias:', error);
      return null;
    }
  }

  /**
   * Obtiene la información de las casas para un mundo y ciudad específicos.
   */
  static async getHouses(world: string, town: string): Promise<any> {
    try {
      const url = `${this.BASE_URL}/houses/${world}/${encodeURIComponent(town)}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error(`[TibiaDataService] Error obteniendo casas para ${world} - ${town}:`, error);
      return null;
    }
  }

  /**
   * Obtiene la información de un personaje específico.
   */
  static async getCharacter(name: string): Promise<any> {
    try {
      const url = `${this.BASE_URL}/character/${encodeURIComponent(name)}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error: any) {
      console.error(`[TibiaDataService] Error obteniendo personaje ${name}:`, error.message);
      return null;
    }
  }
}
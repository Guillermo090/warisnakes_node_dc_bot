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
   * Obtiene el detalle de una noticia específica por ID.
   */
  static async getNews(id: number): Promise<any> {
    try {
      const url = `${this.BASE_URL}/news/id/${id}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error(`[TibiaDataService] Error obteniendo detalle de noticia ${id}:`, error);
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
  /**
   * Obtiene la lista de personajes con mayor puntuación (highscores).
   * 
   * @param world Mundo de Tibia (ej. 'Collabra')
   * @param category Categoría de ranking (ej. 'Experience Points')
   * @param profession Vocación (ej. 'Paladin' o 'All')
   * @param totalPages Número de páginas a obtener (default: 1)
   */
  static async getHighscores(world: string, category: string, profession: string, totalPages: number = 1): Promise<any[]> {

    // Map user-friendly category names to API slugs
    const categoryMap: { [key: string]: string } = {
        'Experience Points': 'experience',
        'Magic Level': 'magic',
        'Shielding': 'shielding',
        'Distance Fighting': 'distance',
        'Sword Fighting': 'sword',
        'Club Fighting': 'club',
        'Axe Fighting': 'axe',
        'Fist Fighting': 'fist',
        'Fishing': 'fishing',
        'Achievements': 'achievements',
        'Loyalty Points': 'loyalty'
    };

    // Map user-friendly vocation names to API slugs
    const vocationMap: { [key: string]: string } = {
        'None': 'none',
        'Knights': 'knight',
        'Paladins': 'paladin',
        'Sorcerers': 'sorcerer',
        'Druids': 'druid',
        'All': 'all'
    };
    
    // Helper for formatted numbers
    const formatNumber = (num: number): string => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const apiCategory = categoryMap[category] || category.toLowerCase().replace(/ /g, '');
    const apiProfession = vocationMap[profession] || profession.toLowerCase();

    const allHighscores: any[] = [];

    console.log(`[TibiaDataService] Iniciando fetch Highscores para World: ${world}, Category: ${apiCategory}, Profession: ${apiProfession}, Pages: ${totalPages}`);

    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        console.log(`--- Procesando Página ${currentPage} ---`);
        
        const url = `${this.BASE_URL}/highscores/${encodeURIComponent(world)}/${encodeURIComponent(apiCategory)}/${encodeURIComponent(apiProfession)}/${currentPage}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`[TibiaDataService] API Error: ${response.status} ${response.statusText} for URL: ${url}`);
                continue;
            }

            const data = await response.json() as any;
            const list = data.highscores?.highscore_list || [];

            if (list.length === 0) {
                console.log(`No más entradas encontradas en página ${currentPage}.`);
                break;
            }

            // Optional: Log individual characters if needed, but not for the return value
            list.forEach((char: any) => {
                console.log(`[Page ${currentPage}] Ranking: ${char.rank}, Nombre: ${char.name}, Points: ${formatNumber(char.value)}`);
            });

            allHighscores.push(...list);

            // Respect API rate limits (mild delay)
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`[TibiaDataService] Fallo al obtener página ${currentPage}:`, error);
        }
    }

    return allHighscores;
  }
}
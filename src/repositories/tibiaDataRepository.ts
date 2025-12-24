import { INewsRepository, IHouseRepository, ICharacterRepository } from '../interfaces/repositories';
import { NewsItem, HouseItem, CharacterData, NewsDetail } from '../interfaces/models';
import { TibiaDataService } from '../services/tibiaDataService';

export class TibiaDataRepository implements INewsRepository, IHouseRepository, ICharacterRepository {
  
  async getLatestNews(): Promise<NewsItem[] | null> {
    const data = await TibiaDataService.getLatestNews();
    if (!data || !data.news) return null;
    return data.news;
  }

  async getNews(id: number): Promise<NewsDetail | null> {
    const data = await TibiaDataService.getNews(id);
    if (!data || !data.news) return null;
    return {
        id: data.news.id,
        title: data.news.news || data.news.title, // 'news' seems to be the title in list, check if same in detail
        content: data.news.content,
        date: data.news.date,
        category: data.news.category,
        type: data.news.type,
        url: data.news.url
    } as NewsDetail;
  }

  async getHouses(world: string, town: string): Promise<HouseItem[] | null> {
    const data = await TibiaDataService.getHouses(world, town);
    if (!data || !data.houses || !data.houses.house_list) return null;
    
    // Map API specific structure to domain structure if needed, or pass through if identical
    // Given the previous code used keys directly from API, we can assume the structure matches largely,
    // but the use case did some enrichment (status). The repository should return raw data or enriched?
    // Use cases modify it (adding status). The repository should return the raw data closest to the model.
    // The model HouseItem has 'status' as optional.
    return data.houses.house_list;
  }

  async getCharacter(name: string): Promise<CharacterData | null> {
    const data = await TibiaDataService.getCharacter(name);
    if (!data || !data.character || !data.character.character) return null;

    const charInfo = data.character.character;
    const others = data.character.other_characters || [];
    
    // Buscar el estado online/offline en la lista de otros personajes
    // ya que la API v4 lo devuelve allí incluso para el personaje principal
    const selfEntry = others.find((c: any) => c.name === charInfo.name);
    if (selfEntry && selfEntry.status) {
        charInfo.status = selfEntry.status;
    }

    return {
      character: charInfo,
      deaths: data.character.deaths || [],
      other_characters: others
    };
  }
}

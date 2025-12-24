import { NewsItem, HouseItem, CharacterData } from './models';

export interface INewsRepository {
  getLatestNews(): Promise<NewsItem[] | null>;
  getNews(id: number): Promise<import('./models').NewsDetail | null>;
}

export interface IHouseRepository {
  getHouses(world: string, town: string): Promise<HouseItem[] | null>;
}

export interface ICharacterRepository {
  getCharacter(name: string): Promise<CharacterData | null>;
}

import { NewsItem, HouseItem, CharacterData } from './models';

export interface INewsRepository {
  getLatestNews(): Promise<NewsItem[] | null>;
}

export interface IHouseRepository {
  getHouses(world: string, town: string): Promise<HouseItem[] | null>;
}

export interface ICharacterRepository {
  getCharacter(name: string): Promise<CharacterData | null>;
}

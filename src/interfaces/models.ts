export interface NewsItem {
  id: number;
  date: string;
  news: string;
  category: string;
  type: string;
  url: string;
}

export interface HouseAuction {
  current_bid: number;
  time_left: string;
  finished: boolean;
}

export interface HouseItem {
  house_id: number;
  name: string;
  size: number;
  rent: number;
  rented: boolean;
  auctioned: boolean;
  town?: string;
  status?: string;
  auction?: HouseAuction;
}

export interface CharacterDeath {
  time: string;
  level: number;
  reason: string;
  involved?: any[];
}

export interface CharacterInfo {
  name: string;
  level: number;
  vocation?: string;
  world?: string;
  status?: string; // "online" | "offline"
}

export interface OtherCharacter {
  name: string;
  world: string;
  status: string;
  deleted: boolean;
  main: boolean;
}

export interface CharacterData {
  character: CharacterInfo;
  deaths: CharacterDeath[];
  other_characters?: OtherCharacter[];
}

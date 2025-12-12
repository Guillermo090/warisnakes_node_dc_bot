import { BotClient } from '../structures/BotClient';
import { TibiaDataService } from '../services/tibiaDataService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CheckTrackedCharactersUseCase {
  constructor(private client: BotClient) {}

  public async execute() {
    
  }
}
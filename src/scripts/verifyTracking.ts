import { PrismaClient } from '@prisma/client';
import { SchedulerService } from '../services/schedulerService';
import { BotClient } from '../structures/BotClient';

const prisma = new PrismaClient();

// Mock BotClient
const mockClient = {
  channels: {
    fetch: async (id: string) => {
        console.log(`[MockClient] Fetching channel ${id}`);
        return {
            send: async (content: any) => {
                console.log(`[MockChannel] Sending message:`, JSON.stringify(content, null, 2));
            },
            isTextBased: () => true
        };
    }
  },
  user: {
      avatarURL: () => 'http://example.com/avatar.png'
  }
} as unknown as BotClient;

async function run() {
  console.log('Starting verification...');

  // 1. Setup Test Data
  const guildId = 'test-guild-id';
  const channelId = 'test-channel-id';
  
  await prisma.guildConfig.upsert({
      where: { id: guildId },
      update: { trackerChannelId: channelId },
      create: { id: guildId, trackerChannelId: channelId }
  });

  // Clean previous test chars
  await prisma.trackedCharacter.deleteMany({
      where: { guildId: guildId }
  });

  // Add a character (Use a name that likely exists)
  const charName = 'Bobeek'; 
  await prisma.trackedCharacter.create({
      data: {
          name: charName,
          guildId: guildId,
          isEnemy: true,
          lastLevel: 100 // Set lower level to trigger Level Up
      }
  });

  console.log(`Added tracked character: ${charName}`);

  // 2. Run Scheduler
  const scheduler = new SchedulerService(mockClient);
  
  // Access private method using any cast or just run init if schedule was 1 min, but better to call method directly if possible or expose it.
  // Since it is private, I will access it via (scheduler as any).
  await (scheduler as any).checkTrackedCharacters();

  console.log('Verification finished.');
}

run()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

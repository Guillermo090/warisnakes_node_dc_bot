import GTCommand from '../../commands/team/gt';
import { BotClient } from '../../structures/BotClient';
import { Message } from 'discord.js';

function mockMessage(authorId: string, guildId?: string): Message {
  return {
    author: { id: authorId },
    guild: guildId ? { id: guildId } : undefined,
    channel: { id: 'channel1' },
    reply: jest.fn().mockResolvedValue({ id: 'msg1' }),
  } as any;
}

describe('GTCommand', () => {
  // beforeEach(() => {
  //   GTCommand.events = [];
  // });
 
});
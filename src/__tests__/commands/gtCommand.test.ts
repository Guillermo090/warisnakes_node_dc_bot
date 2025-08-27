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
  beforeEach(() => {
    GTCommand.events = [];
  });

  it('should create a new event', async () => {
    const cmd = new GTCommand();
    const client = {
      user: {
        avatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png')
      }
    } as any;
    const message = mockMessage('user1', 'guild1');
    await cmd.execute(client, message, ['19']);
    expect(GTCommand.events.length).toBe(1);
    expect(GTCommand.events[0].users).toContain('user1');
  });

  it('should add users up to 5 and prevent more', async () => {
    const cmd = new GTCommand();
    const client = {
      user: {
        avatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png')
      }
    } as any;
    const message = mockMessage('user1', 'guild1');
    await cmd.execute(client, message, ['19']);
    for (let i = 2; i <= 5; i++) {
      await cmd.execute(client, mockMessage(`user${i}`, 'guild1'), ['19']);
    }
    expect(GTCommand.events[0].users.length).toBe(5);
    // Intentar agregar el sexto usuario
    await cmd.execute(client, mockMessage('user6', 'guild1'), ['19']);
    expect(GTCommand.events[0].users.length).toBe(5);
  });

  it('should remove user with -19', async () => {
    const cmd = new GTCommand();
    const client = {
      user: {
        avatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png')
      }
    } as any;
    const message = mockMessage('user1', 'guild1');
    const message2 = mockMessage('user2', 'guild1');
    await cmd.execute(client, message, ['19']);
    await cmd.execute(client, message2, ['19']);
    await cmd.execute(client, message, ['-19']);
    expect(GTCommand.events[0]?.users.includes('user1')).toBe(false);
    expect(GTCommand.events[0]?.users.includes('user2')).toBe(true);
  });
});
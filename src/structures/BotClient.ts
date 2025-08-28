import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { config } from '../config';
import type { BaseCommand } from './BaseCommand';

export class BotClient extends Client {
  public commands: Collection<string, BaseCommand> = new Collection();
  public config = config;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
    });
  }

  private loadHandlers(): void {
    const handlersPath = path.join(__dirname, '..', 'handlers');
    const isProd = process.env.NODE_ENV === 'production';
    const ext = isProd ? '.js' : '.ts';
    const handlerFiles = readdirSync(handlersPath).filter(file => file.endsWith(ext));

    console.log('[BotClient] Handlers encontrados:', handlerFiles);

    for (const file of handlerFiles) {
      const fullPath = path.join(handlersPath, file);
      if(isProd){
        import(fullPath).then(handlerModule => {
          const handler = handlerModule.default;
          handler(this);
          console.log(`[BotClient] Handler cargado: ${file}`);
        });
      }else{
        import(pathToFileURL(fullPath).toString()).then(handlerModule => {
          const handler = handlerModule.default;
          handler(this);
          console.log(`[BotClient] Handler cargado: ${file}`);
        });
      }
    }
  }

  public start(): void {
    this.loadHandlers();
    this.login(process.env.DISCORD_TOKEN);
  }
}
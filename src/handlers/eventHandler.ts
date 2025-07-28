// src/handlers/eventHandler.ts

import { readdirSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url'; // <--- 1. Importar la función
import type { BotClient } from '../structures/BotClient';
import type { BaseEvent } from '../structures/BaseEvent';

interface EventConstructor {
  new(): BaseEvent;
}

export default (client: BotClient): void => {
  const eventsPath = path.join(__dirname, '..', 'events');

  readdirSync(eventsPath).forEach(dir => {
    const eventFiles = readdirSync(path.join(eventsPath, dir)).filter(file => file.endsWith('.ts'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, dir, file);
        const fileUrl = pathToFileURL(filePath).href; // <--- 2. Convertir la ruta a URL

        // 3. Usar la URL en el import
        import(fileUrl).then(eventModule => {
            const EventClass: EventConstructor = eventModule.default;
            const event = new EventClass();

            const listener = (...args: any[]) => event.execute(client, ...args);

            if (event.once) {
            client.once(event.name, listener);
            } else {
            client.on(event.name, listener);
            }
            console.log(`[Eventos] ✓ | ${event.name} cargado.`);
        });
    }
  });
};
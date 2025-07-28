// src/handlers/commandHandler.ts

import { readdirSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url'; // <--- 1. Importar la función
import type { BotClient } from '../structures/BotClient';
import type { BaseCommand } from '../structures/BaseCommand';

interface CommandConstructor {
  new(): BaseCommand;
}

export default (client: BotClient): void => {
  const commandsPath = path.join(__dirname, '..', 'commands');

  readdirSync(commandsPath).forEach(dir => {
    const commandFiles = readdirSync(path.join(commandsPath, dir)).filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, dir, file);
      const fileUrl = pathToFileURL(filePath).href; // <--- 2. Convertir la ruta a URL

      // 3. Usar la URL en el import
      import(fileUrl).then(commandModule => {
        const CommandClass: CommandConstructor = commandModule.default;
        const command = new CommandClass();

        if (command.name) {
          client.commands.set(command.name, command);
          console.log(`[Comandos] ✓ | ${command.name} cargado.`);
        } else {
          console.log(`[Comandos] ✗ | ${file} no pudo ser cargado.`);
        }
      });
    }
  });
};
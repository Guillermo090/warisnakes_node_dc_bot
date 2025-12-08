// src/handlers/commandHandler.ts

import { readdirSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { BotClient } from '../structures/BotClient';
import type { BaseCommand } from '../structures/BaseCommand';

export default (client: BotClient): void => {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const isProd = process.env.NODE_ENV === 'production';
  const ext = isProd ? '.js' : '.ts';

  const loadCommand = (commandFile: string, commandDir: string) => {
    const filePath = path.join(commandsPath, commandDir, commandFile);
    const fileUrl = isProd ? filePath : pathToFileURL(filePath).href;

    import(fileUrl).then(module => {
      let loadedCount = 0;
      
      // Get all exports from the module
      const exports = Object.values(module);

      for (const exportedItem of exports) {
        // Check if it's a class/function we can instantiate
        if (typeof exportedItem === 'function') {
          try {
            // Attempt to instantiate
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const command = new (exportedItem as any)();

            // Check if it looks like a valid command
            if (command.name && typeof command.execute === 'function') {
              client.commands.set(command.name, command);
              console.log(`[Comandos] ✓ | ${command.name} cargado.`);
              loadedCount++;
            }
          } catch (error) {
            // Ignore items that can't be instantiated or aren't commands
            // This is expected for helper functions or non-command exports
          }
        }
      }

      if (loadedCount === 0) {
        // Only log warning if no commands were found in the file, 
        // but suppress strict warning if it was simply a file with no valid exports (unlikely for command files)
        console.warn(`[Comandos] ⚠ | ${commandFile} cargado pero no se encontraron comandos válidos.`);
      }
    }).catch(error => {
      console.error(`[Comandos] ✗ | Error al cargar ${commandFile}:`, error);
    });
  };

  if (readdirSync(commandsPath).length > 0) {
      readdirSync(commandsPath).forEach(dir => {
        const dirPath = path.join(commandsPath, dir);
        // Ensure it is a directory
        if(require('fs').statSync(dirPath).isDirectory()){
            const commandFiles = readdirSync(dirPath).filter(file => file.endsWith(ext));
            for (const file of commandFiles) {
                loadCommand(file, dir);
            }
        }
      });
  }
};

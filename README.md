# warisnakes_node_dc_bot

Bot de Discord para gestión de eventos y utilidades, desarrollado en TypeScript.

## Estructura del proyecto

```
src/
  commands/
    team/
      gt.ts
    utility/
      ping.ts
  events/
    client/
      ready.ts
    guild/
      messageCreate.ts
  handlers/
    commandHandler.ts
    eventHandler.ts
  structures/
    BotClient.ts
    BaseCommand.ts
    BaseEvent.ts
  config.ts
  index.ts
.env
.env.example
package.json
tsconfig.json
```

## Instalación

1. Clona el repositorio y entra en la carpeta.
2. Instala dependencias:
   ```sh
   npm install
   ```
3. Copia `.env.example` a `.env` y pon tu token de Discord:
   ```
   DISCORD_TOKEN=tu_token_aqui
   NODE_ENV=development
   ```

## Scripts útiles

- **Desarrollo:**  
  ```sh
  npm run dev
  ```
  Usa `tsx` para recarga automática.

- **Compilar:**  
  ```sh
  npm run build
  ```
  Genera los archivos `.js` en `dist/`.

- **Producción:**  
  ```sh
  npm start
  ```
  Ejecuta el bot desde los archivos compilados.

## Uso de PM2 en producción

pm2 es un gestor de procesos para Node.js que te permite ejecutar, reiniciar y monitorear tu bot fácilmente en producción.

### Pasos para usar pm2:

1. Instala pm2 globalmente:
   ```sh
   npm install -g pm2
   ```

2. Compila tu proyecto (si usas TypeScript):
   ```sh
   npm run build
   ```

3. Inicia tu bot con pm2:
   ```sh
   pm2 start dist/index.js --name "warisnakes-bot"
   ```

4. Verifica el estado:
   ```sh
   pm2 status
   ```

5. Reinicia el bot si cambias el código:
   ```sh
   pm2 restart warisnakes-bot
   ```

6. Detén el bot:
   ```sh
   pm2 stop warisnakes-bot
   ```

7. Haz que pm2 arranque tu bot automáticamente si el servidor se reinicia:
   ```sh
   pm2 startup
   pm2 save
   ```

### Ventajas

- El bot se reinicia si falla.
- Puedes ver logs con:
  ```sh
  pm2 logs warisnakes-bot
  ```
- Fácil administración de múltiples bots/procesos.

### Ver logs de error y salida

```sh
tail -n 50 /root/.pm2/logs/warisnakes-bot-out.log
tail -n 50 /root/.pm2/logs/warisnakes-bot-error.log
```

## Comandos disponibles

- `!ping` — Muestra la latencia del bot y la API.
- `!gt <hora>` — Crea o únete a un evento GT para una hora específica (ejemplo: `!gt 19:30`).

## Estructura de comandos y eventos

- Los comandos están en `src/commands/`.
- Los eventos están en `src/events/`.
- Los handlers cargan dinámicamente los comandos y eventos según el entorno (`.ts` en desarrollo, `.js` en producción).

## Notas

- Asegúrate de compilar antes de ejecutar en producción (`npm run build`).
- Revisa que tu archivo `.env` tenga el token correcto y el entorno adecuado.
- Si el bot no responde en producción, verifica que los archivos `.js` existan en `dist/` y que los handlers los estén cargando correctamente.

---
MIT License © Guillermo Royo
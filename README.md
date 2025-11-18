# warisnakes_node_dc_bot

Bot de Discord para gestión de eventos y utilidades, desarrollado en TypeScript.

## Estructura del proyecto

```
src/
  commands/
    team/
      gt.ts
      gg.ts
      daily.ts
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
  services/
    databaseService.ts
    staticDataService.ts
  structures/
    BotClient.ts
    BaseCommand.ts
    BaseEvent.ts
  config.ts
  index.ts
prisma/
  schema.prisma
  migrations/
  dev.db
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
   DATABASE_URL="file:./dev.db"
   ```
4. Genera el cliente de Prisma:
   ```sh
   npx prisma generate
   ```
5. Ejecuta las migraciones:
   ```sh
   npx prisma migrate dev
   ```

## Base de Datos con Prisma

Este proyecto usa **Prisma** como ORM con **SQLite** para persistencia de datos.

### Archivos importantes

- **`prisma/schema.prisma`**: Define los modelos de la base de datos.
- **`prisma/dev.db`**: Archivo SQLite con los datos (ignorado en `.gitignore`).
- **`src/services/databaseService.ts`**: Servicio para operaciones con la BD.

### Modelos actuales

#### Accident (Accidentes)
Registra los "accidentes" del comando `!gg`:
- `id`: Identificador único (autoincremental)
- `date`: Fecha y hora del accidente
- `detail`: Descripción del accidente
- `createdAt`: Fecha de creación del registro

### Comandos útiles de Prisma

#### Ver y explorar la base de datos
```sh
npx prisma studio
```
Abre una interfaz web en `http://localhost:5555` para ver y editar datos.

#### Crear una nueva migración
Después de modificar [`prisma/schema.prisma`](prisma/schema.prisma):
```sh
npx prisma migrate dev --name nombre_descriptivo
```

#### Regenerar el cliente de Prisma
Si cambias el schema o sincronizas el proyecto:
```sh
npx prisma generate
```

#### Aplicar migraciones en producción
```sh
npx prisma migrate deploy
```

#### Resetear la base de datos (CUIDADO: borra todos los datos)
```sh
npx prisma migrate reset
```

### Agregar un nuevo modelo

1. Edita [`prisma/schema.prisma`](prisma/schema.prisma):
   ```prisma
   model NuevoModelo {
     id        Int      @id @default(autoincrement())
     campo     String
     createdAt DateTime @default(now())
   }
   ```

2. Crea la migración:
   ```sh
   npx prisma migrate dev --name add_nuevo_modelo
   ```

3. Usa el modelo en [`databaseService.ts`](src/services/databaseService.ts):
   ```typescript
   static async createNuevoModelo(campo: string) {
     return await this.prisma.nuevoModelo.create({
       data: { campo },
     });
   }
   ```

### Variables de entorno

En [`.env`](.env):
```env
DATABASE_URL="file:./dev.db"
```

Para producción, puedes cambiar a PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

Y actualizar el [`schema.prisma`](prisma/schema.prisma):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
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

3. **Ejecuta las migraciones de Prisma en producción:**
   ```sh
   npx prisma migrate deploy
   npx prisma generate
   ```

4. Inicia tu bot con pm2:
   ```sh
   pm2 start dist/index.js --name "warisnakes-bot"
   ```

5. Verifica el estado:
   ```sh
   pm2 status
   ```

6. Reinicia el bot si cambias el código:
   ```sh
   npm run build
   npx prisma generate
   pm2 restart warisnakes-bot
   ```

7. Detén el bot:
   ```sh
   pm2 stop warisnakes-bot
   ```

8. Haz que pm2 arranque tu bot automáticamente si el servidor se reinicia:
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
- `!info` — Lista todos los comandos disponibles.
- `!gt <hora>` — Crea o únete a un evento GT para una hora específica (ejemplo: `!gt 19:30`).
- `!evento <hora> <nombre>` — Crea un evento personalizado.
- `!gg [detalle]` — Registra un "accidente" y reinicia el contador.
- `!daily <hora>` — Configura una notificación diaria (solo admins).
- `!rashid` — Muestra dónde está Rashid hoy.
- `!drome` — Muestra el tiempo restante para el siguiente Drome.
- `!timer <minutos> [descripción]` — Establece un temporizador.

## Estructura de comandos y eventos

- Los comandos están en [`src/commands/`](src/commands/).
- Los eventos están en [`src/events/`](src/events/).
- Los servicios están en [`src/services/`](src/services/).
- Los handlers cargan dinámicamente los comandos y eventos según el entorno (`.ts` en desarrollo, `.js` en producción).

## Notas importantes

- Asegúrate de compilar antes de ejecutar en producción (`npm run build`).
- Revisa que tu archivo [`.env`](.env) tenga el token correcto y el entorno adecuado.
- **No olvides ejecutar `npx prisma generate` después de clonar o actualizar el proyecto.**
- La base de datos SQLite (`prisma/dev.db`) está en `.gitignore` y no se sube al repositorio.
- Si usas PostgreSQL en producción, asegúrate de cambiar el provider en [`schema.prisma`](prisma/schema.prisma) y la URL en `.env`.

## Migración de datos entre ambientes

Si necesitas mover datos de desarrollo a producción:

1. Exporta los datos:
   ```sh
   sqlite3 prisma/dev.db .dump > backup.sql
   ```

2. En producción, importa los datos:
   ```sh
   sqlite3 prisma/dev.db < backup.sql
   ```

O usa herramientas como [prisma-db-seed](https://www.prisma.io/docs/guides/database/seed-database).

---
MIT License © Guillermo Royo
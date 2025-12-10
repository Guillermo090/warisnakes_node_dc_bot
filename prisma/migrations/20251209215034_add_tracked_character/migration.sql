-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN "trackerChannelId" TEXT;

-- CreateTable
CREATE TABLE "TrackedCharacter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "isEnemy" BOOLEAN NOT NULL,
    "lastLevel" INTEGER,
    "isOnline" BOOLEAN,
    "lastDeath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

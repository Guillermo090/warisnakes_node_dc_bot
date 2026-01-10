-- CreateTable
CREATE TABLE "CharacterSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackedCharacterId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "experience" BIGINT NOT NULL,
    "level" INTEGER NOT NULL,
    CONSTRAINT "CharacterSnapshot_trackedCharacterId_fkey" FOREIGN KEY ("trackedCharacterId") REFERENCES "TrackedCharacter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "honours" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "competitionId" TEXT,
    "competitionName" TEXT,
    "clubId" TEXT,
    "clubName" TEXT,
    "playerId" TEXT,
    "playerName" TEXT,
    "detail" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "honours_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "honours_saveGameId_type_idx" ON "honours"("saveGameId", "type");

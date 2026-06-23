-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reputation" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "save_games" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "currentDate" DATETIME NOT NULL,
    "playerPersonId" TEXT,
    "simulationVersion" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastPlayedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "nationalityId" TEXT NOT NULL,
    "secondaryNationalityId" TEXT,
    "personType" TEXT NOT NULL,
    "personalityProfile" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "persons_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personId" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "clubId" TEXT,
    "primaryPosition" TEXT NOT NULL,
    "secondaryPositions" JSONB NOT NULL,
    "preferredFoot" TEXT NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "weightKg" REAL NOT NULL,
    "currentAbility" REAL NOT NULL,
    "potentialAbility" REAL NOT NULL,
    "reputation" INTEGER NOT NULL,
    "popularity" INTEGER NOT NULL,
    "marketValue" INTEGER NOT NULL,
    "condition" REAL NOT NULL,
    "fatigue" REAL NOT NULL,
    "morale" REAL NOT NULL,
    "form" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "motivation" REAL NOT NULL,
    "stress" REAL NOT NULL,
    "happiness" REAL NOT NULL,
    "mentalHealth" REAL NOT NULL,
    "careerStatus" TEXT NOT NULL,
    "retirementDate" DATETIME,
    CONSTRAINT "players_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "players_personId_fkey" FOREIGN KEY ("personId") REFERENCES "persons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "players_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_attributes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_attributes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "staticClubKey" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "competitionId" TEXT,
    "reputation" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "wageBudget" INTEGER NOT NULL,
    "transferBudget" INTEGER NOT NULL,
    "academyQuality" INTEGER NOT NULL,
    "trainingQuality" INTEGER NOT NULL,
    "medicalQuality" INTEGER NOT NULL,
    "scoutingQuality" INTEGER NOT NULL,
    "pressureLevel" INTEGER NOT NULL,
    "philosophy" JSONB NOT NULL,
    CONSTRAINT "clubs_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "clubs_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "weeklyWage" INTEGER NOT NULL,
    "signingBonus" INTEGER NOT NULL,
    "appearanceBonus" INTEGER NOT NULL,
    "goalBonus" INTEGER NOT NULL,
    "releaseClause" INTEGER,
    "squadRole" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contracts_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contracts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contracts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT,
    "type" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "reputation" INTEGER NOT NULL,
    "seasonStart" DATETIME NOT NULL,
    "seasonEnd" DATETIME NOT NULL,
    "rules" JSONB NOT NULL,
    CONSTRAINT "competitions_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "seasons_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seasons_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fixtures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "homeClubId" TEXT NOT NULL,
    "awayClubId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "importance" REAL NOT NULL,
    "weather" JSONB,
    "simulationData" JSONB,
    CONSTRAINT "fixtures_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fixtures_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fixtures_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fixtures_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "match_appearances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "started" BOOLEAN NOT NULL,
    "minutesPlayed" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "goals" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "yellowCards" INTEGER NOT NULL,
    "redCards" INTEGER NOT NULL,
    "statistics" JSONB NOT NULL,
    CONSTRAINT "match_appearances_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "fixtures" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "match_appearances_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "match_appearances_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "standings_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "injuries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "injuryTypeKey" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "expectedEndAt" DATETIME NOT NULL,
    "actualEndAt" DATETIME,
    "severity" INTEGER NOT NULL,
    "recurrenceRisk" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "treatmentChoice" TEXT,
    "attributeImpact" JSONB,
    CONSTRAINT "injuries_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "injuries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "sourcePersonId" TEXT NOT NULL,
    "targetPersonId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "affinity" INTEGER NOT NULL,
    "trust" INTEGER NOT NULL,
    "conflict" INTEGER NOT NULL,
    "influence" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "metadata" JSONB,
    CONSTRAINT "relationships_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "relationships_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "persons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "relationships_targetPersonId_fkey" FOREIGN KEY ("targetPersonId") REFERENCES "persons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "definitionKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "selectedChoiceKey" TEXT,
    "subjects" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "chainId" TEXT,
    CONSTRAINT "game_events_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_cooldowns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "definitionKey" TEXT NOT NULL,
    "lastOccurredAt" DATETIME NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
    "nextEligibleAt" DATETIME NOT NULL,
    CONSTRAINT "event_cooldowns_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transfer_offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromClubId" TEXT NOT NULL,
    "toClubId" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "offeredWage" INTEGER NOT NULL,
    "contractYears" INTEGER NOT NULL,
    "squadRole" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "transfer_offers_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transfer_offers_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transfer_offers_fromClubId_fkey" FOREIGN KEY ("fromClubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transfer_offers_toClubId_fkey" FOREIGN KEY ("toClubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    CONSTRAINT "financial_transactions_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "financial_transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_season_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "starts" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "averageRating" REAL NOT NULL DEFAULT 0,
    "cleanSheets" INTEGER NOT NULL DEFAULT 0,
    "aggregateStats" JSONB NOT NULL,
    CONSTRAINT "player_season_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "player_season_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "player_season_stats_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "decision_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "decisionType" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "consequences" JSONB NOT NULL,
    CONSTRAINT "decision_logs_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "decision_logs_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "simulation_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saveGameId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "system" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    CONSTRAINT "simulation_logs_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "save_games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "save_games_lastPlayedAt_idx" ON "save_games"("lastPlayedAt");

-- CreateIndex
CREATE INDEX "save_games_playerPersonId_idx" ON "save_games"("playerPersonId");

-- CreateIndex
CREATE INDEX "persons_saveGameId_personType_idx" ON "persons"("saveGameId", "personType");

-- CreateIndex
CREATE INDEX "persons_saveGameId_birthDate_idx" ON "persons"("saveGameId", "birthDate");

-- CreateIndex
CREATE UNIQUE INDEX "players_personId_key" ON "players"("personId");

-- CreateIndex
CREATE INDEX "players_saveGameId_idx" ON "players"("saveGameId");

-- CreateIndex
CREATE INDEX "players_clubId_idx" ON "players"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "player_attributes_playerId_attributeKey_key" ON "player_attributes"("playerId", "attributeKey");

-- CreateIndex
CREATE INDEX "clubs_saveGameId_idx" ON "clubs"("saveGameId");

-- CreateIndex
CREATE INDEX "clubs_competitionId_idx" ON "clubs"("competitionId");

-- CreateIndex
CREATE INDEX "contracts_playerId_status_idx" ON "contracts"("playerId", "status");

-- CreateIndex
CREATE INDEX "contracts_clubId_endDate_idx" ON "contracts"("clubId", "endDate");

-- CreateIndex
CREATE INDEX "competitions_saveGameId_idx" ON "competitions"("saveGameId");

-- CreateIndex
CREATE INDEX "seasons_saveGameId_idx" ON "seasons"("saveGameId");

-- CreateIndex
CREATE INDEX "seasons_competitionId_idx" ON "seasons"("competitionId");

-- CreateIndex
CREATE INDEX "fixtures_scheduledAt_idx" ON "fixtures"("scheduledAt");

-- CreateIndex
CREATE INDEX "fixtures_seasonId_status_idx" ON "fixtures"("seasonId", "status");

-- CreateIndex
CREATE INDEX "fixtures_homeClubId_scheduledAt_idx" ON "fixtures"("homeClubId", "scheduledAt");

-- CreateIndex
CREATE INDEX "fixtures_awayClubId_scheduledAt_idx" ON "fixtures"("awayClubId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "match_appearances_fixtureId_playerId_key" ON "match_appearances"("fixtureId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "standings_seasonId_clubId_key" ON "standings"("seasonId", "clubId");

-- CreateIndex
CREATE INDEX "injuries_saveGameId_idx" ON "injuries"("saveGameId");

-- CreateIndex
CREATE INDEX "injuries_playerId_status_idx" ON "injuries"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_saveGameId_sourcePersonId_targetPersonId_relationshipType_key" ON "relationships"("saveGameId", "sourcePersonId", "targetPersonId", "relationshipType");

-- CreateIndex
CREATE INDEX "game_events_saveGameId_status_idx" ON "game_events"("saveGameId", "status");

-- CreateIndex
CREATE INDEX "game_events_saveGameId_occurredAt_idx" ON "game_events"("saveGameId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_cooldowns_saveGameId_definitionKey_key" ON "event_cooldowns"("saveGameId", "definitionKey");

-- CreateIndex
CREATE INDEX "transfer_offers_saveGameId_status_idx" ON "transfer_offers"("saveGameId", "status");

-- CreateIndex
CREATE INDEX "transfer_offers_playerId_idx" ON "transfer_offers"("playerId");

-- CreateIndex
CREATE INDEX "financial_transactions_saveGameId_idx" ON "financial_transactions"("saveGameId");

-- CreateIndex
CREATE INDEX "financial_transactions_playerId_occurredAt_idx" ON "financial_transactions"("playerId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "player_season_stats_playerId_seasonId_clubId_key" ON "player_season_stats"("playerId", "seasonId", "clubId");

-- CreateIndex
CREATE INDEX "decision_logs_saveGameId_idx" ON "decision_logs"("saveGameId");

-- CreateIndex
CREATE INDEX "decision_logs_playerId_occurredAt_idx" ON "decision_logs"("playerId", "occurredAt");

-- CreateIndex
CREATE INDEX "simulation_logs_saveGameId_occurredAt_idx" ON "simulation_logs"("saveGameId", "occurredAt");

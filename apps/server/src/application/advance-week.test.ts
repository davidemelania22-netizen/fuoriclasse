import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TrainingIntensity, type NewGameInput } from '@football-life/shared';
import { DEFAULT_PROGRESSION_CONFIG } from '@football-life/game-data';
import { PrismaProgressionRepository } from '../repositories/prisma-progression-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { advanceWeeks } from './advance-week';
import { createNewGame } from './create-new-game';

const DAY_MS = 86_400_000;

const newGame: NewGameInput = {
  name: 'Progression Test',
  player: {
    firstName: 'Youth',
    lastName: 'Prospect',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('advanceWeeks', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('raises ability, advances the date and persists changed attributes', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const progressionRepo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const startDate = new Date(game.save.currentDate);

    const report = await advanceWeeks(
      { repository: progressionRepo, config: DEFAULT_PROGRESSION_CONFIG },
      {
        saveGameId: game.save.id,
        weeks: 20,
        intensity: TrainingIntensity.Normal,
      },
    );

    expect(report).not.toBeNull();
    expect(report?.weeksAdvanced).toBe(20);
    expect(report?.abilityAfter).toBeGreaterThan(report?.abilityBefore ?? 0);

    const save = await db.prisma.saveGame.findUnique({
      where: { id: game.save.id },
    });
    const elapsedDays =
      (save!.currentDate.getTime() - startDate.getTime()) / DAY_MS;
    expect(elapsedDays).toBe(140); // 20 weeks * 7 days

    const player = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    expect(player!.currentAbility).toBeGreaterThan(game.player.currentAbility);
    expect(player!.currentAbility).toBeLessThanOrEqual(
      game.player.potentialAbility,
    );

    // A trained attribute moved above its baseline of 25.
    const finishing = await db.prisma.playerAttribute.findUnique({
      where: {
        playerId_attributeKey: {
          playerId: game.player.id,
          attributeKey: 'finishing',
        },
      },
    });
    expect(finishing!.value).toBeGreaterThan(25);
  });

  it('detects a season rollover and advances the age', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const progressionRepo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    expect(game.player.ageYears).toBe(14);

    const report = await advanceWeeks(
      { repository: progressionRepo, config: DEFAULT_PROGRESSION_CONFIG },
      {
        saveGameId: game.save.id,
        weeks: 60,
        intensity: TrainingIntensity.Light,
      },
    );

    expect(report?.seasonsCrossed).toBeGreaterThanOrEqual(1);
    expect(report?.ageAfter).toBe(15);
    expect(report?.fatigue).toBeGreaterThanOrEqual(0);
    expect(report?.fatigue).toBeLessThanOrEqual(100);
  });

  it('returns null for an unknown save', async () => {
    const progressionRepo = new PrismaProgressionRepository(db.prisma);
    const report = await advanceWeeks(
      { repository: progressionRepo, config: DEFAULT_PROGRESSION_CONFIG },
      { saveGameId: 'nope', weeks: 1 },
    );
    expect(report).toBeNull();
  });
});

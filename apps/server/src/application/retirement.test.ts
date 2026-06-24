import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TrainingIntensity, type NewGameInput } from '@football-life/shared';
import {
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_RETIREMENT_CONFIG,
  DEFAULT_WELLBEING_CONFIG,
  INJURY_TYPES,
} from '@football-life/game-data';
import { PrismaProgressionRepository } from '../repositories/prisma-progression-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { advanceWeeks } from './advance-week';
import { createNewGame } from './create-new-game';

const newGame: NewGameInput = {
  name: 'Whole Career',
  player: {
    firstName: 'Life',
    lastName: 'Long',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('playing a career through to retirement', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('reaches retirement by age 42 and completes the save', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const report = await advanceWeeks(
      {
        repository: repo,
        config: DEFAULT_PROGRESSION_CONFIG,
        wellbeingConfig: DEFAULT_WELLBEING_CONFIG,
        retirementConfig: DEFAULT_RETIREMENT_CONFIG,
        injuryTypeKeys: INJURY_TYPES.map((t) => t.key),
      },
      {
        saveGameId: game.save.id,
        weeks: 1600,
        intensity: TrainingIntensity.Normal,
      },
    );

    expect(report?.retired).toBe(true);
    expect(report?.ageAfter).toBeGreaterThanOrEqual(31);
    expect(report?.ageAfter).toBeLessThanOrEqual(42);

    const player = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    expect(player?.careerStatus).toBe('RETIRED');
    expect(player?.retirementDate).not.toBeNull();

    const save = await db.prisma.saveGame.findUnique({
      where: { id: game.save.id },
    });
    expect(save?.isCompleted).toBe(true);
  });
});

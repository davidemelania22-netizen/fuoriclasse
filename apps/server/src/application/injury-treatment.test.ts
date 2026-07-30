import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TrainingIntensity, type NewGameInput } from '@football-life/shared';
import {
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_WELLBEING_CONFIG,
  INJURY_TYPES,
} from '@football-life/game-data';
import { PrismaProgressionRepository } from '../repositories/prisma-progression-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { advanceWeeks } from './advance-week';
import { createNewGame } from './create-new-game';
import { chooseInjuryTreatment } from './injury-treatment';

const injuryTypeKeys = INJURY_TYPES.map((type) => type.key);

const forceInjuryWellbeing = {
  ...DEFAULT_WELLBEING_CONFIG,
  injury: {
    ...DEFAULT_WELLBEING_CONFIG.injury,
    weeklyBaseProbability: 3,
    maxWeeklyProbability: 1,
    severityBands: [{ severity: 2, weight: 100, minWeeks: 8, maxWeeks: 8 }],
  },
};

const newGame: NewGameInput = {
  name: 'Injury Treatment Test',
  player: {
    firstName: 'Fragile',
    lastName: 'Talent',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

async function forceInjury(
  repo: PrismaProgressionRepository,
  saveGameId: string,
) {
  let injured = false;
  for (let attempt = 0; attempt < 10 && !injured; attempt += 1) {
    const report = await advanceWeeks(
      {
        repository: repo,
        config: DEFAULT_PROGRESSION_CONFIG,
        wellbeingConfig: forceInjuryWellbeing,
        injuryTypeKeys,
      },
      { saveGameId, weeks: 1, intensity: TrainingIntensity.Intense },
    );
    injured = report?.injured ?? false;
  }
  if (!injured) throw new Error('failed to force an injury for the test');
}

describe('chooseInjuryTreatment', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('returns null when there is no active injury', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const result = await chooseInjuryTreatment(
      { repository: repo, wellbeingConfig: DEFAULT_WELLBEING_CONFIG },
      { saveGameId: game.save.id, choice: 'REST' },
    );
    expect(result).toBeNull();
  });

  it('shortens recovery and raises recurrence risk on RUSH, persisted to the injury row', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    await forceInjury(repo, game.save.id);

    const before = await db.prisma.injury.findFirstOrThrow({
      where: { playerId: game.player.id, status: 'ACTIVE' },
    });

    const result = await chooseInjuryTreatment(
      { repository: repo, wellbeingConfig: DEFAULT_WELLBEING_CONFIG },
      { saveGameId: game.save.id, choice: 'RUSH' },
    );
    expect(result).not.toBeNull();
    expect(result!.weeksRemaining).toBeLessThan(8);
    expect(result!.recurrenceRisk).toBeGreaterThan(before.recurrenceRisk);

    const after = await db.prisma.injury.findUniqueOrThrow({
      where: { id: before.id },
    });
    expect(after.treatmentChoice).toBe('RUSH');
    expect(after.recurrenceRisk).toBeCloseTo(result!.recurrenceRisk);
    expect(after.expectedEndAt.getTime()).toBeLessThan(
      before.expectedEndAt.getTime(),
    );
  });

  it('refuses a second treatment choice on the same injury', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    await forceInjury(repo, game.save.id);

    const first = await chooseInjuryTreatment(
      { repository: repo, wellbeingConfig: DEFAULT_WELLBEING_CONFIG },
      { saveGameId: game.save.id, choice: 'REST' },
    );
    expect(first).not.toBeNull();

    const second = await chooseInjuryTreatment(
      { repository: repo, wellbeingConfig: DEFAULT_WELLBEING_CONFIG },
      { saveGameId: game.save.id, choice: 'RUSH' },
    );
    expect(second).toBeNull();
  });
});

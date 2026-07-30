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

const injuryTypeKeys = INJURY_TYPES.map((type) => type.key);

// Near-certain injuries, for deterministic availability testing.
const highInjuryWellbeing = {
  ...DEFAULT_WELLBEING_CONFIG,
  injury: {
    ...DEFAULT_WELLBEING_CONFIG.injury,
    weeklyBaseProbability: 3,
    maxWeeklyProbability: 1,
  },
};
const noInjuryWellbeing = {
  ...DEFAULT_WELLBEING_CONFIG,
  injury: { ...DEFAULT_WELLBEING_CONFIG.injury, weeklyBaseProbability: 0 },
};

// Forces a one-week injury with a guaranteed high recurrenceRisk, so a
// relapse can be provoked afterwards without waiting on the normal odds.
const forceQuickInjuryWellbeing = {
  ...DEFAULT_WELLBEING_CONFIG,
  injury: {
    ...DEFAULT_WELLBEING_CONFIG.injury,
    weeklyBaseProbability: 3,
    maxWeeklyProbability: 1,
    severityBands: [{ severity: 1, weight: 100, minWeeks: 1, maxWeeks: 1 }],
    recurrenceBase: 10,
    recurrenceWindowWeeks: 10,
  },
};
// No fresh injuries, so only a relapse of a previously healed injury can occur.
const relapseOnlyWellbeing = {
  ...DEFAULT_WELLBEING_CONFIG,
  injury: {
    ...DEFAULT_WELLBEING_CONFIG.injury,
    weeklyBaseProbability: 0,
    recurrenceWindowWeeks: 10,
  },
};

const newGame: NewGameInput = {
  name: 'Injury Test',
  player: {
    firstName: 'Fragile',
    lastName: 'Talent',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('injuries and wellbeing in the weekly loop', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('sustains an injury under heavy load and raises stress', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const report = await advanceWeeks(
      {
        repository: repo,
        config: DEFAULT_PROGRESSION_CONFIG,
        wellbeingConfig: highInjuryWellbeing,
        injuryTypeKeys,
      },
      {
        saveGameId: game.save.id,
        weeks: 6,
        intensity: TrainingIntensity.Intense,
      },
    );

    expect(report?.injuriesSustained).toBeGreaterThanOrEqual(1);

    const injuries = await db.prisma.injury.count({
      where: { playerId: game.player.id },
    });
    expect(injuries).toBeGreaterThanOrEqual(1);

    const player = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    expect(player?.stress).toBeGreaterThan(20); // baseline stress
  });

  it('recovers from injury and restores availability', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    // Force an injury, advancing a week at a time until one strikes (so the
    // player is genuinely injured — not already recovered — at the check).
    let injured = false;
    for (let attempt = 0; attempt < 25 && !injured; attempt += 1) {
      const report = await advanceWeeks(
        {
          repository: repo,
          config: DEFAULT_PROGRESSION_CONFIG,
          wellbeingConfig: highInjuryWellbeing,
          injuryTypeKeys,
        },
        {
          saveGameId: game.save.id,
          weeks: 1,
          intensity: TrainingIntensity.Intense,
        },
      );
      injured = report?.injured ?? false;
    }
    expect(injured).toBe(true);

    const injuredPlayer = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    expect(injuredPlayer?.careerStatus).toBe('INJURED');

    // Recover fully (no new injuries).
    const recovery = await advanceWeeks(
      {
        repository: repo,
        config: DEFAULT_PROGRESSION_CONFIG,
        wellbeingConfig: noInjuryWellbeing,
        injuryTypeKeys,
      },
      {
        saveGameId: game.save.id,
        weeks: 40,
        intensity: TrainingIntensity.Light,
      },
    );

    expect(recovery?.injured).toBe(false);

    const activeInjuries = await db.prisma.injury.count({
      where: {
        playerId: game.player.id,
        status: { in: ['ACTIVE', 'RECOVERING'] },
      },
    });
    expect(activeInjuries).toBe(0);

    const recoveredPlayer = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    expect(recoveredPlayer?.careerStatus).not.toBe('INJURED');
  });

  it('relapses into the same injury type within the recurrence window', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaProgressionRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    // Advance a week at a time until a one-week injury has come and gone,
    // independent of the (random) save seed.
    let healed = null;
    for (let attempt = 0; attempt < 20 && !healed; attempt += 1) {
      await advanceWeeks(
        {
          repository: repo,
          config: DEFAULT_PROGRESSION_CONFIG,
          wellbeingConfig: forceQuickInjuryWellbeing,
          injuryTypeKeys,
        },
        {
          saveGameId: game.save.id,
          weeks: 1,
          intensity: TrainingIntensity.Intense,
        },
      );
      healed = await db.prisma.injury.findFirst({
        where: { playerId: game.player.id, status: 'HEALED' },
      });
    }
    expect(healed).not.toBeNull();
    const originalTypeKey = healed!.injuryTypeKey;

    let relapsed = false;
    for (let attempt = 0; attempt < 10 && !relapsed; attempt += 1) {
      const report = await advanceWeeks(
        {
          repository: repo,
          config: DEFAULT_PROGRESSION_CONFIG,
          wellbeingConfig: relapseOnlyWellbeing,
          injuryTypeKeys,
        },
        { saveGameId: game.save.id, weeks: 1 },
      );
      relapsed = report?.injuryRelapse ?? false;
    }
    expect(relapsed).toBe(true);

    const relapseInjury = await db.prisma.injury.findFirst({
      where: {
        playerId: game.player.id,
        status: { in: ['ACTIVE', 'RECOVERING'] },
      },
    });
    expect(relapseInjury?.injuryTypeKey).toBe(originalTypeKey);
  });
});

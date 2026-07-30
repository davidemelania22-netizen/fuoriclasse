import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaTacticsRepository } from '../repositories/prisma-tactics-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { getTactics, setInstructions } from './tactics';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 2,
  clubsPerSecondDivision: 0,
  rosterSize: 14,
  age: { min: 16, max: 36, mean: 24, spread: 4 },
  ability: {
    topDivisionMean: 60,
    divisionStep: 12,
    spread: 9,
    min: 20,
    max: 95,
  },
  reputation: { topDivision: 3000, secondDivision: 1200, youth: 400 },
  namePools: {
    IT: {
      firstNames: ['Marco', 'Luca', 'Matteo', 'Andrea', 'Davide'],
      lastNames: ['Rossi', 'Bianchi', 'Esposito', 'Romano', 'Colombo'],
      cities: ['Milano', 'Torino', 'Roma', 'Napoli', 'Firenze'],
    },
  },
};

const newGame: NewGameInput = {
  name: 'Tactics Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('tactics screen', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('builds the depth chart, ranks the protagonist and persists instructions', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    await generateAndPersistWorld(
      { worldRepository: worldRepo },
      {
        saveGameId: game.save.id,
        seed: game.save.seed,
        countries,
        config: worldConfig,
      },
    );

    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    // Make the protagonist clearly the best forward — must top the FW chart.
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: {
        clubId: club.id,
        careerStatus: 'ACTIVE',
        currentAbility: 95,
        form: 90,
        condition: 100,
      },
    });

    const deps = {
      tactics: new PrismaTacticsRepository(db.prisma),
      profile: new PrismaProfileRepository(db.prisma),
      matchConfig: DEFAULT_MATCH_CONFIG,
    };

    const view = await getTactics(deps, game.save.id);
    expect(view).not.toBeNull();
    expect(view!.clubName).toBe(club.name);
    expect(view!.formationLabel.split('-').length).toBeGreaterThanOrEqual(3);

    // Every squad member appears exactly once across the groups.
    const totalRows = view!.depthChart.reduce((s, g) => s + g.rows.length, 0);
    const squadSize = await db.prisma.player.count({
      where: { clubId: club.id },
    });
    expect(totalRows).toBe(squadSize);

    const fwGroup = view!.depthChart.find((g) => g.position === 'FW')!;
    const you = fwGroup.rows.find((r) => r.isProtagonist)!;
    expect(you.rank).toBe(1); // strongest forward tops the pecking order
    expect(you.projectedStarter).toBe(true);
    // Ranks are consecutive and scores non-increasing among available players.
    for (let i = 1; i < fwGroup.rows.length; i += 1) {
      expect(fwGroup.rows[i]!.rank).toBe(i + 1);
    }

    // Defaults, then persist new instructions and read them back.
    expect(view!.instructions).toEqual({
      style: 'BALANCED',
      temperament: 'COMPOSED',
    });
    expect(
      await setInstructions(deps, game.save.id, {
        style: 'SHOOT',
        temperament: 'DISCIPLINED',
      }),
    ).toBe('ok');
    expect(
      await setInstructions(deps, game.save.id, {
        style: 'NONSENSE',
        temperament: 'COMPOSED',
      }),
    ).toBe('invalid');
    const after = await getTactics(deps, game.save.id);
    expect(after!.instructions).toEqual({
      style: 'SHOOT',
      temperament: 'DISCIPLINED',
    });
  });

  it('returns null for an unattached protagonist', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const deps = {
      tactics: new PrismaTacticsRepository(db.prisma),
      profile: new PrismaProfileRepository(db.prisma),
      matchConfig: DEFAULT_MATCH_CONFIG,
    };
    expect(await getTactics(deps, game.save.id)).toBeNull();
  });
});

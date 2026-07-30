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
import { PrismaInterviewRepository } from '../repositories/prisma-interview-repository';
import { PrismaNaturalizationRepository } from '../repositories/prisma-naturalization-repository';
import { PrismaNationalTeamRepository } from '../repositories/prisma-national-team-repository';
import { PrismaCompetitionCalendarRepository } from '../repositories/prisma-competition-calendar-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import {
  announceNationalCallup,
  decideNationalCallup,
} from './national-callup';
import { simulateNationalTeamTournament } from './national-team';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
  { id: 'ES', code: 'ES', name: 'Spagna', reputation: 86 },
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
    ES: {
      firstNames: ['Alvaro', 'Sergio', 'Pablo', 'Diego', 'Javier'],
      lastNames: ['Garcia', 'Lopez', 'Perez', 'Gomez', 'Ruiz'],
      cities: ['Madrid', 'Siviglia', 'Valencia', 'Bilbao', 'Vigo'],
    },
  },
};

const newGame: NewGameInput = {
  name: 'Callup Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('national call-up', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  async function setup(currentAbility: number) {
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
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: {
        clubId: club.id,
        careerStatus: 'ACTIVE',
        currentAbility,
        form: 80,
      },
    });
    // Put the save near the end of the season so the announcement is due.
    await db.prisma.saveGame.update({
      where: { id: game.save.id },
      data: { currentDate: new Date('2024-11-01') },
    });

    const deps = {
      calendar: new PrismaCompetitionCalendarRepository(db.prisma),
      nationalTeam: new PrismaNationalTeamRepository(db.prisma),
      profile: new PrismaProfileRepository(db.prisma),
      squadSize: 12,
    };
    return { game, deps };
  }

  it('announces a pending call-up for a squad-worthy protagonist, once per season', async () => {
    const { game, deps } = await setup(95);

    const announcement = await announceNationalCallup(deps, {
      saveGameId: game.save.id,
      toDate: new Date('2024-11-01'),
    });
    expect(announcement).not.toBeNull();
    expect(announcement!.callup.status).toBe('PENDING');
    expect(announcement!.callup.countryName).toBe('Italia');
    expect(announcement!.news[0]!.category).toBe('NATIONAL');
    expect(announcement!.news[0]!.headline).toContain('Convocazione');

    // Idempotent within the season.
    expect(
      await announceNationalCallup(deps, {
        saveGameId: game.save.id,
        toDate: new Date('2024-11-08'),
      }),
    ).toBeNull();

    // Accepting boosts the player and settles the status.
    const before = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    const decision = await decideNationalCallup(
      {
        profile: deps.profile,
        interview: new PrismaInterviewRepository(db.prisma),
        naturalization: new PrismaNaturalizationRepository(db.prisma),
      },
      { saveGameId: game.save.id, accept: true },
    );
    expect(decision.status).toBe('ok');
    if (decision.status === 'ok') {
      expect(decision.callup.status).toBe('ACCEPTED');
    }
    const after = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(after.reputation).toBeGreaterThan(before.reputation);

    // No second decision.
    expect(
      (
        await decideNationalCallup(
          {
            profile: deps.profile,
            interview: new PrismaInterviewRepository(db.prisma),
            naturalization: new PrismaNaturalizationRepository(db.prisma),
          },
          { saveGameId: game.save.id, accept: false },
        )
      ).status,
    ).toBe('no-pending');
  });

  it('records NOT_CALLED silently for a fringe protagonist', async () => {
    const { game, deps } = await setup(5);
    const announcement = await announceNationalCallup(deps, {
      saveGameId: game.save.id,
      toDate: new Date('2024-11-01'),
    });
    expect(announcement).toBeNull();
    const profile = await deps.profile.getProfile(game.save.id);
    expect(profile!.nationalCallup!.status).toBe('NOT_CALLED');
  });

  it('a declined call-up leaves the protagonist out of the tournament', async () => {
    const { game, deps } = await setup(95);
    await announceNationalCallup(deps, {
      saveGameId: game.save.id,
      toDate: new Date('2024-11-01'),
    });
    await decideNationalCallup(
      {
        profile: deps.profile,
        interview: new PrismaInterviewRepository(db.prisma),
        naturalization: new PrismaNaturalizationRepository(db.prisma),
      },
      { saveGameId: game.save.id, accept: false },
    );

    const result = await simulateNationalTeamTournament(
      {
        repository: deps.nationalTeam,
        config: DEFAULT_MATCH_CONFIG,
        squadSize: 12,
      },
      { saveGameId: game.save.id, excludeProtagonist: true },
    );
    expect(result).not.toBeNull();
    // Even at ability 95 the declined protagonist is not in the squad.
    expect(result!.protagonist.participated).toBe(false);
  });
});

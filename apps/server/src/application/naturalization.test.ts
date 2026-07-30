import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { NATURALIZATION_SEASONS_REQUIRED } from '@football-life/simulation-engine';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaNaturalizationRepository } from '../repositories/prisma-naturalization-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import {
  decideNaturalization,
  maybeOfferNaturalization,
} from './naturalization';

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
  name: 'Naturalization Test',
  player: {
    firstName: 'Emigrante',
    lastName: 'Rossi',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

const GAME_DATE = new Date('2027-05-01');

describe('naturalisation', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  /**
   * An Italian playing in Spain, with `seasonsPlayed` Spanish seasons behind
   * them. Appearances are faked against real fixtures so the residency count
   * goes through the same joins production uses.
   */
  async function setup(options: {
    seasonsPlayed: number;
    countryId?: 'IT' | 'ES';
  }) {
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

    const hostCountry = options.countryId ?? 'ES';
    const club = await db.prisma.club.findFirstOrThrow({
      where: {
        saveGameId: game.save.id,
        countryId: hostCountry,
        competitionId: { not: null },
      },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id, careerStatus: 'ACTIVE' },
    });

    // One appearance per season in the host country's league.
    const competitionId = club.competitionId!;
    const baseSeason = await db.prisma.season.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId },
    });
    const fixture = await db.prisma.fixture.findFirstOrThrow({
      where: { seasonId: baseSeason.id },
    });
    for (let i = 0; i < options.seasonsPlayed; i += 1) {
      const seasonId =
        i === 0
          ? baseSeason.id
          : (
              await db.prisma.season.create({
                data: {
                  saveGameId: game.save.id,
                  competitionId,
                  label: `202${4 + i}/202${5 + i}`,
                  startDate: new Date(`202${4 + i}-08-17`),
                  endDate: new Date(`202${5 + i}-05-30`),
                  status: 'COMPLETED',
                },
              })
            ).id;
      const seasonFixture =
        i === 0
          ? fixture
          : await db.prisma.fixture.create({
              data: {
                saveGameId: game.save.id,
                seasonId,
                scheduledAt: new Date(`202${4 + i}-09-01`),
                homeClubId: fixture.homeClubId,
                awayClubId: fixture.awayClubId,
                status: 'PLAYED',
                importance: 1,
              },
            });
      await db.prisma.matchAppearance.create({
        data: {
          fixtureId: seasonFixture.id,
          playerId: game.player.id,
          clubId: club.id,
          started: true,
          minutesPlayed: 90,
          position: 'FW',
          rating: 7,
          goals: 1,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          statistics: {},
        },
      });
    }

    const deps = {
      naturalization: new PrismaNaturalizationRepository(db.prisma),
      profile: new PrismaProfileRepository(db.prisma),
    };
    return { game, deps, club };
  }

  it('offers the passport once the seasons abroad are served', async () => {
    const { game, deps } = await setup({
      seasonsPlayed: NATURALIZATION_SEASONS_REQUIRED,
    });

    const offer = await maybeOfferNaturalization(deps, {
      saveGameId: game.save.id,
      gameDate: GAME_DATE,
    });
    expect(offer).not.toBeNull();
    expect(offer!.offer.status).toBe('PENDING');
    expect(offer!.offer.countryId).toBe('ES');
    expect(offer!.offer.previousCountryId).toBe('IT');
    expect(offer!.news[0]!.headline).toContain('Spagna');

    // Offered once: no weekly nagging.
    expect(
      await maybeOfferNaturalization(deps, {
        saveGameId: game.save.id,
        gameDate: GAME_DATE,
      }),
    ).toBeNull();
  });

  it('stays silent until the residency is served', async () => {
    const { game, deps } = await setup({ seasonsPlayed: 1 });
    expect(
      await maybeOfferNaturalization(deps, {
        saveGameId: game.save.id,
        gameDate: GAME_DATE,
      }),
    ).toBeNull();
  });

  it('never offers the passport of the player’s own country', async () => {
    const { game, deps } = await setup({
      seasonsPlayed: NATURALIZATION_SEASONS_REQUIRED,
      countryId: 'IT',
    });
    expect(
      await maybeOfferNaturalization(deps, {
        saveGameId: game.save.id,
        gameDate: GAME_DATE,
      }),
    ).toBeNull();
  });

  it('rewrites the passport when accepted, keeping the old one as secondary', async () => {
    const { game, deps } = await setup({
      seasonsPlayed: NATURALIZATION_SEASONS_REQUIRED,
    });
    await maybeOfferNaturalization(deps, {
      saveGameId: game.save.id,
      gameDate: GAME_DATE,
    });

    const decision = await decideNaturalization(deps, {
      saveGameId: game.save.id,
      accept: true,
      gameDate: GAME_DATE,
    });
    expect(decision.status).toBe('ok');
    expect(decision.news![0]!.headline).toContain('Spagna');

    const person = await db.prisma.person.findUniqueOrThrow({
      where: { id: game.save.playerPersonId! },
    });
    expect(person.nationalityId).toBe('ES');
    expect(person.secondaryNationalityId).toBe('IT');

    // One switch per career: nothing more is ever offered.
    expect(
      await maybeOfferNaturalization(deps, {
        saveGameId: game.save.id,
        gameDate: GAME_DATE,
      }),
    ).toBeNull();
    expect(
      (
        await decideNaturalization(deps, {
          saveGameId: game.save.id,
          accept: true,
          gameDate: GAME_DATE,
        })
      ).status,
    ).toBe('no-pending');
  });

  it('leaves the passport alone when refused, and closes the door', async () => {
    const { game, deps } = await setup({
      seasonsPlayed: NATURALIZATION_SEASONS_REQUIRED,
    });
    await maybeOfferNaturalization(deps, {
      saveGameId: game.save.id,
      gameDate: GAME_DATE,
    });

    const decision = await decideNaturalization(deps, {
      saveGameId: game.save.id,
      accept: false,
      gameDate: GAME_DATE,
    });
    expect(decision.status).toBe('ok');
    if (decision.status === 'ok') {
      expect(decision.naturalization.status).toBe('DECLINED');
    }
    expect(decision.news![0]!.headline).toContain('Italia');

    const person = await db.prisma.person.findUniqueOrThrow({
      where: { id: game.save.playerPersonId! },
    });
    expect(person.nationalityId).toBe('IT');
    expect(person.secondaryNationalityId).toBeNull();
    // A refusal is final: the offer does not come back next week.
    expect(
      await maybeOfferNaturalization(deps, {
        saveGameId: game.save.id,
        gameDate: GAME_DATE,
      }),
    ).toBeNull();
  });

  it('closes a pending offer if the player answers their nation first', async () => {
    const { game, deps } = await setup({
      seasonsPlayed: NATURALIZATION_SEASONS_REQUIRED,
    });
    await maybeOfferNaturalization(deps, {
      saveGameId: game.save.id,
      gameDate: GAME_DATE,
    });

    // The offer is on the table, then the CT calls and the player says yes.
    await deps.profile.setCappedForCountry(game.save.id, 'IT');

    const decision = await decideNaturalization(deps, {
      saveGameId: game.save.id,
      accept: true,
      gameDate: GAME_DATE,
    });
    expect(decision.status).toBe('blocked');
    expect(decision.news![0]!.body).toContain('nazionale');

    // The passport was NOT granted.
    const person = await db.prisma.person.findUniqueOrThrow({
      where: { id: game.save.playerPersonId! },
    });
    expect(person.nationalityId).toBe('IT');
    expect(person.secondaryNationalityId).toBeNull();
  });

  it('will not naturalise a player already capped by their nation', async () => {
    const { game, deps } = await setup({
      seasonsPlayed: NATURALIZATION_SEASONS_REQUIRED,
    });
    // Exactly what accepting a call-up does.
    await deps.profile.setCappedForCountry(game.save.id, 'IT');

    expect(
      await maybeOfferNaturalization(deps, {
        saveGameId: game.save.id,
        gameDate: GAME_DATE,
      }),
    ).toBeNull();
  });
});

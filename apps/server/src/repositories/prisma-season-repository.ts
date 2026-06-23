import type { Prisma, PrismaClient } from '@prisma/client';
import {
  FixtureStatus,
  SeasonStatus,
  type PlayerPosition,
} from '@football-life/shared';
import { type MatchPlayer, chunk } from '@football-life/simulation-engine';
import type {
  SeasonRepository,
  SeasonResultsPersistence,
  SeasonSimData,
} from './season-repository';

const BATCH = 500;
const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

function attributeValue(
  attributes: readonly { attributeKey: string; value: number }[],
  key: string,
  fallback: number,
): number {
  return attributes.find((a) => a.attributeKey === key)?.value ?? fallback;
}

export class PrismaSeasonRepository implements SeasonRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadSeasonForSimulation(
    seasonId: string,
  ): Promise<SeasonSimData | null> {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });
    if (!season) {
      return null;
    }

    const save = await this.prisma.saveGame.findUnique({
      where: { id: season.saveGameId },
    });

    const clubs = await this.prisma.club.findMany({
      where: {
        saveGameId: season.saveGameId,
        competitionId: season.competitionId,
      },
      select: { id: true },
    });
    const clubIds = clubs.map((club) => club.id);

    const players = await this.prisma.player.findMany({
      where: { clubId: { in: clubIds } },
      include: {
        attributes: {
          where: { attributeKey: { in: ['finishing', 'discipline'] } },
        },
      },
    });

    const squads = new Map<string, MatchPlayer[]>();
    for (const clubId of clubIds) {
      squads.set(clubId, []);
    }
    for (const player of players) {
      if (!player.clubId) continue;
      const squad = squads.get(player.clubId);
      if (!squad) continue;
      squad.push({
        id: player.id,
        position: player.primaryPosition as PlayerPosition,
        currentAbility: player.currentAbility,
        form: player.form,
        condition: player.condition,
        morale: player.morale,
        discipline: attributeValue(player.attributes, 'discipline', 50),
        finishing: attributeValue(player.attributes, 'finishing', 50),
      });
    }

    const fixtures = await this.prisma.fixture.findMany({
      where: { seasonId, status: FixtureStatus.Scheduled },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      seasonId,
      seed: save?.seed ?? 'season',
      fixtures: fixtures.map((fixture) => ({
        id: fixture.id,
        homeClubId: fixture.homeClubId,
        awayClubId: fixture.awayClubId,
      })),
      squads,
    };
  }

  async persistSeasonResults(data: SeasonResultsPersistence): Promise<void> {
    const appearanceRows: Prisma.MatchAppearanceCreateManyInput[] =
      data.appearances.map((appearance) => ({
        fixtureId: appearance.fixtureId,
        playerId: appearance.playerId,
        clubId: appearance.clubId,
        started: appearance.started,
        minutesPlayed: appearance.minutesPlayed,
        position: appearance.position,
        rating: appearance.rating,
        goals: appearance.goals,
        assists: appearance.assists,
        yellowCards: appearance.yellowCards,
        redCards: appearance.redCards,
        statistics: j({}),
      }));

    await this.prisma.$transaction(
      async (tx) => {
        for (const fixture of data.fixtures) {
          await tx.fixture.update({
            where: { id: fixture.fixtureId },
            data: {
              homeScore: fixture.homeGoals,
              awayScore: fixture.awayGoals,
              status: FixtureStatus.Played,
              simulationData: j({
                homeXg: fixture.homeXg,
                awayXg: fixture.awayXg,
              }),
            },
          });
        }

        for (const batch of chunk(appearanceRows, BATCH)) {
          await tx.matchAppearance.createMany({ data: batch });
        }

        for (const row of data.standings) {
          await tx.standing.update({
            where: {
              seasonId_clubId: { seasonId: data.seasonId, clubId: row.clubId },
            },
            data: {
              played: row.played,
              won: row.won,
              drawn: row.drawn,
              lost: row.lost,
              goalsFor: row.goalsFor,
              goalsAgainst: row.goalsAgainst,
              points: row.points,
            },
          });
        }

        await tx.season.update({
          where: { id: data.seasonId },
          data: { status: SeasonStatus.Completed },
        });
      },
      { timeout: 120_000, maxWait: 120_000 },
    );
  }
}

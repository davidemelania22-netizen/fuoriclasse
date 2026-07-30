import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  CompetitionType,
  FixtureStatus,
  SeasonStatus,
} from '@football-life/shared';
import { chunk, sortStandings } from '@football-life/simulation-engine';
import type {
  RolloverLeague,
  RolloverPersistence,
  RolloverState,
  SeasonRolloverRepository,
} from './season-rollover-repository';

const BATCH = 500;

export class PrismaSeasonRolloverRepository implements SeasonRolloverRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadRolloverState(saveGameId: string): Promise<RolloverState | null> {
    const competitions = await this.prisma.competition.findMany({
      where: { saveGameId, type: CompetitionType.League },
    });
    if (competitions.length === 0) return null;

    const leagues: RolloverLeague[] = [];
    for (const competition of competitions) {
      const season = await this.prisma.season.findFirst({
        where: { saveGameId, competitionId: competition.id },
        orderBy: { startDate: 'desc' },
      });
      if (!season) return null;

      // Any still-scheduled fixture means this season has not finished yet.
      const remaining = await this.prisma.fixture.count({
        where: {
          seasonId: season.id,
          status: FixtureStatus.Scheduled,
        },
      });
      if (remaining > 0) return null;

      const clubs = await this.prisma.club.findMany({
        where: { competitionId: competition.id },
        select: { id: true },
      });
      const standingRows = await this.prisma.standing.findMany({
        where: { seasonId: season.id },
      });
      const rankedClubIds = sortStandings(
        standingRows.map((s) => ({
          clubId: s.clubId,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
        })),
      ).map((row) => row.clubId);

      leagues.push({
        competitionId: competition.id,
        countryId: competition.countryId,
        tier: competition.tier,
        seasonId: season.id,
        seasonLabel: season.label,
        seasonStartMs: season.startDate.getTime(),
        seasonEndMs: season.endDate.getTime(),
        clubIds: clubs.map((c) => c.id),
        rankedClubIds,
      });
    }

    return { saveGameId, leagues };
  }

  async persistRollover(
    saveGameId: string,
    data: RolloverPersistence,
  ): Promise<void> {
    const seasonIdByCompetition = new Map<string, string>();
    const seasons: Prisma.SeasonCreateManyInput[] = data.seasons.map((plan) => {
      const id = randomUUID();
      seasonIdByCompetition.set(plan.competitionId, id);
      return {
        id,
        saveGameId,
        competitionId: plan.competitionId,
        label: plan.label,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: SeasonStatus.Scheduled,
      };
    });

    const fixtures: Prisma.FixtureCreateManyInput[] = [];
    const standings: Prisma.StandingCreateManyInput[] = [];
    for (const plan of data.seasons) {
      const seasonId = seasonIdByCompetition.get(plan.competitionId)!;
      for (const fixture of plan.fixtures) {
        fixtures.push({
          saveGameId,
          seasonId,
          homeClubId: fixture.homeClubId,
          awayClubId: fixture.awayClubId,
          scheduledAt: fixture.scheduledAt,
          status: FixtureStatus.Scheduled,
          importance: 1,
        });
      }
      for (const clubId of plan.clubIds) {
        standings.push({ seasonId, clubId });
      }
    }

    await this.prisma.$transaction(
      async (tx) => {
        for (const swap of data.swaps) {
          await tx.club.update({
            where: { id: swap.clubId },
            data: { competitionId: swap.toCompetitionId },
          });
        }
        await tx.season.createMany({ data: seasons });
        for (const batch of chunk(fixtures, BATCH)) {
          await tx.fixture.createMany({ data: batch });
        }
        for (const batch of chunk(standings, BATCH)) {
          await tx.standing.createMany({ data: batch });
        }
      },
      { timeout: 120_000, maxWait: 120_000 },
    );
  }
}

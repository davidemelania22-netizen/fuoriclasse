import type { Prisma, PrismaClient } from '@prisma/client';
import { CompetitionType, SeasonStatus } from '@football-life/shared';
import type {
  CompletedLeague,
  SeasonReviewRepository,
} from './season-review-repository';

const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export class PrismaSeasonReviewRepository implements SeasonReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async seed(saveGameId: string): Promise<string | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    return save?.seed ?? null;
  }

  async loadCompletedLeagues(saveGameId: string): Promise<CompletedLeague[]> {
    const competitions = await this.prisma.competition.findMany({
      where: { saveGameId, type: CompetitionType.League },
      orderBy: [{ countryId: 'asc' }, { tier: 'asc' }],
    });

    const leagues: CompletedLeague[] = [];
    for (const competition of competitions) {
      const season = await this.prisma.season.findFirst({
        where: {
          saveGameId,
          competitionId: competition.id,
          status: SeasonStatus.Completed,
        },
        orderBy: { startDate: 'desc' },
      });
      if (!season) continue;

      const standingRows = await this.prisma.standing.findMany({
        where: { seasonId: season.id },
      });
      if (standingRows.length === 0) continue;

      const clubs = await this.prisma.club.findMany({
        where: { id: { in: standingRows.map((s) => s.clubId) } },
        select: { id: true, name: true, reputation: true, philosophy: true },
      });

      leagues.push({
        competitionId: competition.id,
        competitionName: competition.name,
        countryId: competition.countryId,
        seasonLabel: season.label,
        clubs: clubs.map((club) => {
          const philosophy = (club.philosophy ?? {}) as Record<string, unknown>;
          const managerName = philosophy.managerName;
          return {
            id: club.id,
            name: club.name,
            reputation: club.reputation,
            managerName: typeof managerName === 'string' ? managerName : null,
          };
        }),
        standings: standingRows.map((s) => ({
          clubId: s.clubId,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          points: s.points,
        })),
      });
    }
    return leagues;
  }

  async applyManagerNames(
    changes: readonly { clubId: string; managerName: string }[],
  ): Promise<void> {
    for (const change of changes) {
      const club = await this.prisma.club.findUnique({
        where: { id: change.clubId },
        select: { philosophy: true },
      });
      if (!club) continue;
      const philosophy = (club.philosophy ?? {}) as Record<string, unknown>;
      await this.prisma.club.update({
        where: { id: change.clubId },
        data: {
          philosophy: j({ ...philosophy, managerName: change.managerName }),
        },
      });
    }
  }
}

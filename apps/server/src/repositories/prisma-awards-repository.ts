import type { Prisma, PrismaClient } from '@prisma/client';
import { CompetitionType, SeasonStatus } from '@football-life/shared';
import type {
  AwardsRepository,
  CompletedLeagueSeason,
  ExistingSeasonAward,
  SeasonPlayerStat,
} from './awards-repository';
import type { RecordHonourInput } from './cup-repository';

const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

interface AwardDetail {
  clubName?: string;
  goals?: number;
  assists?: number;
  averageRating?: number;
}

export class PrismaAwardsRepository implements AwardsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadLastCompletedLeagueSeason(
    saveGameId: string,
  ): Promise<CompletedLeagueSeason | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: true },
    });
    const clubId = person?.player?.clubId;
    if (!clubId) return null;

    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { competitionId: true },
    });
    if (!club?.competitionId) return null;

    const season = await this.prisma.season.findFirst({
      where: {
        competitionId: club.competitionId,
        status: SeasonStatus.Completed,
      },
      orderBy: { endDate: 'desc' },
      include: { competition: { select: { name: true } } },
    });
    if (!season) return null;

    // The world's strongest league is the yardstick every other one is
    // measured against.
    const [own, top] = await Promise.all([
      this.prisma.competition.findUnique({
        where: { id: club.competitionId },
        select: { reputation: true },
      }),
      this.prisma.competition.findFirst({
        where: { saveGameId, type: CompetitionType.League },
        orderBy: { reputation: 'desc' },
        select: { reputation: true },
      }),
    ]);

    return {
      seasonId: season.id,
      seasonLabel: season.label,
      competitionId: club.competitionId,
      competitionName: season.competition.name,
      competitionReputation: own?.reputation ?? 0,
      topLeagueReputation: top?.reputation ?? 0,
    };
  }

  async aggregateSeasonStats(seasonId: string): Promise<SeasonPlayerStat[]> {
    const grouped = await this.prisma.matchAppearance.groupBy({
      by: ['playerId'],
      where: { fixture: { seasonId } },
      _sum: { goals: true, assists: true },
      _avg: { rating: true },
    });
    if (grouped.length === 0) return [];

    const players = await this.prisma.player.findMany({
      where: { id: { in: grouped.map((g) => g.playerId) } },
      include: {
        person: { select: { firstName: true, lastName: true } },
        club: { select: { name: true } },
      },
    });
    const byId = new Map(players.map((p) => [p.id, p]));

    return grouped
      .filter((g) => byId.has(g.playerId))
      .map((g) => {
        const p = byId.get(g.playerId)!;
        return {
          playerId: g.playerId,
          playerName: `${p.person.firstName} ${p.person.lastName}`,
          clubName: p.club?.name ?? 'Svincolato',
          goals: g._sum.goals ?? 0,
          assists: g._sum.assists ?? 0,
          averageRating: g._avg.rating ?? 0,
        };
      });
  }

  async findExistingAward(
    saveGameId: string,
    competitionId: string,
    seasonLabel: string,
    type: 'GOLDEN_BOOT' | 'BALLON_DOR',
  ): Promise<ExistingSeasonAward | null> {
    const honour = await this.prisma.honour.findFirst({
      where: { saveGameId, competitionId, seasonLabel, type },
    });
    if (!honour) return null;
    const detail = (honour.detail as AwardDetail | null) ?? {};
    return {
      playerName: honour.playerName ?? 'Sconosciuto',
      clubName: detail.clubName ?? '',
      goals: detail.goals ?? 0,
      assists: detail.assists ?? 0,
      averageRating: detail.averageRating ?? 0,
    };
  }

  async recordHonour(input: RecordHonourInput): Promise<void> {
    const data: Prisma.HonourUncheckedCreateInput = {
      saveGameId: input.saveGameId,
      seasonLabel: input.seasonLabel,
      type: input.type,
      competitionId: input.competitionId ?? null,
      competitionName: input.competitionName ?? null,
      clubId: input.clubId ?? null,
      clubName: input.clubName ?? null,
      playerId: input.playerId ?? null,
      playerName: input.playerName ?? null,
    };
    if (input.detail !== undefined) data.detail = j(input.detail);
    await this.prisma.honour.create({ data });
  }
}

import type { PrismaClient } from '@prisma/client';
import type {
  CareerTimelineData,
  CareerTimelineRepository,
} from './career-timeline-repository';

export class PrismaCareerTimelineRepository implements CareerTimelineRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadCareerTimelineData(
    saveGameId: string,
  ): Promise<CareerTimelineData | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: true },
    });
    if (!person?.player) return null;
    const playerId = person.player.id;

    const contracts = await this.prisma.contract.findMany({
      where: { playerId },
      orderBy: { startDate: 'asc' },
      include: { club: { select: { name: true } } },
    });

    const appearances = await this.prisma.matchAppearance.findMany({
      where: { playerId },
      include: {
        fixture: {
          select: { scheduledAt: true, homeClubId: true, awayClubId: true },
        },
        club: { select: { name: true } },
      },
    });
    const sortedAppearances = [...appearances].sort(
      (a, b) => a.fixture.scheduledAt.getTime() - b.fixture.scheduledAt.getTime(),
    );

    const opponentIds = new Set<string>();
    for (const a of sortedAppearances) {
      opponentIds.add(a.fixture.homeClubId);
      opponentIds.add(a.fixture.awayClubId);
    }
    const clubs = await this.prisma.club.findMany({
      where: { id: { in: [...opponentIds] } },
      select: { id: true, name: true },
    });
    const clubNameById = new Map(clubs.map((c) => [c.id, c.name]));

    const honours = await this.prisma.honour.findMany({
      where: { saveGameId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      playerId,
      nationalityId: person.nationalityId,
      contracts: contracts.map((c) => ({
        clubId: c.clubId,
        clubName: c.club.name,
        startDate: c.startDate.toISOString(),
      })),
      appearances: sortedAppearances.map((a) => {
        const opponentId =
          a.fixture.homeClubId === a.clubId
            ? a.fixture.awayClubId
            : a.fixture.homeClubId;
        return {
          date: a.fixture.scheduledAt.toISOString(),
          clubId: a.clubId,
          clubName: a.club.name,
          opponentName: clubNameById.get(opponentId) ?? 'Sconosciuto',
          goals: a.goals,
          assists: a.assists,
          rating: a.rating,
        };
      }),
      honours: honours.map((h) => ({
        type: h.type,
        clubId: h.clubId,
        clubName: h.clubName,
        playerId: h.playerId,
        seasonLabel: h.seasonLabel,
        competitionName: h.competitionName,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }
}

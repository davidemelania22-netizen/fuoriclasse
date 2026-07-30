import type { PrismaClient } from '@prisma/client';
import type {
  CalendarMonthData,
  CalendarRepository,
} from './calendar-repository';

export class PrismaCalendarRepository implements CalendarRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadCalendarMonth(
    saveGameId: string,
    range: { from: Date; to: Date },
  ): Promise<CalendarMonthData | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save) return null;

    const person = save.playerPersonId
      ? await this.prisma.person.findUnique({
          where: { id: save.playerPersonId },
          include: { player: { include: { club: true } } },
        })
      : null;
    const player = person?.player ?? null;
    const club = player?.club ?? null;

    const clubFilter = club
      ? [{ homeClubId: club.id }, { awayClubId: club.id }]
      : undefined;

    const [fixtures, news, injuries, first, last] = await Promise.all([
      clubFilter
        ? this.prisma.fixture.findMany({
            where: {
              saveGameId,
              scheduledAt: { gte: range.from, lt: range.to },
              OR: clubFilter,
            },
            orderBy: { scheduledAt: 'asc' },
            include: {
              season: { include: { competition: { select: { name: true } } } },
              homeClub: { select: { id: true, name: true } },
              awayClub: { select: { id: true, name: true } },
              appearances: player
                ? { where: { playerId: player.id } }
                : { where: { id: 'none' } },
            },
          })
        : Promise.resolve([]),
      this.prisma.newsItem.findMany({
        where: { saveGameId, gameDate: { gte: range.from, lt: range.to } },
        orderBy: { gameDate: 'asc' },
        select: { gameDate: true, category: true, headline: true },
      }),
      player
        ? this.prisma.injury.findMany({
            where: {
              saveGameId,
              playerId: player.id,
              startedAt: { lt: range.to },
              OR: [
                { actualEndAt: { gte: range.from } },
                { actualEndAt: null, expectedEndAt: { gte: range.from } },
              ],
            },
            orderBy: { startedAt: 'asc' },
          })
        : Promise.resolve([]),
      clubFilter
        ? this.prisma.fixture.findFirst({
            where: { saveGameId, OR: clubFilter },
            orderBy: { scheduledAt: 'asc' },
            select: { scheduledAt: true },
          })
        : Promise.resolve(null),
      clubFilter
        ? this.prisma.fixture.findFirst({
            where: { saveGameId, OR: clubFilter },
            orderBy: { scheduledAt: 'desc' },
            select: { scheduledAt: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      currentDate: save.currentDate,
      clubName: club?.name ?? null,
      fixtures: fixtures.map((fixture) => {
        const isHome = club !== null && fixture.homeClubId === club.id;
        const appearance = fixture.appearances[0] ?? null;
        return {
          fixtureId: fixture.id,
          scheduledAt: fixture.scheduledAt,
          status: fixture.status,
          competitionName: fixture.season.competition.name,
          isHome,
          opponentName: isHome ? fixture.awayClub.name : fixture.homeClub.name,
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          appearance: appearance
            ? {
                rating: appearance.rating,
                goals: appearance.goals,
                assists: appearance.assists,
                minutesPlayed: appearance.minutesPlayed,
              }
            : null,
        };
      }),
      news,
      injuries: injuries.map((injury) => ({
        injuryTypeKey: injury.injuryTypeKey,
        startedAt: injury.startedAt,
        endAt: injury.actualEndAt ?? injury.expectedEndAt,
        healed: injury.status === 'HEALED',
      })),
      bounds:
        first && last ? { first: first.scheduledAt, last: last.scheduledAt } : null,
    };
  }
}

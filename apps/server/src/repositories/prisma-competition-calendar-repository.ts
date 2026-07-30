import type { PrismaClient } from '@prisma/client';
import { CompetitionType } from '@football-life/shared';
import type {
  CompetitionCalendarRepository,
  CompetitionCalendarState,
} from './competition-calendar-repository';

const CALENDAR_TYPES = [
  CompetitionType.Cup,
  CompetitionType.Continental,
  CompetitionType.International,
];

export class PrismaCompetitionCalendarRepository implements CompetitionCalendarRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadCalendarState(
    saveGameId: string,
  ): Promise<CompetitionCalendarState | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save) return null;

    // Anchor the cup calendar to the current (latest) league season.
    const leagueSeason = await this.prisma.season.findFirst({
      where: { saveGameId, competition: { type: CompetitionType.League } },
      orderBy: { startDate: 'desc' },
    });
    if (!leagueSeason) return null;

    const lastFixture = await this.prisma.fixture.aggregate({
      where: { seasonId: leagueSeason.id },
      _max: { scheduledAt: true },
    });
    const lastMatchdayAt = lastFixture._max.scheduledAt;
    if (!lastMatchdayAt) return null;

    const competitions = await this.prisma.competition.findMany({
      where: { saveGameId, type: { in: CALENDAR_TYPES } },
      select: { id: true, type: true, name: true, countryId: true },
    });

    const honours = await this.prisma.honour.findMany({
      where: { saveGameId },
      select: { type: true, competitionId: true, seasonLabel: true },
    });

    return {
      currentDate: save.currentDate,
      seasonStartMs: leagueSeason.startDate.getTime(),
      lastMatchdayMs: lastMatchdayAt.getTime(),
      competitions: competitions.map((c) => ({
        competitionId: c.id,
        type: c.type,
        name: c.name,
        countryId: c.countryId,
      })),
      honours: honours.map((h) => ({
        type: h.type,
        competitionId: h.competitionId,
        seasonLabel: h.seasonLabel,
      })),
    };
  }
}

import type { PrismaClient } from '@prisma/client';
import { calendarAge } from '@football-life/simulation-engine';
import type {
  CareerStatsData,
  CareerStatsRepository,
} from './career-stats-repository';

export class PrismaCareerStatsRepository implements CareerStatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadCareerStats(saveGameId: string): Promise<CareerStatsData | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: true },
    });
    if (!person?.player) return null;
    const player = person.player;

    const appearances = await this.prisma.matchAppearance.findMany({
      where: { playerId: player.id },
      include: {
        club: { select: { name: true } },
        fixture: {
          include: {
            season: {
              include: { competition: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { fixture: { scheduledAt: 'asc' } },
    });

    const honours = await this.prisma.honour.findMany({
      where: { saveGameId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      firstName: person.firstName,
      lastName: person.lastName,
      age: calendarAge(person.birthDate, save.currentDate),
      careerStatus: player.careerStatus,
      currentAbility: player.currentAbility,
      appearances: appearances.map((a) => ({
        seasonId: a.fixture.seasonId,
        seasonLabel: a.fixture.season.label,
        seasonStartMs: a.fixture.season.startDate.getTime(),
        competitionName: a.fixture.season.competition.name,
        clubId: a.clubId,
        clubName: a.club.name,
        minutesPlayed: a.minutesPlayed,
        rating: a.rating,
        goals: a.goals,
        assists: a.assists,
        yellowCards: a.yellowCards,
        redCards: a.redCards,
      })),
      honours: honours.map((h) => ({
        type: h.type,
        competitionName: h.competitionName,
        seasonLabel: h.seasonLabel,
        isPersonal: h.playerId === player.id,
      })),
    };
  }
}

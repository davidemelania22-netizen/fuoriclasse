import type { PrismaClient } from '@prisma/client';
import { CompetitionType } from '@football-life/shared';
import type {
  LeagueStandingsData,
  StandingsData,
  StandingsRepository,
} from './standings-repository';

export class PrismaStandingsRepository implements StandingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadStandings(saveGameId: string): Promise<StandingsData | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save) return null;

    let protagonistClubId: string | null = null;
    if (save.playerPersonId) {
      const person = await this.prisma.person.findUnique({
        where: { id: save.playerPersonId },
        include: { player: { select: { clubId: true } } },
      });
      protagonistClubId = person?.player?.clubId ?? null;
    }

    const competitions = await this.prisma.competition.findMany({
      where: { saveGameId, type: CompetitionType.League },
      orderBy: [{ countryId: 'asc' }, { tier: 'asc' }],
    });

    const leagues: LeagueStandingsData[] = [];
    for (const competition of competitions) {
      // Most recent season for this league (current if in progress, else last completed).
      const season = await this.prisma.season.findFirst({
        where: { saveGameId, competitionId: competition.id },
        orderBy: { startDate: 'desc' },
      });
      if (!season) continue;

      const standingRows = await this.prisma.standing.findMany({
        where: { seasonId: season.id },
      });
      if (standingRows.length === 0) continue;

      const clubs = await this.prisma.club.findMany({
        where: { competitionId: competition.id },
        select: { id: true, name: true, logo: true },
      });

      leagues.push({
        competitionId: competition.id,
        competitionName: competition.name,
        countryId: competition.countryId,
        tier: competition.tier,
        seasonLabel: season.label,
        competitionLogo: competition.logo,
        clubNames: new Map(clubs.map((c) => [c.id, c.name])),
        clubLogos: new Map(clubs.map((c) => [c.id, c.logo])),
        rows: standingRows.map((s) => ({
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

    return { protagonistClubId, leagues };
  }
}

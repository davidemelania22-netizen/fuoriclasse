import type { PrismaClient } from '@prisma/client';
import { FixtureStatus } from '@football-life/shared';
import type {
  NextFixtureData,
  NextFixtureRepository,
} from './next-fixture-repository';

export class PrismaNextFixtureRepository implements NextFixtureRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadNextFixture(saveGameId: string): Promise<NextFixtureData | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    const club = person?.player?.club;
    if (!club) return null;

    const fixture = await this.prisma.fixture.findFirst({
      where: {
        saveGameId,
        status: FixtureStatus.Scheduled,
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        season: { include: { competition: { select: { name: true } } } },
      },
    });
    if (!fixture) return null;

    const isHome = fixture.homeClubId === club.id;
    const opponentClubId = isHome ? fixture.awayClubId : fixture.homeClubId;
    const opponent = await this.prisma.club.findUnique({
      where: { id: opponentClubId },
      select: { name: true },
    });

    // Rival = the club in the same league closest in reputation to ours.
    let rivalClubId: string | null = null;
    if (club.competitionId) {
      const leagueClubs = await this.prisma.club.findMany({
        where: { competitionId: club.competitionId, id: { not: club.id } },
        select: { id: true, reputation: true },
      });
      let best = Infinity;
      for (const other of leagueClubs) {
        const gap = Math.abs(other.reputation - club.reputation);
        if (gap < best) {
          best = gap;
          rivalClubId = other.id;
        }
      }
    }

    return {
      seed: save.seed,
      fixtureId: fixture.id,
      isHome,
      opponentClubId,
      opponentName: opponent?.name ?? 'Sconosciuta',
      date: fixture.scheduledAt,
      competitionName: fixture.season.competition.name,
      rivalClubId,
    };
  }
}

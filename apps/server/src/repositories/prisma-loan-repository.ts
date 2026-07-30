import type { PrismaClient } from '@prisma/client';
import { CompetitionType } from '@football-life/shared';
import { calendarAge } from '@football-life/simulation-engine';
import type {
  LoanCandidate,
  LoanContext,
  LoanRepository,
} from './loan-repository';

export class PrismaLoanRepository implements LoanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadContext(saveGameId: string): Promise<LoanContext | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: {
        player: { include: { club: { include: { competition: true } } } },
      },
    });
    const player = person?.player;
    if (!player) return null;

    const club = player.club;
    const competition = club?.competition ?? null;

    // Appearances in the club's current league season tell us whether the
    // player is actually playing or watching from the bench.
    let seasonLabel: string | null = null;
    let appearancesThisSeason = 0;
    if (competition && competition.type === CompetitionType.League) {
      const season = await this.prisma.season.findFirst({
        where: { saveGameId, competitionId: competition.id },
        orderBy: { startDate: 'desc' },
      });
      if (season) {
        seasonLabel = season.label;
        appearancesThisSeason = await this.prisma.matchAppearance.count({
          where: { playerId: player.id, fixture: { seasonId: season.id } },
        });
      }
    }

    return {
      playerId: player.id,
      age: calendarAge(person.birthDate, save.currentDate),
      clubId: player.clubId,
      clubName: club?.name ?? null,
      countryId: club?.countryId ?? null,
      tier: competition?.tier ?? null,
      seasonLabel,
      appearancesThisSeason,
    };
  }

  async listCandidates(
    saveGameId: string,
    countryId: string,
    tier: number,
  ): Promise<LoanCandidate[]> {
    const clubs = await this.prisma.club.findMany({
      where: {
        saveGameId,
        countryId,
        competition: { type: CompetitionType.League, tier },
      },
      include: { competition: { select: { name: true } } },
      orderBy: { reputation: 'desc' },
    });
    return clubs.map((club) => ({
      clubId: club.id,
      clubName: club.name,
      competitionName: club.competition?.name ?? 'Sconosciuta',
      reputation: club.reputation,
    }));
  }

  async moveToClub(playerId: string, clubId: string): Promise<void> {
    await this.prisma.player.update({
      where: { id: playerId },
      data: { clubId },
    });
  }
}

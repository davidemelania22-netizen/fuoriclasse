import type { PrismaClient } from '@prisma/client';
import { ContractStatus } from '@football-life/shared';
import type {
  ManagerStatusData,
  ManagerStatusRepository,
} from './manager-status-repository';

export class PrismaManagerStatusRepository implements ManagerStatusRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async protagonistPlayer(saveGameId: string) {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    return person?.player ?? null;
  }

  async loadSquadRole(saveGameId: string): Promise<string | null> {
    const player = await this.protagonistPlayer(saveGameId);
    if (!player) return null;
    const contract = await this.prisma.contract.findFirst({
      where: { playerId: player.id, status: ContractStatus.Active },
      orderBy: { endDate: 'desc' },
    });
    return contract?.squadRole ?? null;
  }

  async loadStatus(saveGameId: string): Promise<ManagerStatusData | null> {
    const player = await this.protagonistPlayer(saveGameId);
    if (!player?.club) return null;
    const club = player.club;
    if (!club.competitionId) return null;

    const contract = await this.prisma.contract.findFirst({
      where: { playerId: player.id, status: ContractStatus.Active },
      orderBy: { endDate: 'desc' },
    });

    const leagueClubs = await this.prisma.club.findMany({
      where: { competitionId: club.competitionId },
      select: { reputation: true },
    });

    // Most recent season of the protagonist's league (current if in progress).
    const season = await this.prisma.season.findFirst({
      where: { saveGameId, competitionId: club.competitionId },
      orderBy: { startDate: 'desc' },
    });
    const standingRows = season
      ? await this.prisma.standing.findMany({ where: { seasonId: season.id } })
      : [];

    return {
      clubId: club.id,
      clubName: club.name,
      clubReputation: club.reputation,
      competitionId: club.competitionId,
      squadRole: contract?.squadRole ?? null,
      leagueReputations: leagueClubs.map((c) => c.reputation),
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
    };
  }
}

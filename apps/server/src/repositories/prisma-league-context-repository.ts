import type { PrismaClient } from '@prisma/client';
import { CompetitionType } from '@football-life/shared';
import type {
  LeagueContextRepository,
  ProtagonistLeague,
} from './league-context-repository';

const MAX_REPUTATION = 10_000;
const clamp = (v: number): number => Math.max(0, Math.min(MAX_REPUTATION, v));

export class PrismaLeagueContextRepository implements LeagueContextRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadProtagonistLeague(
    saveGameId: string,
  ): Promise<ProtagonistLeague | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
      select: { playerPersonId: true },
    });
    if (!save?.playerPersonId) return null;

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      select: {
        player: { select: { club: { select: { competitionId: true } } } },
      },
    });
    const competitionId = person?.player?.club?.competitionId;
    if (!competitionId) return null;

    // The world's strongest league is what every other one is measured against.
    const [own, top] = await Promise.all([
      this.prisma.competition.findUnique({
        where: { id: competitionId },
        select: { name: true, reputation: true },
      }),
      this.prisma.competition.findFirst({
        where: { saveGameId, type: CompetitionType.League },
        orderBy: { reputation: 'desc' },
        select: { reputation: true },
      }),
    ]);
    if (!own) return null;

    return {
      competitionId,
      competitionName: own.name,
      competitionReputation: own.reputation,
      topLeagueReputation: top?.reputation ?? own.reputation,
    };
  }

  async addProtagonistReputation(
    saveGameId: string,
    delta: number,
  ): Promise<{ before: number; after: number } | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
      select: { playerPersonId: true },
    });
    if (!save?.playerPersonId) return null;

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      select: { player: { select: { id: true, reputation: true } } },
    });
    const player = person?.player;
    if (!player) return null;

    const before = player.reputation;
    const after = clamp(before + delta);
    if (after !== before) {
      await this.prisma.player.update({
        where: { id: player.id },
        data: { reputation: after },
      });
    }
    return { before, after };
  }
}

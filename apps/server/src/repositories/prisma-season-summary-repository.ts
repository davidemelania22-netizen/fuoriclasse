import type { PrismaClient } from '@prisma/client';
import { CompetitionType } from '@football-life/shared';
import type {
  SeasonSummaryContext,
  SeasonSummaryRepository,
  SummaryHonourRow,
} from './season-summary-repository';

export class PrismaSeasonSummaryRepository implements SeasonSummaryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadContext(saveGameId: string): Promise<SeasonSummaryContext | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    const player = person?.player;
    if (!player) return null;

    // The league season the protagonist's club is currently playing.
    let seasonLabel: string | null = null;
    if (player.club?.competitionId) {
      const season = await this.prisma.season.findFirst({
        where: {
          saveGameId,
          competitionId: player.club.competitionId,
          competition: { type: CompetitionType.League },
        },
        orderBy: { startDate: 'desc' },
        select: { label: true },
      });
      seasonLabel = season?.label ?? null;
    }

    return {
      playerId: player.id,
      clubId: player.clubId,
      clubName: player.club?.name ?? null,
      seasonLabel,
    };
  }

  async listHonours(saveGameId: string): Promise<SummaryHonourRow[]> {
    const honours = await this.prisma.honour.findMany({
      where: { saveGameId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        competitionName: true,
        seasonLabel: true,
        clubId: true,
        clubName: true,
        playerId: true,
      },
    });
    return honours;
  }
}

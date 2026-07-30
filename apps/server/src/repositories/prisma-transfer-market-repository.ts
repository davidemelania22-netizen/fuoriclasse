import type { PrismaClient } from '@prisma/client';
import { CareerStatus } from '@football-life/shared';
import type { PlannedTransfer } from '@football-life/simulation-engine';
import type {
  MarketState,
  TransferMarketRepository,
} from './transfer-market-repository';

export class PrismaTransferMarketRepository
  implements TransferMarketRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async loadMarketState(saveGameId: string): Promise<MarketState | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save) return null;

    const clubs = await this.prisma.club.findMany({
      where: { saveGameId, competitionId: { not: null } },
      select: { id: true, name: true, reputation: true, transferBudget: true },
    });

    const players = await this.prisma.player.findMany({
      where: {
        saveGameId,
        careerStatus: CareerStatus.Active,
        clubId: { not: null },
        person: { is: { id: { not: save.playerPersonId ?? '' } } },
      },
      select: {
        id: true,
        clubId: true,
        currentAbility: true,
        marketValue: true,
        person: { select: { firstName: true, lastName: true } },
      },
      orderBy: { id: 'asc' },
    });

    return {
      seed: save.seed,
      clubs: clubs.map((c) => ({
        id: c.id,
        name: c.name,
        reputation: c.reputation,
        transferBudget: c.transferBudget,
      })),
      players: players.map((p) => ({
        id: p.id,
        name: `${p.person.firstName} ${p.person.lastName}`,
        clubId: p.clubId!,
        currentAbility: p.currentAbility,
        marketValue: p.marketValue,
      })),
    };
  }

  async applyTransfers(transfers: readonly PlannedTransfer[]): Promise<void> {
    if (transfers.length === 0) return;
    await this.prisma.$transaction(async (tx) => {
      for (const t of transfers) {
        await tx.player.update({
          where: { id: t.playerId },
          data: { clubId: t.toClubId },
        });
        await tx.club.update({
          where: { id: t.toClubId },
          data: {
            balance: { decrement: t.fee },
            transferBudget: { decrement: t.fee },
          },
        });
        await tx.club.update({
          where: { id: t.fromClubId },
          data: { balance: { increment: t.fee } },
        });
      }
    });
  }
}

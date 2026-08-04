import type { PrismaClient } from '@prisma/client';
import { FinancialTransactionType } from '@football-life/shared';
import type {
  EarningToRecord,
  FinanceRepository,
  LedgerEntry,
} from './finance-repository';

/** Ledger type each kind of earning is filed under. */
const TRANSACTION_TYPE: Record<EarningToRecord['kind'], string> = {
  WAGE: FinancialTransactionType.Wage,
  APPEARANCE_BONUS: FinancialTransactionType.Bonus,
  GOAL_BONUS: FinancialTransactionType.Bonus,
  SIGNING_BONUS: FinancialTransactionType.Bonus,
};

export class PrismaFinanceRepository implements FinanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async protagonist(saveGameId: string) {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save || !save.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: true },
    });
    if (!person || !person.player) return null;
    return { playerId: person.player.id, currentDate: save.currentDate };
  }

  async getBalance(saveGameId: string): Promise<number | null> {
    const protagonist = await this.protagonist(saveGameId);
    if (!protagonist) return null;
    const aggregate = await this.prisma.financialTransaction.aggregate({
      where: { playerId: protagonist.playerId },
      _sum: { amount: true },
    });
    return aggregate._sum.amount ?? 0;
  }

  async addFunds(
    saveGameId: string,
    amount: number,
    description: string,
  ): Promise<number | null> {
    const protagonist = await this.protagonist(saveGameId);
    if (!protagonist) return null;
    await this.prisma.financialTransaction.create({
      data: {
        saveGameId,
        playerId: protagonist.playerId,
        occurredAt: protagonist.currentDate,
        type: FinancialTransactionType.Other,
        amount: Math.round(amount),
        description,
        referenceType: 'Editor',
      },
    });
    return this.getBalance(saveGameId);
  }

  async recordEarnings(
    saveGameId: string,
    earnings: readonly EarningToRecord[],
  ): Promise<number | null> {
    const protagonist = await this.protagonist(saveGameId);
    if (!protagonist) return null;
    const payable = earnings.filter((earning) => earning.amount > 0);
    if (payable.length > 0) {
      await this.prisma.financialTransaction.createMany({
        data: payable.map((earning) => ({
          saveGameId,
          playerId: protagonist.playerId,
          occurredAt: protagonist.currentDate,
          type: TRANSACTION_TYPE[earning.kind],
          amount: Math.round(earning.amount),
          description: earning.label,
          referenceType: 'Contract',
        })),
      });
    }
    return this.getBalance(saveGameId);
  }

  async listTransactions(
    saveGameId: string,
    limit: number,
  ): Promise<LedgerEntry[] | null> {
    const protagonist = await this.protagonist(saveGameId);
    if (!protagonist) return null;
    const rows = await this.prisma.financialTransaction.findMany({
      where: { playerId: protagonist.playerId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: Math.max(1, Math.min(500, limit)),
    });
    return rows.map((row) => ({
      occurredAt: row.occurredAt,
      type: row.type,
      description: row.description,
      amount: row.amount,
    }));
  }
}

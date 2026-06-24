import type { PrismaClient } from '@prisma/client';
import { FinancialTransactionType } from '@football-life/shared';
import type { FinanceRepository } from './finance-repository';

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
}

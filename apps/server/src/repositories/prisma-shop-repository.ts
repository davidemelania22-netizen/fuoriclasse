import type { PrismaClient } from '@prisma/client';
import { FinancialTransactionType } from '@football-life/shared';
import type { ApplyPurchaseInput, ShopRepository } from './shop-repository';

/** Wellbeing stats live on 0-100. */
const clamp = (value: number): number => Math.max(0, Math.min(100, value));
/**
 * Fame stats live on 0-10000, like everywhere else in the game. Clamping them
 * to 100 used to CUT popularity down for any player who had already built
 * some: a +45 charity event would leave a 300-popularity player on 100.
 */
const clampFame = (value: number): number =>
  Math.max(0, Math.min(10_000, Math.round(value)));

export class PrismaShopRepository implements ShopRepository {
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
    return { player: person.player, currentDate: save.currentDate };
  }

  async applyPurchase(input: ApplyPurchaseInput): Promise<number | null> {
    const found = await this.protagonist(input.saveGameId);
    if (!found) return null;
    const { player, currentDate } = found;
    const e = input.effects;

    await this.prisma.$transaction(async (tx) => {
      await tx.financialTransaction.create({
        data: {
          saveGameId: input.saveGameId,
          playerId: player.id,
          occurredAt: currentDate,
          type: FinancialTransactionType.Purchase,
          amount: -Math.round(input.price),
          description: input.description,
          referenceType: 'Shop',
        },
      });

      await tx.player.update({
        where: { id: player.id },
        data: {
          ...(e.morale !== undefined && {
            morale: clamp(player.morale + e.morale),
          }),
          ...(e.happiness !== undefined && {
            happiness: clamp(player.happiness + e.happiness),
          }),
          ...(e.motivation !== undefined && {
            motivation: clamp(player.motivation + e.motivation),
          }),
          ...(e.mentalHealth !== undefined && {
            mentalHealth: clamp(player.mentalHealth + e.mentalHealth),
          }),
          ...(e.stress !== undefined && {
            stress: clamp(player.stress + e.stress),
          }),
          ...(e.popularity !== undefined && {
            popularity: clampFame(player.popularity + e.popularity),
          }),
          ...(e.reputation !== undefined && {
            reputation: clampFame(player.reputation + e.reputation),
          }),
          ...(e.condition !== undefined && {
            condition: clamp(player.condition + e.condition),
          }),
          ...(e.fatigue !== undefined && {
            fatigue: clamp(player.fatigue + e.fatigue),
          }),
        },
      });
    });

    const aggregate = await this.prisma.financialTransaction.aggregate({
      where: { playerId: player.id },
      _sum: { amount: true },
    });
    return aggregate._sum.amount ?? 0;
  }
}

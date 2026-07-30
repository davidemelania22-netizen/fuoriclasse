import type { ShopItemEffect } from '@football-life/shared';

export interface ApplyPurchaseInput {
  saveGameId: string;
  price: number;
  description: string;
  effects: ShopItemEffect;
}

export interface ShopRepository {
  /**
   * Atomically charge the wallet and apply the item's clamped effects to the
   * protagonist. Returns the new balance, or null if the save is unknown.
   */
  applyPurchase(input: ApplyPurchaseInput): Promise<number | null>;
}

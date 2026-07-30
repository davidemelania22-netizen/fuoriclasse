import type { RandomSource } from '../random/random-source';

/**
 * A coarse AI transfer market: stronger, richer clubs poach good players from
 * weaker ones between seasons. Deliberately currentAbility-level (like NPC
 * aging) — NPC individual attributes aren't surfaced, and this keeps the world
 * visibly moving without a full scouting/negotiation model.
 */

export interface MarketClub {
  id: string;
  name: string;
  reputation: number;
  transferBudget: number;
}

export interface MarketPlayer {
  id: string;
  name: string;
  clubId: string;
  currentAbility: number;
  marketValue: number;
}

export interface PlannedTransfer {
  playerId: string;
  playerName: string;
  fromClubId: string;
  toClubId: string;
  fee: number;
  ability: number;
}

/** A club won't sell below this many players in the window. */
const MIN_SQUAD = 11;
/** Only genuinely useful players are worth moving. */
const MIN_ABILITY = 55;

export function selectTransfers(
  clubs: readonly MarketClub[],
  players: readonly MarketPlayer[],
  rng: RandomSource,
  maxTransfers: number,
): PlannedTransfer[] {
  if (clubs.length < 2 || players.length === 0) return [];

  const budgets = new Map(clubs.map((c) => [c.id, c.transferBudget]));
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const squadSize = new Map<string, number>();
  for (const player of players) {
    squadSize.set(player.clubId, (squadSize.get(player.clubId) ?? 0) + 1);
  }

  const moved = new Set<string>();
  const transfers: PlannedTransfer[] = [];
  // Buyers are weighted by reputation: bigger clubs shop more aggressively.
  const attempts = maxTransfers * 4;

  for (let i = 0; i < attempts && transfers.length < maxTransfers; i += 1) {
    const eligibleBuyers = clubs.filter((c) => (budgets.get(c.id) ?? 0) > 0);
    if (eligibleBuyers.length === 0) break;
    const buyer = rng.weightedPick(
      eligibleBuyers.map((c) => ({ value: c, weight: Math.max(1, c.reputation) })),
    );
    const budget = budgets.get(buyer.id) ?? 0;

    // Best affordable target from a weaker club that can spare the player.
    let best: MarketPlayer | null = null;
    for (const player of players) {
      if (moved.has(player.id)) continue;
      if (player.clubId === buyer.id) continue;
      if (player.currentAbility < MIN_ABILITY) continue;
      if (player.marketValue > budget) continue;
      const seller = clubById.get(player.clubId);
      if (!seller || seller.reputation >= buyer.reputation) continue;
      if ((squadSize.get(player.clubId) ?? 0) <= MIN_SQUAD) continue;
      if (!best || player.currentAbility > best.currentAbility) best = player;
    }
    if (!best) continue;

    const fee = best.marketValue;
    transfers.push({
      playerId: best.id,
      playerName: best.name,
      fromClubId: best.clubId,
      toClubId: buyer.id,
      fee,
      ability: Math.round(best.currentAbility),
    });
    moved.add(best.id);
    budgets.set(buyer.id, budget - fee);
    squadSize.set(best.clubId, (squadSize.get(best.clubId) ?? 0) - 1);
    squadSize.set(buyer.id, (squadSize.get(buyer.id) ?? 0) + 1);
  }

  return transfers;
}

import { describe, expect, it } from 'vitest';
import { createRandomSource } from '../random/seeded-random';
import {
  selectTransfers,
  type MarketClub,
  type MarketPlayer,
} from './transfer-market';

function makeWorld(): { clubs: MarketClub[]; players: MarketPlayer[] } {
  const clubs: MarketClub[] = [
    {
      id: 'big',
      name: 'Big FC',
      reputation: 5000,
      transferBudget: 100_000_000,
    },
    { id: 'mid', name: 'Mid FC', reputation: 2500, transferBudget: 10_000_000 },
    {
      id: 'small',
      name: 'Small FC',
      reputation: 800,
      transferBudget: 1_000_000,
    },
  ];
  const players: MarketPlayer[] = [];
  for (const club of clubs) {
    for (let i = 0; i < 14; i += 1) {
      players.push({
        id: `${club.id}-p${i}`,
        name: `${club.id} Player ${i}`,
        clubId: club.id,
        currentAbility: 50 + i * 3, // 50..89
        marketValue: 2_000_000,
      });
    }
  }
  return { clubs, players };
}

describe('selectTransfers', () => {
  it('is deterministic for the same seed and empty for a trivial world', () => {
    const { clubs, players } = makeWorld();
    const a = selectTransfers(clubs, players, createRandomSource('t'), 6);
    const b = selectTransfers(clubs, players, createRandomSource('t'), 6);
    expect(a).toEqual(b);
    expect(selectTransfers([], [], createRandomSource('t'), 6)).toEqual([]);
    expect(selectTransfers(clubs, players, createRandomSource('t'), 0)).toEqual(
      [],
    );
  });

  it('only moves good players to richer, higher-reputation clubs', () => {
    const { clubs, players } = makeWorld();
    const repById = new Map(clubs.map((c) => [c.id, c.reputation]));
    const transfers = selectTransfers(
      clubs,
      players,
      createRandomSource('market'),
      8,
    );
    expect(transfers.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const t of transfers) {
      // Buyers outrank sellers.
      expect(repById.get(t.toClubId)!).toBeGreaterThan(
        repById.get(t.fromClubId)!,
      );
      expect(t.ability).toBeGreaterThanOrEqual(55); // only useful players
      expect(seen.has(t.playerId)).toBe(false); // never moved twice
      seen.add(t.playerId);
    }
  });

  it('never sells a club below the minimum squad size', () => {
    // A single weak club with exactly 12 players facing a rich giant: at most
    // one can leave before hitting the 11-player floor.
    const clubs: MarketClub[] = [
      { id: 'rich', name: 'Rich', reputation: 9000, transferBudget: 1e9 },
      { id: 'poor', name: 'Poor', reputation: 500, transferBudget: 0 },
    ];
    const players: MarketPlayer[] = [];
    for (let i = 0; i < 12; i += 1) {
      players.push({
        id: `poor-p${i}`,
        name: `Poor ${i}`,
        clubId: 'poor',
        currentAbility: 70,
        marketValue: 1_000_000,
      });
    }
    const transfers = selectTransfers(
      clubs,
      players,
      createRandomSource('floor'),
      10,
    );
    expect(transfers.length).toBe(1);
  });

  it('respects buyer budgets', () => {
    const clubs: MarketClub[] = [
      {
        id: 'buyer',
        name: 'Buyer',
        reputation: 9000,
        transferBudget: 2_500_000,
      },
      { id: 'seller', name: 'Seller', reputation: 500, transferBudget: 0 },
    ];
    const players: MarketPlayer[] = [];
    for (let i = 0; i < 14; i += 1) {
      players.push({
        id: `seller-p${i}`,
        name: `S${i}`,
        clubId: 'seller',
        currentAbility: 75,
        marketValue: 2_000_000,
      });
    }
    // Budget 2.5M only affords a single 2M signing.
    const transfers = selectTransfers(
      clubs,
      players,
      createRandomSource('budget'),
      10,
    );
    expect(transfers).toHaveLength(1);
    expect(transfers[0]!.toClubId).toBe('buyer');
  });
});

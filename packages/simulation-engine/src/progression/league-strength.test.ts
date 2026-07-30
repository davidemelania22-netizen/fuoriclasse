import { describe, expect, it } from 'vitest';
import {
  leagueGrowthModifier,
  leagueScoutAttention,
  leagueStrengthFactor,
  leagueStrengthLabel,
  leagueStrengthStars,
  reputationGainFromMatch,
} from './league-strength';

describe('leagueStrengthFactor', () => {
  it('gives the top league the full weight and weaker ones less', () => {
    expect(leagueStrengthFactor(4500, 4500)).toBe(1);
    const second = leagueStrengthFactor(1800, 4500);
    expect(second).toBeGreaterThan(0.4);
    expect(second).toBeLessThan(1);
  });

  it('is monotone: a stronger league always counts for more', () => {
    const reputations = [400, 900, 1800, 3000, 4500];
    const factors = reputations.map((r) => leagueStrengthFactor(r, 4500));
    for (let i = 1; i < factors.length; i += 1) {
      expect(factors[i]!).toBeGreaterThan(factors[i - 1]!);
    }
  });

  it('never drops to zero, and survives odd inputs', () => {
    expect(leagueStrengthFactor(1, 4500)).toBeGreaterThan(0.4);
    expect(leagueStrengthFactor(-10, 4500)).toBeGreaterThan(0.4);
    expect(leagueStrengthFactor(9999, 4500)).toBe(1);
    expect(leagueStrengthFactor(1000, 0)).toBe(1);
  });

  it('labels and stars follow the factor', () => {
    expect(leagueStrengthLabel(1)).toBe('Campionato di vertice');
    expect(leagueStrengthLabel(0.45)).toBe('Campionato di provincia');
    expect(leagueStrengthStars(1)).toBe(5);
    expect(leagueStrengthStars(0.45)).toBe(1);
  });
});

describe('what the league does to a career', () => {
  const top = leagueStrengthFactor(4500, 4500);
  const bottom = leagueStrengthFactor(400, 4500);

  it('develops players faster at the top, but never freezes them at the bottom', () => {
    expect(leagueGrowthModifier(top)).toBeGreaterThan(1);
    expect(leagueGrowthModifier(bottom)).toBeLessThan(1);
    // The nudge stays a nudge: talent still decides more than the shirt.
    expect(leagueGrowthModifier(bottom)).toBeGreaterThan(0.8);
  });

  it('puts more scouts in the stands the bigger the league', () => {
    expect(leagueScoutAttention(top)).toBeGreaterThan(
      leagueScoutAttention(bottom),
    );
    expect(leagueScoutAttention(bottom)).toBeGreaterThan(0);
  });

  it('makes the same performance worth more in a big league', () => {
    const game = { rating: 8, goals: 2, assists: 1 };
    const atTop = reputationGainFromMatch(game, top);
    const atBottom = reputationGainFromMatch(game, bottom);
    expect(atTop).toBeGreaterThan(atBottom);
    expect(atBottom).toBeGreaterThan(0);
  });

  it('costs less for a bad game than a good one earns, and ignores the average', () => {
    const good = reputationGainFromMatch(
      { rating: 8, goals: 0, assists: 0 },
      1,
    );
    const bad = reputationGainFromMatch(
      { rating: 4.8, goals: 0, assists: 0 },
      1,
    );
    expect(bad).toBeLessThan(0);
    expect(Math.abs(bad)).toBeLessThan(good);
    // A 6.4 with nothing to show for it leaves the player where they were.
    expect(
      reputationGainFromMatch({ rating: 6.4, goals: 0, assists: 0 }, 1),
    ).toBe(0);
  });
});

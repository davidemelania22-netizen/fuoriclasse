import { describe, expect, it } from 'vitest';
import { transferWindowAt, transferWindowLabel } from './transfer-window';
import {
  negotiate,
  negotiationOdds,
  roleAbove,
  type NegotiationInput,
} from './negotiation';
import { createRandomSource } from '../random/seeded-random';

const WEEK = 7 * 86_400_000;
const SEASON_START = new Date('2024-08-17T00:00:00.000Z');
const at = (weeksFromKickOff: number) =>
  new Date(SEASON_START.getTime() + weeksFromKickOff * WEEK);

describe('transfer window', () => {
  it('is open through pre-season and the first weeks', () => {
    for (const week of [-8, -6, -3, 0, 1, 2]) {
      const state = transferWindowAt(at(week), SEASON_START);
      expect(state.isOpen).toBe(true);
      expect(state.kind).toBe('SUMMER');
    }
  });

  it('is open on the day a new career starts', () => {
    // Careers begin on 1 July against a mid-August kick-off: the very first
    // thing a player does is look for a club, so the market cannot be shut.
    const state = transferWindowAt(
      new Date('2024-07-01T00:00:00.000Z'),
      SEASON_START,
    );
    expect(state.isOpen).toBe(true);
    expect(state.kind).toBe('SUMMER');
  });

  it('is shut in the middle of autumn', () => {
    const state = transferWindowAt(at(8), SEASON_START);
    expect(state.isOpen).toBe(false);
    expect(state.kind).toBe('WINTER');
    expect(state.daysAway).toBeGreaterThan(0);
  });

  it('opens again around the halfway point', () => {
    expect(transferWindowAt(at(19), SEASON_START).isOpen).toBe(true);
    expect(transferWindowAt(at(19), SEASON_START).kind).toBe('WINTER');
    expect(transferWindowAt(at(22), SEASON_START).isOpen).toBe(false);
  });

  it('counts the days down to the deadline while open', () => {
    const early = transferWindowAt(at(18), SEASON_START);
    const late = transferWindowAt(at(20), SEASON_START);
    expect(early.isOpen && late.isOpen).toBe(true);
    expect(late.daysAway).toBeLessThan(early.daysAway);
  });

  it('points at the next window once the winter one shuts', () => {
    const state = transferWindowAt(at(30), SEASON_START);
    expect(state.isOpen).toBe(false);
    expect(state.kind).toBe('SUMMER');
    // The next summer window, not the one that already went by.
    expect(state.opensAt.getTime()).toBeGreaterThan(at(30).getTime());
  });

  it('names both windows', () => {
    expect(transferWindowLabel('SUMMER')).toBe('Mercato estivo');
    expect(transferWindowLabel('WINTER')).toBe('Mercato invernale');
  });
});

const base: NegotiationInput = {
  ask: 'WAGE',
  currentAbility: 70,
  clubReputation: 3000,
  offeredWage: 10_000,
  squadRole: 'ROTATION',
  marketValue: 5_000_000,
};

describe('negotiation', () => {
  it('never promises a certainty in either direction', () => {
    for (const ability of [20, 50, 80, 100]) {
      const odds = negotiationOdds({ ...base, currentAbility: ability });
      expect(odds.successChance).toBeGreaterThan(0);
      expect(odds.successChance).toBeLessThan(1);
    }
  });

  it('gives a better player more leverage', () => {
    const weak = negotiationOdds({ ...base, currentAbility: 45 });
    const strong = negotiationOdds({ ...base, currentAbility: 95 });
    expect(strong.successChance).toBeGreaterThan(weak.successChance);
  });

  it('is harder against a club that already bid generously', () => {
    const lowball = negotiationOdds({ ...base, offeredWage: 2_000 });
    const generous = negotiationOdds({ ...base, offeredWage: 60_000 });
    expect(generous.successChance).toBeLessThan(lowball.successChance);
  });

  it('makes a shirt at a big club harder to claim', () => {
    const small = negotiationOdds({
      ...base,
      ask: 'ROLE',
      clubReputation: 800,
    });
    const giant = negotiationOdds({
      ...base,
      ask: 'ROLE',
      clubReputation: 9000,
    });
    expect(giant.successChance).toBeLessThan(small.successChance);
  });

  it('refuses to promote someone already at the top', () => {
    const odds = negotiationOdds({ ...base, ask: 'ROLE', squadRole: 'KEY' });
    expect(odds.successChance).toBe(0);
    expect(roleAbove('KEY')).toBeNull();
    expect(roleAbove('BACKUP')).toBe('ROTATION');
  });

  it('pays a raise on a yes and a token on a no', () => {
    const rng = createRandomSource('negotiation-wage');
    let raised = 0;
    let trimmed = 0;
    for (let i = 0; i < 200; i += 1) {
      const result = negotiate(base, rng);
      if (result.succeeded) {
        expect(result.weeklyWage).toBe(12_500);
        raised += 1;
      } else {
        expect(result.weeklyWage).toBe(10_500);
        trimmed += 1;
      }
    }
    // Both outcomes actually happen at these odds.
    expect(raised).toBeGreaterThan(0);
    expect(trimmed).toBeGreaterThan(0);
  });

  it('moves the role exactly one rung when the ask lands', () => {
    const rng = createRandomSource('negotiation-role');
    for (let i = 0; i < 100; i += 1) {
      const result = negotiate({ ...base, ask: 'ROLE' }, rng);
      expect(result.squadRole).toBe(
        result.succeeded ? 'FIRST_TEAM' : 'ROTATION',
      );
      expect(result.weeklyWage).toBe(base.offeredWage);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = negotiate(base, createRandomSource('same'));
    const b = negotiate(base, createRandomSource('same'));
    expect(a).toEqual(b);
  });
});

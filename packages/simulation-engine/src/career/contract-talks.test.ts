import { describe, expect, it } from 'vitest';
import {
  clampProposal,
  clubCeiling,
  packageCost,
  respondToProposal,
  TERM_LIMITS,
  type ContractPackage,
  type TalksLeverage,
} from './contract-talks';
import { createRandomSource } from '../random/seeded-random';

const baseline: ContractPackage = {
  years: 3,
  weeklyWage: 10_000,
  signingBonus: 200_000,
  appearanceBonus: 1_000,
  goalBonus: 5_000,
  squadRole: 'ROTATION',
};

const leverage: TalksLeverage = {
  currentAbility: 70,
  clubReputation: 3_000,
  marketValue: 5_000_000,
  expiringSoon: false,
};

const rng = () => createRandomSource('talks');

const round = (proposal: ContractPackage, patience = 3, over = {}) =>
  respondToProposal(
    { baseline, clubPosition: baseline, proposal, leverage, patience, ...over },
    rng(),
  );

describe('packageCost', () => {
  it('prices one season: wages, bonuses and a share of the signing fee', () => {
    const wages = 10_000 * 52;
    const bonuses = 1_000 * 30 + 5_000 * 8;
    // Three years is the neutral length and rotation the neutral shirt.
    expect(packageCost(baseline)).toBeCloseTo(wages + bonuses + 200_000 / 3, 0);
  });

  it('charges a little more per season for a longer commitment, not a multiple', () => {
    const long = packageCost({ ...baseline, years: 5 });
    const short = packageCost(baseline);
    expect(long).toBeGreaterThan(short);
    // The point of annualising: five years is not 1.6x three years.
    expect(long / short).toBeLessThan(1.15);
  });

  it('prices a bigger shirt above a smaller one', () => {
    expect(packageCost({ ...baseline, squadRole: 'KEY' })).toBeGreaterThan(
      packageCost({ ...baseline, squadRole: 'BACKUP' }),
    );
  });

  it('lets one term be traded for another', () => {
    // Give up the goal bonus, take the money on the wage instead.
    const swapped = packageCost({
      ...baseline,
      goalBonus: 0,
      weeklyWage: 10_000 + (5_000 * 8) / 52,
    });
    expect(swapped).toBeCloseTo(packageCost(baseline), 0);
  });
});

describe('clubCeiling', () => {
  it('gives a better player more room', () => {
    expect(clubCeiling({ ...leverage, currentAbility: 95 })).toBeGreaterThan(
      clubCeiling({ ...leverage, currentAbility: 45 }),
    );
  });

  it('gives a richer club more room', () => {
    expect(clubCeiling({ ...leverage, clubReputation: 9_000 })).toBeGreaterThan(
      clubCeiling({ ...leverage, clubReputation: 500 }),
    );
  });

  it('pays more for a player it could lose for nothing', () => {
    expect(clubCeiling({ ...leverage, expiringSoon: true })).toBeGreaterThan(
      clubCeiling(leverage),
    );
  });

  it('never opens the chequebook completely', () => {
    const most = clubCeiling({
      currentAbility: 100,
      clubReputation: 100_000,
      marketValue: 200_000_000,
      expiringSoon: true,
    });
    expect(most).toBeLessThan(1.7);
  });
});

describe('respondToProposal', () => {
  it('accepts a package that costs about what it already offered', () => {
    expect(round(baseline).verdict).toBe('ACCEPT');
    expect(round({ ...baseline, weeklyWage: 10_500 }).verdict).toBe('ACCEPT');
  });

  it('counters a greedy but not absurd ask', () => {
    const response = round({ ...baseline, weeklyWage: 15_000 });
    expect(response.verdict).toBe('COUNTER');
    // The counter sits between the two, never below where the club stood.
    expect(response.terms.weeklyWage).toBeGreaterThanOrEqual(
      baseline.weeklyWage,
    );
    expect(response.terms.weeklyWage).toBeLessThan(15_000);
  });

  it('refuses an ask that is off the scale, and remembers it', () => {
    const response = round({ ...baseline, weeklyWage: 40_000 });
    expect(response.verdict).toBe('REJECT');
    expect(response.patienceLeft).toBe(1); // an outrage costs two
    expect(response.terms).toEqual(baseline);
  });

  it('walks out when patience is gone', () => {
    const response = round({ ...baseline, weeklyWage: 15_000 }, 1);
    expect(response.verdict).toBe('WALKED_OUT');
    expect(response.patienceLeft).toBe(0);
  });

  it('grants the shirt when it costs the club little', () => {
    // A rung up with everything else untouched is inside the premium.
    const response = round({ ...baseline, squadRole: 'FIRST_TEAM' });
    expect(['ACCEPT', 'COUNTER']).toContain(response.verdict);
    if (response.verdict === 'COUNTER') {
      expect(response.terms.squadRole).toBe('FIRST_TEAM');
    }
  });

  it('keeps its own shirt when the ask is expensive on every front', () => {
    const response = round({
      ...baseline,
      squadRole: 'KEY',
      weeklyWage: 18_000,
    });
    expect(response.terms.squadRole).toBe('ROTATION');
  });

  it('concedes the length the player asked for when it counters', () => {
    const response = round({ ...baseline, years: 5, weeklyWage: 13_000 });
    expect(response.verdict).toBe('COUNTER');
    expect(response.terms.years).toBe(5);
  });

  it('will sign a longer deal at the same money', () => {
    // Length alone must never be what kills a negotiation.
    expect(round({ ...baseline, years: 5 }).verdict).toBe('ACCEPT');
  });

  it('replays identically for the same seed', () => {
    const proposal = { ...baseline, weeklyWage: 15_000 };
    expect(round(proposal)).toEqual(round(proposal));
  });
});

describe('clampProposal', () => {
  it('holds every term inside what anyone could ask', () => {
    const wild = clampProposal(
      {
        years: 40,
        weeklyWage: 10_000_000,
        signingBonus: 999_999_999,
        appearanceBonus: -50,
        goalBonus: 999_999,
        squadRole: 'KEY',
      },
      baseline,
    );
    expect(wild.years).toBe(TERM_LIMITS.years.max);
    expect(wild.weeklyWage).toBe(
      baseline.weeklyWage * TERM_LIMITS.weeklyWage.max,
    );
    expect(wild.appearanceBonus).toBeGreaterThanOrEqual(0);
  });

  it('still lets a fee be asked of a club that opened without one', () => {
    const noFee = { ...baseline, signingBonus: 0 };
    const asked = clampProposal({ ...noFee, signingBonus: 30_000 }, noFee);
    expect(asked.signingBonus).toBeGreaterThan(0);
  });
});

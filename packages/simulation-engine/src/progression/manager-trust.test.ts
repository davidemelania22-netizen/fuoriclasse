import { describe, expect, it } from 'vitest';
import {
  effectiveRoleBaseline,
  roleBaseline,
  roleFromTrust,
  selectionBiasFromTrust,
  trustAfterMatch,
  trustWhenBenched,
} from './manager-trust';

describe('effectiveRoleBaseline', () => {
  it('leaves a settled player judged by his contract', () => {
    expect(effectiveRoleBaseline('KEY', false)).toBe(roleBaseline('KEY'));
    expect(effectiveRoleBaseline('PROSPECT', false)).toBe(
      roleBaseline('PROSPECT'),
    );
  });

  it('judges a borrowed prospect as a first-team player', () => {
    // A club borrows a young player to play him; being measured against the
    // parent club's prospect role is what kept him on the bench on loan too.
    expect(effectiveRoleBaseline('PROSPECT', true)).toBeGreaterThan(
      roleBaseline('PROSPECT'),
    );
    expect(effectiveRoleBaseline('PROSPECT', true)).toBe(
      roleBaseline('FIRST_TEAM'),
    );
  });

  it('never demotes a star who goes out on loan', () => {
    expect(effectiveRoleBaseline('KEY', true)).toBe(roleBaseline('KEY'));
  });
});

describe('roleBaseline', () => {
  it('anchors higher trust for more important contractual roles', () => {
    expect(roleBaseline('KEY')).toBeGreaterThan(roleBaseline('FIRST_TEAM'));
    expect(roleBaseline('FIRST_TEAM')).toBeGreaterThan(roleBaseline('BACKUP'));
    expect(roleBaseline('PROSPECT')).toBeLessThan(roleBaseline('ROTATION'));
  });

  it('falls back to a neutral baseline for unknown/absent roles', () => {
    expect(roleBaseline(null)).toBe(48);
    expect(roleBaseline('WHATEVER')).toBe(48);
  });
});

describe('trustAfterMatch', () => {
  it('rises after a strong performance and falls after a poor one', () => {
    const start = 50;
    const good = trustAfterMatch(start, {
      rating: 8,
      goals: 1,
      assists: 0,
      redCards: 0,
    });
    const bad = trustAfterMatch(start, {
      rating: 4.5,
      goals: 0,
      assists: 0,
      redCards: 0,
    });
    expect(good).toBeGreaterThan(start);
    expect(bad).toBeLessThan(start);
  });

  it('builds toward the top over a run of great games and collapses over bad ones', () => {
    let hot = 50;
    let cold = 50;
    for (let i = 0; i < 10; i += 1) {
      hot = trustAfterMatch(hot, {
        rating: 8.5,
        goals: 1,
        assists: 1,
        redCards: 0,
      });
      cold = trustAfterMatch(cold, {
        rating: 4,
        goals: 0,
        assists: 0,
        redCards: 0,
      });
    }
    expect(hot).toBeGreaterThan(80); // crosses into "Inamovibile" territory
    expect(cold).toBeLessThan(25);
  });

  it('punishes a red card', () => {
    const clean = trustAfterMatch(50, {
      rating: 6.4,
      goals: 0,
      assists: 0,
      redCards: 0,
    });
    const sentOff = trustAfterMatch(50, {
      rating: 6.4,
      goals: 0,
      assists: 0,
      redCards: 1,
    });
    expect(sentOff).toBeLessThan(clean);
  });

  it('stays within [0, 100]', () => {
    expect(
      trustAfterMatch(2, { rating: 3, goals: 0, assists: 0, redCards: 2 }),
    ).toBeGreaterThanOrEqual(0);
    expect(
      trustAfterMatch(98, { rating: 10, goals: 4, assists: 3, redCards: 0 }),
    ).toBeLessThanOrEqual(100);
  });
});

describe('trustWhenBenched', () => {
  it('drifts toward the role baseline from both directions', () => {
    expect(trustWhenBenched(90, 50)).toBeLessThan(90);
    expect(trustWhenBenched(20, 50)).toBeGreaterThan(20);
    expect(trustWhenBenched(90, 50)).toBeGreaterThan(50);
    expect(trustWhenBenched(20, 50)).toBeLessThan(50);
  });

  it('converges to the baseline over many idle weeks', () => {
    let trust = 95;
    for (let i = 0; i < 40; i += 1) trust = trustWhenBenched(trust, 50);
    expect(trust).toBeCloseTo(50, 0);
  });
});

describe('roleFromTrust', () => {
  it('maps trust bands to escalating squad standing', () => {
    expect(roleFromTrust(90).key).toBe('UNDROPPABLE');
    expect(roleFromTrust(70).key).toBe('STARTER');
    expect(roleFromTrust(50).key).toBe('ROTATION');
    expect(roleFromTrust(30).key).toBe('FRINGE');
    expect(roleFromTrust(10).key).toBe('OUTCAST');
  });
});

describe('selectionBiasFromTrust', () => {
  it('is neutral at 50 and signed by trust either side', () => {
    expect(selectionBiasFromTrust(50)).toBe(0);
    expect(selectionBiasFromTrust(90)).toBeGreaterThan(0);
    expect(selectionBiasFromTrust(10)).toBeLessThan(0);
  });
});

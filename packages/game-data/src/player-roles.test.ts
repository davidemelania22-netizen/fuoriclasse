import { describe, expect, it } from 'vitest';
import {
  PLAYER_ROLES,
  PLAYER_TRAITS,
  rateRoles,
  traitsOf,
} from './player-roles';

/** Everything at the same 0-20 value, then whatever the test wants on top. */
function values(base: number, overrides: Record<string, number> = {}) {
  const keys = new Set<string>();
  for (const role of PLAYER_ROLES) {
    for (const key of Object.keys(role.weights)) keys.add(key);
  }
  for (const trait of PLAYER_TRAITS) {
    for (const key of Object.keys(trait.needs)) keys.add(key);
  }
  const map: Record<string, number> = {};
  for (const key of keys) map[key] = base;
  return { ...map, ...overrides };
}

describe('roles', () => {
  it('gives five stars to a player maxed at everything', () => {
    const rated = rateRoles(values(20), 'FW');
    const natural = rated.filter((r) => r.natural);
    expect(natural.length).toBeGreaterThan(0);
    for (const role of natural) expect(role.stars).toBe(5);
  });

  it('gives nothing to a player at zero', () => {
    for (const role of rateRoles(values(0), 'FW')) expect(role.stars).toBe(0);
  });

  it('ranks the role the player is actually built for first', () => {
    // A poacher: finishes, times his run, keeps his head — and nothing else.
    const poacher = rateRoles(
      values(6, {
        finishing: 20,
        anticipation: 20,
        composure: 20,
        firstTouch: 18,
        heading: 16,
      }),
      'FW',
    );
    expect(poacher[0]?.key).toBe('FW_POACHER');

    // A target man: heads, holds it up, wins the duel.
    const target = rateRoles(
      values(6, { heading: 20, strength: 20, jumping: 20, bravery: 18 }),
      'FW',
    );
    expect(target[0]?.key).toBe('FW_TARGET');
  });

  it('marks roles outside the position and rates them lower', () => {
    const balanced = values(16);
    const asStriker = rateRoles(balanced, 'FW');
    const poacherAsStriker = asStriker.find((r) => r.key === 'FW_POACHER')!;
    const poacherAsKeeper = rateRoles(balanced, 'GK').find(
      (r) => r.key === 'FW_POACHER',
    )!;

    expect(poacherAsStriker.natural).toBe(true);
    expect(poacherAsKeeper.natural).toBe(false);
    expect(poacherAsKeeper.stars).toBeLessThan(poacherAsStriker.stars);
  });

  it('always returns half-star steps inside 0-5', () => {
    for (const base of [3, 7, 11, 13, 17, 19]) {
      for (const role of rateRoles(values(base), 'MF')) {
        expect(role.stars).toBeGreaterThanOrEqual(0);
        expect(role.stars).toBeLessThanOrEqual(5);
        expect(role.stars * 2).toBe(Math.round(role.stars * 2));
      }
    }
  });

  it('has no duplicate keys or labels in the catalogue', () => {
    expect(new Set(PLAYER_ROLES.map((r) => r.key)).size).toBe(
      PLAYER_ROLES.length,
    );
    expect(new Set(PLAYER_ROLES.map((r) => r.label)).size).toBe(
      PLAYER_ROLES.length,
    );
  });
});

describe('traits', () => {
  it('gives none to an ordinary player and all of them to a perfect one', () => {
    expect(traitsOf(values(10))).toEqual([]);
    expect(traitsOf(values(20)).length).toBe(PLAYER_TRAITS.length);
  });

  it('earns a trait only when every attribute behind it gets there', () => {
    // "Tira con potenza" wants shooting AND the body to hit it.
    expect(
      traitsOf(values(5, { longShots: 20 })).some(
        (t) => t.key === 'SHOOTS_POWER',
      ),
    ).toBe(false);
    expect(
      traitsOf(values(5, { longShots: 20, strength: 20 })).some(
        (t) => t.key === 'SHOOTS_POWER',
      ),
    ).toBe(true);
  });

  it('is a single attribute away from being lost again', () => {
    const earned = values(5, { determination: 16 });
    expect(traitsOf(earned).some((t) => t.key === 'NEVER_GIVES_UP')).toBe(true);
    const declined = { ...earned, determination: 15 };
    expect(traitsOf(declined).some((t) => t.key === 'NEVER_GIVES_UP')).toBe(
      false,
    );
  });

  it('has no duplicate keys or labels in the catalogue', () => {
    expect(new Set(PLAYER_TRAITS.map((t) => t.key)).size).toBe(
      PLAYER_TRAITS.length,
    );
    expect(new Set(PLAYER_TRAITS.map((t) => t.label)).size).toBe(
      PLAYER_TRAITS.length,
    );
  });
});

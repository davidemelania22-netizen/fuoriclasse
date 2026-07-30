import { describe, expect, it } from 'vitest';
import { createRandomSource } from '../random/seeded-random';
import {
  defaultManagerName,
  planSackings,
  type SackingClub,
} from './sackings';

const NAMES = ['Mister Bianchi', 'Mister Verdi', 'Mister Neri', 'Mister Blu'];

function club(
  id: string,
  reputationRank: number,
  finalPosition: number,
): SackingClub {
  return {
    id,
    name: `Club ${id}`,
    reputationRank,
    finalPosition,
    managerName: `Coach ${id}`,
  };
}

describe('planSackings', () => {
  it('always sacks after a disaster and never after meeting expectations', () => {
    const clubs = [
      club('disaster', 1, 8), // giant finishing 8th: certain sacking
      club('fine', 2, 2), // met expectations: safe
      club('overachiever', 8, 1), // overachieved: safe
    ];
    const sackings = planSackings(clubs, NAMES, createRandomSource('s'));
    expect(sackings.map((s) => s.clubId)).toEqual(['disaster']);
    const sacked = sackings[0]!;
    expect(sacked.sackedManager).toBe('Coach disaster');
    expect(NAMES).toContain(sacked.newManager);
    expect(sacked.newManager).not.toBe(sacked.sackedManager);
  });

  it('sacks borderline underachievers only sometimes', () => {
    let fired = 0;
    for (let i = 0; i < 60; i += 1) {
      const result = planSackings(
        [club('meh', 2, 6)], // gap 4: coin-flip territory
        NAMES,
        createRandomSource(`flip:${i}`),
      );
      fired += result.length;
    }
    expect(fired).toBeGreaterThan(10);
    expect(fired).toBeLessThan(50);
  });

  it('is deterministic per seed', () => {
    const clubs = [club('a', 1, 9), club('b', 2, 8)];
    const x = planSackings(clubs, NAMES, createRandomSource('det'));
    const y = planSackings(clubs, NAMES, createRandomSource('det'));
    expect(x).toEqual(y);
  });
});

describe('defaultManagerName', () => {
  it('is stable per club id and drawn from the pool', () => {
    const a = defaultManagerName('club-123', NAMES);
    expect(defaultManagerName('club-123', NAMES)).toBe(a);
    expect(NAMES).toContain(a);
    expect(defaultManagerName('x', [])).toBe('Mister');
  });
});

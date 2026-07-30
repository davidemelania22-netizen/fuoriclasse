import { describe, expect, it } from 'vitest';
import { createRandomSource } from '../random/seeded-random';
import {
  pickScoutingClubs,
  scoutInterestAfterMatch,
  scoutInterestIdle,
  SCOUT_OFFER_THRESHOLD,
} from './scouting';

const CLUBS = [
  { id: 'giant', reputation: 9000 },
  { id: 'big', reputation: 5000 },
  { id: 'mid', reputation: 2500 },
];

describe('pickScoutingClubs', () => {
  it('is deterministic per seed and never picks the same club twice', () => {
    const open = new Map<string, number>();
    const a = pickScoutingClubs(CLUBS, open, createRandomSource('w'));
    const b = pickScoutingClubs(CLUBS, open, createRandomSource('w'));
    expect(a).toEqual(b);
    expect(a.length).toBeLessThanOrEqual(2);
    expect(new Set(a.map((c) => c.id)).size).toBe(a.length);
    expect(pickScoutingClubs([], open, createRandomSource('w'))).toEqual([]);
  });

  it('sends scouts roughly at the configured cadence, favouring big clubs', () => {
    const open = new Map<string, number>();
    let attended = 0;
    const byClub = new Map<string, number>();
    for (let i = 0; i < 400; i += 1) {
      const watchers = pickScoutingClubs(
        CLUBS,
        open,
        createRandomSource(`w:${i}`),
      );
      if (watchers.length > 0) attended += 1;
      for (const w of watchers) {
        byClub.set(w.id, (byClub.get(w.id) ?? 0) + 1);
      }
    }
    // P(at least one scout) = 1 - 0.4*0.7 = 0.72.
    expect(attended / 400).toBeGreaterThan(0.6);
    expect(attended / 400).toBeLessThan(0.85);
    // The giant's scouts show up more often than the mid club's.
    expect(byClub.get('giant') ?? 0).toBeGreaterThan(byClub.get('mid') ?? 0);
  });

  it('weights up clubs with an open dossier', () => {
    const noDossier = new Map<string, number>();
    const midDossier = new Map<string, number>([['mid', 50]]);
    let midPlain = 0;
    let midBoosted = 0;
    for (let i = 0; i < 400; i += 1) {
      if (
        pickScoutingClubs(CLUBS, noDossier, createRandomSource(`d:${i}`)).some(
          (c) => c.id === 'mid',
        )
      )
        midPlain += 1;
      if (
        pickScoutingClubs(CLUBS, midDossier, createRandomSource(`d:${i}`)).some(
          (c) => c.id === 'mid',
        )
      )
        midBoosted += 1;
    }
    expect(midBoosted).toBeGreaterThan(midPlain);
  });
});

describe('scoutInterestAfterMatch', () => {
  it('rises on a good game, falls on a poor one, clamped to [0,100]', () => {
    expect(scoutInterestAfterMatch(40, 8)).toBeGreaterThan(40);
    expect(scoutInterestAfterMatch(40, 4.5)).toBeLessThan(40);
    expect(scoutInterestAfterMatch(0, 3)).toBeLessThan(1);
    expect(scoutInterestAfterMatch(100, 10)).toBeLessThanOrEqual(100);
  });

  it('a run of standout games under the scouts crosses the offer threshold', () => {
    let interest = 0;
    for (let i = 0; i < 6; i += 1) {
      interest = scoutInterestAfterMatch(interest, 8.5);
    }
    expect(interest).toBeGreaterThan(SCOUT_OFFER_THRESHOLD);
  });
});

describe('scoutInterestIdle', () => {
  it('fades unattended dossiers and closes them near zero', () => {
    expect(scoutInterestIdle(50)).toBeLessThan(50);
    expect(scoutInterestIdle(50)).toBeGreaterThan(40);
    expect(scoutInterestIdle(1)).toBe(0);
    let interest = 60;
    for (let i = 0; i < 60; i += 1) interest = scoutInterestIdle(interest);
    expect(interest).toBe(0);
  });
});

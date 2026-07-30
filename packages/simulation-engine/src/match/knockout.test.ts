import { describe, expect, it } from 'vitest';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { createRandomSource } from '../random/seeded-random';
import { buildSquadPositions } from '../generation/player-generator';
import { simulateKnockout } from './knockout';
import type { MatchPlayer } from './types';

function makeSquad(clubId: string, ability: number): MatchPlayer[] {
  return buildSquadPositions(16).map((position, index) => ({
    id: `${clubId}-p${index}`,
    position,
    currentAbility: ability,
    form: 50,
    condition: 100,
    morale: 60,
    discipline: 60,
    finishing: ability,
  }));
}

function bracket(entrants: string[], twoLegged = false) {
  const squads = new Map<string, MatchPlayer[]>();
  entrants.forEach((id, i) =>
    // Higher seeds (earlier) are stronger.
    squads.set(id, makeSquad(id, 70 - i)),
  );
  return simulateKnockout({
    entrants,
    squads,
    config: DEFAULT_MATCH_CONFIG,
    rng: createRandomSource('knockout-test'),
    twoLegged,
  });
}

const clubs = (n: number) => Array.from({ length: n }, (_, i) => `c${i + 1}`);

describe('simulateKnockout', () => {
  it('produces exactly N-1 ties for a power-of-two field', () => {
    const r = bracket(clubs(8));
    expect(r.ties.length).toBe(7);
    expect(r.roundsCount).toBe(3);
    expect(clubs(8)).toContain(r.championClubId);
    expect(r.runnerUpClubId).not.toBe(r.championClubId);
  });

  it('handles non-power-of-two fields with byes (N-1 ties)', () => {
    const r = bracket(clubs(24)); // e.g. a national cup with 24 clubs
    expect(r.ties.length).toBe(23);
    expect(r.roundsCount).toBe(5); // 24 -> byes to 16 -> 8 -> 4 -> 2 -> 1
    expect(clubs(24)).toContain(r.championClubId);
  });

  it('is deterministic for the same seed', () => {
    const a = bracket(clubs(16));
    const b = bracket(clubs(16));
    expect(b.championClubId).toBe(a.championClubId);
    expect(b.ties.length).toBe(a.ties.length);
  });

  it('plays two legs per tie when twoLegged (final stays single-leg)', () => {
    const r = bracket(clubs(8), true);
    const final = r.ties[r.ties.length - 1]!;
    expect(final.legs.length).toBe(1); // final single-leg
    const semi = r.ties.find((t) => t.round === 2)!;
    expect(semi.legs.length).toBe(2); // earlier rounds two-legged
  });

  it('always resolves a winner (penalties on level ties)', () => {
    const r = bracket(clubs(4));
    for (const tie of r.ties) {
      expect([tie.homeClubId, tie.awayClubId]).toContain(tie.winnerClubId);
    }
    expect(r.championClubId).toBeTruthy();
  });
});

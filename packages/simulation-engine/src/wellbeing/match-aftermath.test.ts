import { describe, expect, it } from 'vitest';
import {
  conditionFromFatigue,
  matchAftermath,
  type MatchOutcome,
} from './match-aftermath';

const played = (over: Partial<MatchOutcome> = {}): MatchOutcome => ({
  played: true,
  minutes: 90,
  rating: 6.5,
  goals: 0,
  won: false,
  drew: true,
  ...over,
});

describe('matchAftermath', () => {
  it('a full match costs real fatigue', () => {
    expect(matchAftermath([played()]).fatigue).toBeCloseTo(19, 5);
  });

  it('twenty minutes off the bench cost a fraction of it', () => {
    const cameOn = matchAftermath([played({ minutes: 20 })]).fatigue;
    expect(cameOn).toBeLessThan(matchAftermath([played()]).fatigue);
    expect(cameOn).toBeGreaterThan(0);
  });

  it('a congested week costs more than a single game', () => {
    expect(matchAftermath([played(), played()]).fatigue).toBeCloseTo(38, 5);
  });

  it('winning lifts the mood, losing sinks it', () => {
    const win = matchAftermath([played({ won: true, drew: false })]).morale;
    const loss = matchAftermath([played({ won: false, drew: false })]).morale;
    expect(win).toBeGreaterThan(0);
    expect(loss).toBeLessThan(win);
  });

  it('a personal display counts even in a defeat', () => {
    const great = matchAftermath([
      played({ won: false, drew: false, rating: 8.5, goals: 2 }),
    ]).morale;
    const anonymous = matchAftermath([
      played({ won: false, drew: false, rating: 5 }),
    ]).morale;
    expect(great).toBeGreaterThan(anonymous);
  });

  it('being left out costs mood and no legs', () => {
    const benched = matchAftermath([played({ played: false, minutes: 0 })]);
    expect(benched.fatigue).toBe(0);
    expect(benched.morale).toBeLessThan(0);
  });

  it('caps the misery of a week spent watching', () => {
    const one = matchAftermath([played({ played: false })]).morale;
    const three = matchAftermath([
      played({ played: false }),
      played({ played: false }),
      played({ played: false }),
    ]).morale;
    expect(three).toBeLessThan(one);
    expect(three).toBeGreaterThanOrEqual(-4);
  });

  it('a quiet week changes nothing', () => {
    expect(matchAftermath([])).toEqual({ fatigue: 0, morale: 0 });
  });
});

describe('conditionFromFatigue', () => {
  it('is full when fresh and never falls through the floor', () => {
    expect(conditionFromFatigue(0)).toBe(100);
    expect(conditionFromFatigue(100)).toBe(10);
  });
});

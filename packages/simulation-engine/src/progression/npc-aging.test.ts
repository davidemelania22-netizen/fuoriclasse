import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESSION_CONFIG } from '@football-life/game-data';
import { projectNpcSeasonAbility } from './npc-aging';

const config = DEFAULT_PROGRESSION_CONFIG;

describe('projectNpcSeasonAbility', () => {
  it('grows a young player toward their potential', () => {
    const next = projectNpcSeasonAbility({
      currentAbility: 45,
      potentialAbility: 85,
      age: 18,
      config,
    });
    expect(next).toBeGreaterThan(45);
    expect(next).toBeLessThanOrEqual(85);
  });

  it('never grows a young player past their potential', () => {
    const next = projectNpcSeasonAbility({
      currentAbility: 84,
      potentialAbility: 85,
      age: 18,
      config,
    });
    expect(next).toBeLessThanOrEqual(85);
  });

  it('holds a prime player at their ceiling steady', () => {
    const next = projectNpcSeasonAbility({
      currentAbility: 80,
      potentialAbility: 80,
      age: 27,
      config,
    });
    expect(next).toBe(80);
  });

  it('declines a veteran, faster the older they are', () => {
    const early = projectNpcSeasonAbility({
      currentAbility: 80,
      potentialAbility: 90,
      age: 31,
      config,
    });
    const late = projectNpcSeasonAbility({
      currentAbility: 80,
      potentialAbility: 90,
      age: 37,
      config,
    });
    expect(early).toBeLessThan(80);
    expect(late).toBeLessThan(early);
    expect(late).toBeGreaterThanOrEqual(1);
  });
});

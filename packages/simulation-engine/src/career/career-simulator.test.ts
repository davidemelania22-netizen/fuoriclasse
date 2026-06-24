import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAREER_CONFIG,
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_RETIREMENT_CONFIG,
  DEFAULT_WELLBEING_CONFIG,
  INJURY_TYPES,
} from '@football-life/game-data';
import { mean } from '../util/math';
import { simulateCareer, type CareerOutcome } from './career-simulator';

const injuryTypeKeys = INJURY_TYPES.map((type) => type.key);

function run(seed: string): CareerOutcome {
  return simulateCareer({
    seed,
    progressionConfig: DEFAULT_PROGRESSION_CONFIG,
    wellbeingConfig: DEFAULT_WELLBEING_CONFIG,
    careerConfig: DEFAULT_CAREER_CONFIG,
    retirementConfig: DEFAULT_RETIREMENT_CONFIG,
    injuryTypeKeys,
  });
}

describe('career simulator', () => {
  it('is deterministic for the same seed', () => {
    expect(run('career-7')).toEqual(run('career-7'));
  });

  it('runs 200 full careers to retirement without crashes or drift', () => {
    const outcomes = Array.from({ length: 200 }, (_, i) => run(`career-${i}`));

    let elite = 0;
    for (const outcome of outcomes) {
      // No NaN / divergence anywhere.
      for (const value of [
        outcome.peakAbility,
        outcome.finalAbility,
        outcome.retirementAge,
        outcome.peakMarketValue,
        outcome.legacyScore,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
      }

      // Bounds.
      expect(outcome.peakAbility).toBeLessThanOrEqual(99);
      expect(outcome.peakAbility).toBeGreaterThanOrEqual(25);
      expect(outcome.finalAbility).toBeGreaterThanOrEqual(1);
      expect(outcome.finalAbility).toBeLessThanOrEqual(outcome.peakAbility);
      expect(outcome.retirementAge).toBeGreaterThan(14);
      expect(outcome.retirementAge).toBeLessThanOrEqual(42);
      expect(outcome.careerYears).toBeGreaterThan(0);
      expect(outcome.totalInjuries).toBeGreaterThanOrEqual(0);
      // Economy stays bounded (no runaway inflation).
      expect(outcome.peakMarketValue).toBeLessThan(300_000_000);

      if (outcome.peakAbility >= 75) elite += 1;
    }

    const retirementAges = outcomes.map((o) => o.retirementAge);
    expect(mean(retirementAges)).toBeGreaterThan(33);
    expect(mean(retirementAges)).toBeLessThan(41);

    // A varied talent distribution: some elites, but not everyone.
    expect(elite).toBeGreaterThan(0);
    expect(elite).toBeLessThan(outcomes.length);

    // Decline is real: final ability averages below peak.
    expect(mean(outcomes.map((o) => o.finalAbility))).toBeLessThan(
      mean(outcomes.map((o) => o.peakAbility)),
    );
  });
});

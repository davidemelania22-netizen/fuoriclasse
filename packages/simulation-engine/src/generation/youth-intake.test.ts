import { describe, expect, it } from 'vitest';
import { createRandomSource } from '../random/seeded-random';
import { academyIntakeStrength, intakeClassSize } from './youth-intake';

describe('intakeClassSize', () => {
  it('is deterministic per seed and always within 1-3', () => {
    expect(intakeClassSize(60, createRandomSource('a'))).toBe(
      intakeClassSize(60, createRandomSource('a')),
    );
    for (let i = 0; i < 200; i += 1) {
      const size = intakeClassSize(100, createRandomSource(`b:${i}`));
      expect(size).toBeGreaterThanOrEqual(1);
      expect(size).toBeLessThanOrEqual(3);
    }
  });

  it('better academies graduate bigger classes on average', () => {
    let elite = 0;
    let poor = 0;
    for (let i = 0; i < 400; i += 1) {
      elite += intakeClassSize(95, createRandomSource(`c:${i}`));
      poor += intakeClassSize(20, createRandomSource(`c:${i}`));
    }
    expect(elite).toBeGreaterThan(poor);
    expect(poor / 400).toBeGreaterThanOrEqual(1); // never below the minimum
  });
});

describe('academyIntakeStrength', () => {
  it('scales the club strength by academy quality, clamped', () => {
    expect(academyIntakeStrength(60, 100)).toBeCloseTo(60 * 1.25);
    expect(academyIntakeStrength(60, 50)).toBeCloseTo(60);
    expect(academyIntakeStrength(60, 0)).toBeCloseTo(45);
    expect(academyIntakeStrength(90, 100)).toBeLessThanOrEqual(100);
  });
});

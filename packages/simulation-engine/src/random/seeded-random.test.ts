import { describe, expect, it } from 'vitest';
import { createRandomSource, restoreRandomSource } from './seeded-random';
import { mean } from '../util/math';

describe('SeededRandom', () => {
  it('is reproducible: same seed yields the same sequence', () => {
    const a = createRandomSource('football-life');
    const b = createRandomSource('football-life');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    const a = createRandomSource('seed-a');
    const b = createRandomSource('seed-b');
    expect(a.next()).not.toBe(b.next());
  });

  it('next() stays within [0, 1)', () => {
    const rng = createRandomSource('range');
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('next() has a mean near 0.5', () => {
    const rng = createRandomSource('mean-test');
    const samples = Array.from({ length: 20000 }, () => rng.next());
    expect(mean(samples)).toBeGreaterThan(0.48);
    expect(mean(samples)).toBeLessThan(0.52);
  });

  it('integer() respects inclusive bounds', () => {
    const rng = createRandomSource('int');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const value = rng.integer(3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
    }
    expect(seen).toEqual(new Set([3, 4, 5, 6, 7]));
  });

  it('chance() approximates the requested probability', () => {
    const rng = createRandomSource('chance');
    let hits = 0;
    const n = 20000;
    for (let i = 0; i < n; i += 1) {
      if (rng.chance(0.3)) hits += 1;
    }
    expect(hits / n).toBeGreaterThan(0.28);
    expect(hits / n).toBeLessThan(0.32);
  });

  it('weightedPick() honors weights', () => {
    const rng = createRandomSource('weights');
    let a = 0;
    let b = 0;
    const items = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 9 },
    ];
    for (let i = 0; i < 20000; i += 1) {
      if (rng.weightedPick(items) === 'a') a += 1;
      else b += 1;
    }
    expect(b).toBeGreaterThan(a * 5);
  });

  it('normal() approximates mean and stddev', () => {
    const rng = createRandomSource('normal');
    const samples = Array.from({ length: 20000 }, () => rng.normal(50, 10));
    const m = mean(samples);
    const sd = Math.sqrt(mean(samples.map((value) => (value - m) ** 2)));
    expect(m).toBeGreaterThan(49);
    expect(m).toBeLessThan(51);
    expect(sd).toBeGreaterThan(9);
    expect(sd).toBeLessThan(11);
  });

  it('state can be serialized and restored to continue the sequence', () => {
    const rng = createRandomSource('resume');
    for (let i = 0; i < 17; i += 1) rng.next();
    const state = rng.getState();
    const continued = restoreRandomSource(state);
    const original = Array.from({ length: 10 }, () => rng.next());
    const resumed = Array.from({ length: 10 }, () => continued.next());
    expect(resumed).toEqual(original);
    expect(state.callCount).toBe(17);
  });
});

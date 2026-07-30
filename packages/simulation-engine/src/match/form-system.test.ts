import { describe, expect, it } from 'vitest';
import { formAfterMatch, formWhenIdle } from './form-system';

describe('form system', () => {
  it('raises form after a strong performance', () => {
    expect(formAfterMatch(50, 8)).toBeGreaterThan(50);
  });

  it('lowers form after a poor performance', () => {
    expect(formAfterMatch(50, 4.5)).toBeLessThan(50);
  });

  it('builds form over a run of good games, staying within bounds', () => {
    let form = 50;
    for (let i = 0; i < 10; i += 1) form = formAfterMatch(form, 8.5);
    expect(form).toBeGreaterThan(70);
    expect(form).toBeLessThanOrEqual(100);
  });

  it('collapses form over a run of bad games, staying within bounds', () => {
    let form = 50;
    for (let i = 0; i < 10; i += 1) form = formAfterMatch(form, 4);
    expect(form).toBeLessThan(30);
    expect(form).toBeGreaterThanOrEqual(0);
  });

  it('drifts idle form back toward the baseline from both directions', () => {
    expect(formWhenIdle(80)).toBeLessThan(80);
    expect(formWhenIdle(80)).toBeGreaterThan(50);
    expect(formWhenIdle(20)).toBeGreaterThan(20);
    expect(formWhenIdle(20)).toBeLessThan(50);
    expect(formWhenIdle(50)).toBeCloseTo(50);
  });
});

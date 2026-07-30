import { describe, expect, it } from 'vitest';
import { ratingTone, ratingWord } from './words';

describe('ratingWord', () => {
  it('covers the whole 0-20 scale with monotone bands', () => {
    expect(ratingWord(0)).toBe('Scarso');
    expect(ratingWord(4)).toBe('Scarso');
    expect(ratingWord(5)).toBe('Mediocre');
    expect(ratingWord(8)).toBe('Discreto');
    expect(ratingWord(11)).toBe('Buono');
    expect(ratingWord(14)).toBe('Ottimo');
    expect(ratingWord(17)).toBe('Eccellente');
    expect(ratingWord(19)).toBe('Fuoriclasse');
    expect(ratingWord(20)).toBe('Fuoriclasse');
  });

  it('clamps out-of-range and fractional values', () => {
    expect(ratingWord(-3)).toBe('Scarso');
    expect(ratingWord(25)).toBe('Fuoriclasse');
    expect(ratingWord(10.4)).toBe('Discreto');
    expect(ratingWord(10.6)).toBe('Buono');
  });

  it('tone class follows the same band as the word', () => {
    expect(ratingTone(8)).toBe('word-fair');
    expect(ratingTone(20)).toBe('word-class');
  });
});

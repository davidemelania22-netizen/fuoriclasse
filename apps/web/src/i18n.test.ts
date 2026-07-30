import { describe, expect, it } from 'vitest';
import { allaCountry, dellaCountry, laCountry } from './i18n';

describe('Italian articles for country names', () => {
  it("uses the elided form before a vowel", () => {
    expect(laCountry('Italia')).toBe("l'Italia");
    expect(allaCountry('Italia')).toBe("all'Italia");
    expect(dellaCountry('Inghilterra')).toBe("dell'Inghilterra");
  });

  it('keeps the full article before a consonant', () => {
    expect(laCountry('Germania')).toBe('la Germania');
    expect(allaCountry('Spagna')).toBe('alla Spagna');
    expect(dellaCountry('Francia')).toBe('della Francia');
  });
});

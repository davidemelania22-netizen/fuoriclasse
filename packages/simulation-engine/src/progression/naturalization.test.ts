import { describe, expect, it } from 'vitest';
import {
  evaluateNaturalization,
  NATURALIZATION_SEASONS_REQUIRED,
  type NaturalizationCheck,
} from './naturalization';

const abroad: NaturalizationCheck = {
  nationalityId: 'IT',
  clubCountryId: 'EN',
  seasonsInCountry: NATURALIZATION_SEASONS_REQUIRED,
  alreadyNaturalised: false,
  cappedForCountryId: null,
};

describe('evaluateNaturalization', () => {
  it('opens the door after enough seasons abroad', () => {
    const verdict = evaluateNaturalization(abroad);
    expect(verdict.eligible).toBe(true);
    expect(verdict.block).toBeNull();
    expect(verdict.seasonsMissing).toBe(0);
  });

  it('counts down the seasons still to serve', () => {
    const verdict = evaluateNaturalization({ ...abroad, seasonsInCountry: 1 });
    expect(verdict.eligible).toBe(false);
    expect(verdict.block).toBe('TOO_SOON');
    expect(verdict.seasonsMissing).toBe(NATURALIZATION_SEASONS_REQUIRED - 1);
  });

  it('has nothing to offer a player at home or without a club', () => {
    expect(
      evaluateNaturalization({ ...abroad, clubCountryId: 'IT' }).block,
    ).toBe('NOT_ABROAD');
    expect(
      evaluateNaturalization({ ...abroad, clubCountryId: null }).block,
    ).toBe('NOT_ABROAD');
  });

  it('ties a player who has already answered a call-up', () => {
    const verdict = evaluateNaturalization({
      ...abroad,
      cappedForCountryId: 'IT',
    });
    expect(verdict.eligible).toBe(false);
    expect(verdict.block).toBe('CAPPED');
  });

  it('allows only one switch in a career', () => {
    expect(
      evaluateNaturalization({ ...abroad, alreadyNaturalised: true }).block,
    ).toBe('ALREADY_NATURALISED');
  });

  it('reports the hardest block first, so the message never misleads', () => {
    // Naturalised AND capped AND at home: the permanent reason wins.
    expect(
      evaluateNaturalization({
        ...abroad,
        alreadyNaturalised: true,
        cappedForCountryId: 'IT',
        clubCountryId: 'IT',
        seasonsInCountry: 0,
      }).block,
    ).toBe('ALREADY_NATURALISED');
  });

  it('always reports the residency progress, blocked or not', () => {
    const verdict = evaluateNaturalization({ ...abroad, seasonsInCountry: 2 });
    expect(verdict.seasonsInCountry).toBe(2);
    expect(verdict.seasonsRequired).toBe(NATURALIZATION_SEASONS_REQUIRED);
  });
});

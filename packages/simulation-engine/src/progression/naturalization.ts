/**
 * Naturalisation — changing the shirt you play for. A player who has spent
 * enough seasons in a foreign league can be approached by that country's
 * federation. The rule that makes it a real decision is the FIFA one: once
 * you have answered a senior call-up, you are tied to that nation forever.
 */

/** Seasons the player must have played in the host country's competitions. */
export const NATURALIZATION_SEASONS_REQUIRED = 3;

export type NaturalizationBlock =
  /** Playing at home: there is nothing to naturalise into. */
  | 'NOT_ABROAD'
  /** Not enough time spent in the country yet. */
  | 'TOO_SOON'
  /** One switch per career. */
  | 'ALREADY_NATURALISED'
  /** Already answered a call-up: that nation has you for good. */
  | 'CAPPED';

export interface NaturalizationCheck {
  /** Nationality the player carries today. */
  nationalityId: string;
  /** Country of the club they play for, or null when unattached. */
  clubCountryId: string | null;
  /** Distinct seasons with an appearance in the host country. */
  seasonsInCountry: number;
  /** True once a previous naturalisation was granted. */
  alreadyNaturalised: boolean;
  /** Country the player is tied to by having accepted a call-up, if any. */
  cappedForCountryId: string | null;
}

export interface NaturalizationVerdict {
  eligible: boolean;
  /** Why not, or null when eligible. */
  block: NaturalizationBlock | null;
  seasonsInCountry: number;
  seasonsRequired: number;
  /** Seasons still to wait; 0 once the residency is served. */
  seasonsMissing: number;
}

export function evaluateNaturalization(
  check: NaturalizationCheck,
): NaturalizationVerdict {
  const seasonsMissing = Math.max(
    0,
    NATURALIZATION_SEASONS_REQUIRED - check.seasonsInCountry,
  );
  const base = {
    seasonsInCountry: check.seasonsInCountry,
    seasonsRequired: NATURALIZATION_SEASONS_REQUIRED,
    seasonsMissing,
  };
  const refuse = (block: NaturalizationBlock): NaturalizationVerdict => ({
    eligible: false,
    block,
    ...base,
  });

  if (check.alreadyNaturalised) return refuse('ALREADY_NATURALISED');
  // A cap for the country you already represent ties you to it; a cap for
  // the host country would mean you are effectively already theirs.
  if (check.cappedForCountryId !== null) return refuse('CAPPED');
  if (
    check.clubCountryId === null ||
    check.clubCountryId === check.nationalityId
  ) {
    return refuse('NOT_ABROAD');
  }
  if (seasonsMissing > 0) return refuse('TOO_SOON');

  return { eligible: true, block: null, ...base };
}

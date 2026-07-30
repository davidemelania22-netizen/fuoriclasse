/** Everything the naturalisation check needs about where the player lives. */
export interface NaturalizationContext {
  personId: string;
  playerId: string;
  nationalityId: string;
  /** Set once a naturalisation was already granted. */
  secondaryNationalityId: string | null;
  /** Country of the club they play for, or null when unattached. */
  clubCountryId: string | null;
  /** Distinct seasons with an appearance in that country's competitions. */
  seasonsInClubCountry: number;
  seasonLabel: string;
}

export interface NaturalizationRepository {
  loadContext(saveGameId: string): Promise<NaturalizationContext | null>;
  /**
   * Grants the new passport: the person's nationality becomes the host
   * country and the old one is kept as the secondary. From then on the
   * national-team squads pick the player up under the new flag.
   */
  applyNaturalization(input: {
    personId: string;
    newNationalityId: string;
    previousNationalityId: string;
  }): Promise<void>;
}

/** Data behind the world editor: names and crests of clubs and competitions. */
export interface EditableClub {
  clubId: string;
  name: string;
  shortName: string;
  logo: string | null;
  countryId: string;
  competitionName: string | null;
}

export interface EditableCompetition {
  competitionId: string;
  name: string;
  logo: string | null;
  type: string;
  countryId: string | null;
}

export interface EditableWorld {
  clubs: EditableClub[];
  competitions: EditableCompetition[];
}

export interface ClubEditInput {
  saveGameId: string;
  clubId: string;
  name?: string | undefined;
  shortName?: string | undefined;
  /** New crest data URL, or null to clear it. Omit to leave unchanged. */
  logo?: string | null | undefined;
}

export interface CompetitionEditInput {
  saveGameId: string;
  competitionId: string;
  name?: string | undefined;
  logo?: string | null | undefined;
}

export interface WorldEditorRepository {
  /** Null when the save does not exist. */
  loadWorld(saveGameId: string): Promise<EditableWorld | null>;
  /** False when the club does not belong to the save. */
  updateClub(input: ClubEditInput): Promise<boolean>;
  /** False when the competition does not belong to the save. */
  updateCompetition(input: CompetitionEditInput): Promise<boolean>;
}

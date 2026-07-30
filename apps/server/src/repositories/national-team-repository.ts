import type { MatchPlayer } from '@football-life/simulation-engine';
import type { RecordHonourInput } from './cup-repository';

export interface NationalTeamSummary {
  competitionId: string;
  name: string;
  holderCountryName: string | null;
  holderSeasonLabel: string | null;
}

/** Everything needed to simulate the national-team tournament: seeded field + squads. */
export interface NationalTeamField {
  competitionId: string;
  competitionName: string;
  seed: string;
  seasonLabel: string;
  /** Country ids seeded strongest-first (by average squad ability). */
  entrants: string[];
  countryNames: Map<string, string>;
  squads: Map<string, MatchPlayer[]>;
  /** Set only when the protagonist was actually called up into their nation's squad. */
  protagonistCountryId: string | null;
}

export interface NationalTeamRepository {
  getSummary(saveGameId: string): Promise<NationalTeamSummary | null>;
  loadField(
    saveGameId: string,
    squadSize: number,
    options?: {
      /** Leave the protagonist out (they declined the call-up). */
      excludeProtagonist?: boolean;
    },
  ): Promise<NationalTeamField | null>;
  recordHonour(input: RecordHonourInput): Promise<void>;
}

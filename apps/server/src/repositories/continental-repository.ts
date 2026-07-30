import type { MatchPlayer } from '@football-life/simulation-engine';
import type { RecordHonourInput } from './cup-repository';

export interface ContinentalSummary {
  competitionId: string;
  name: string;
  holderClubName: string | null;
  holderSeasonLabel: string | null;
}

/** Everything needed to simulate the continental cup: seeded field + squads. */
export interface ContinentalField {
  competitionId: string;
  competitionName: string;
  seed: string;
  seasonLabel: string;
  /** Qualified club ids seeded strongest-first (by reputation). */
  entrants: string[];
  clubNames: Map<string, string>;
  squads: Map<string, MatchPlayer[]>;
  protagonistClubId: string | null;
}

export interface ContinentalRepository {
  getSummary(saveGameId: string): Promise<ContinentalSummary | null>;
  loadField(
    saveGameId: string,
    qualifiersPerCountry: number,
  ): Promise<ContinentalField | null>;
  recordHonour(input: RecordHonourInput): Promise<void>;
}

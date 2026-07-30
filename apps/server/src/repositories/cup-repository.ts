import type { MatchPlayer } from '@football-life/simulation-engine';

export interface CupSummary {
  competitionId: string;
  name: string;
  countryId: string | null;
}

/** Everything needed to simulate a national cup: seeded field + squads. */
export interface CupField {
  competitionId: string;
  competitionName: string;
  countryId: string | null;
  seed: string;
  seasonLabel: string;
  /** Club ids seeded strongest-first (by reputation). */
  entrants: string[];
  clubNames: Map<string, string>;
  squads: Map<string, MatchPlayer[]>;
  protagonistClubId: string | null;
}

export interface RecordHonourInput {
  saveGameId: string;
  seasonLabel: string;
  type: string;
  competitionId?: string | null;
  competitionName?: string | null;
  clubId?: string | null;
  clubName?: string | null;
  playerId?: string | null;
  playerName?: string | null;
  detail?: unknown;
}

export interface HonourRecord {
  id: string;
  seasonLabel: string;
  type: string;
  competitionId: string | null;
  competitionName: string | null;
  clubId: string | null;
  clubName: string | null;
  playerId: string | null;
  playerName: string | null;
  createdAt: string;
}

export interface CupRepository {
  listCups(saveGameId: string): Promise<CupSummary[]>;
  loadCupField(competitionId: string): Promise<CupField | null>;
  recordHonour(input: RecordHonourInput): Promise<void>;
  listHonours(saveGameId: string): Promise<HonourRecord[]>;
}

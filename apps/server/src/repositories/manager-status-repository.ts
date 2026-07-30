import type { StandingRow } from '@football-life/simulation-engine';

/** Raw data needed to derive the protagonist's standing with their manager. */
export interface ManagerStatusData {
  clubId: string;
  clubName: string;
  clubReputation: number;
  competitionId: string;
  /** Active-contract squad role (KEY, FIRST_TEAM, …), or null if none. */
  squadRole: string | null;
  /** Reputation of every club in the protagonist's league (incl. their own). */
  leagueReputations: number[];
  /** Current-season standings for the protagonist's league. */
  standings: StandingRow[];
}

export interface ManagerStatusRepository {
  /** Null when the protagonist has no club (unattached). */
  loadStatus(saveGameId: string): Promise<ManagerStatusData | null>;
  /** Active-contract squad role only (used to anchor initial trust). */
  loadSquadRole(saveGameId: string): Promise<string | null>;
}

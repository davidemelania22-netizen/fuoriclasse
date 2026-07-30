/** Everything the weekly scouting pass needs to know about the world. */
export interface ScoutingState {
  seed: string;
  currentDate: Date;
  playerId: string;
  clubId: string;
  clubReputation: number;
  /** Protagonist profile the offer terms are computed from. */
  player: {
    currentAbility: number;
    age: number;
    marketValue: number;
  };
  /** Clubs bigger than the protagonist's, eligible to scout them. */
  candidates: {
    id: string;
    name: string;
    reputation: number;
    strength: number;
    transferBudget: number;
  }[];
}

export interface ScoutingRepository {
  /** Null when there is no protagonist or they have no club. */
  loadScoutingState(saveGameId: string): Promise<ScoutingState | null>;
}

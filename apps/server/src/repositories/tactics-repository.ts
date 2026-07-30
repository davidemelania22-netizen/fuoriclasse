/** Squad data behind the tactics screen: who competes for each shirt. */
export interface TacticsSquadMember {
  playerId: string;
  name: string;
  position: string;
  currentAbility: number;
  form: number;
  condition: number;
  available: boolean;
  isProtagonist: boolean;
}

export interface TacticsState {
  clubName: string;
  squad: TacticsSquadMember[];
  /** Manager trust of the protagonist (drives their selection bias), if any. */
  protagonistTrust: number | null;
}

export interface TacticsRepository {
  /** Null when the protagonist has no club. */
  loadTacticsState(saveGameId: string): Promise<TacticsState | null>;
}

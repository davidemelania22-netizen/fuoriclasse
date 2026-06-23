import type { GeneratedWorld } from '@football-life/simulation-engine';

export interface WorldPersistenceSummary {
  competitions: number;
  clubs: number;
  coaches: number;
  players: number;
  seasons: number;
  fixtures: number;
  standings: number;
}

/** Persistence boundary for a generated world attached to a save game. */
export interface WorldRepository {
  persistWorld(
    saveGameId: string,
    world: GeneratedWorld,
  ): Promise<WorldPersistenceSummary>;
}

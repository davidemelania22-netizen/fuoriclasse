import type { MatchConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { simulateMatch } from './match-engine';
import {
  applyResult,
  emptyStanding,
  sortStandings,
  type StandingRow,
} from './standings';
import type { MatchPlayer, MatchResult } from './types';

export interface SeasonFixtureInput {
  id: string;
  homeClubId: string;
  awayClubId: string;
}

export interface SimulateSeasonInput {
  fixtures: readonly SeasonFixtureInput[];
  squads: ReadonlyMap<string, readonly MatchPlayer[]>;
  config: MatchConfig;
  rng: RandomSource;
}

export interface FixtureSimulation {
  fixtureId: string;
  result: MatchResult;
}

export interface SimulateSeasonResult {
  fixtures: FixtureSimulation[];
  standings: StandingRow[];
}

/** Simulate every fixture of a season in order and build the final table. */
export function simulateSeason(
  input: SimulateSeasonInput,
): SimulateSeasonResult {
  const table = new Map<string, StandingRow>();
  for (const clubId of input.squads.keys()) {
    table.set(clubId, emptyStanding(clubId));
  }

  const fixtures: FixtureSimulation[] = [];

  for (const fixture of input.fixtures) {
    const homePlayers = input.squads.get(fixture.homeClubId) ?? [];
    const awayPlayers = input.squads.get(fixture.awayClubId) ?? [];

    const result = simulateMatch({
      home: { clubId: fixture.homeClubId, players: homePlayers },
      away: { clubId: fixture.awayClubId, players: awayPlayers },
      config: input.config,
      rng: input.rng,
    });

    applyResult(table, {
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: result.homeGoals,
      awayGoals: result.awayGoals,
    });

    fixtures.push({ fixtureId: fixture.id, result });
  }

  return { fixtures, standings: sortStandings([...table.values()]) };
}

import type { MatchConfig } from '@football-life/shared';
import {
  createRandomSource,
  simulateSeason,
} from '@football-life/simulation-engine';
import type {
  AppearancePersistence,
  FixtureResultPersistence,
  SeasonRepository,
} from '../repositories/season-repository';

export interface SimulateSeasonDeps {
  repository: SeasonRepository;
  config: MatchConfig;
}

export interface SimulateSeasonInput {
  seasonId: string;
}

export interface SimulateSeasonSummary {
  fixturesPlayed: number;
  totalGoals: number;
  leaderClubId: string | null;
}

export async function simulateSeasonForSave(
  deps: SimulateSeasonDeps,
  input: SimulateSeasonInput,
): Promise<SimulateSeasonSummary | null> {
  const data = await deps.repository.loadSeasonForSimulation(input.seasonId);
  if (!data) {
    return null;
  }
  if (data.fixtures.length === 0) {
    return { fixturesPlayed: 0, totalGoals: 0, leaderClubId: null };
  }

  const rng = createRandomSource(`${data.seed}:season:${input.seasonId}`);
  const simulation = simulateSeason({
    fixtures: data.fixtures,
    squads: data.squads,
    config: deps.config,
    rng,
  });

  const fixtures: FixtureResultPersistence[] = simulation.fixtures.map(
    (entry) => ({
      fixtureId: entry.fixtureId,
      homeGoals: entry.result.homeGoals,
      awayGoals: entry.result.awayGoals,
      homeXg: entry.result.homeXg,
      awayXg: entry.result.awayXg,
    }),
  );

  const appearances: AppearancePersistence[] = simulation.fixtures.flatMap(
    (entry) =>
      entry.result.appearances.map((appearance) => ({
        fixtureId: entry.fixtureId,
        ...appearance,
      })),
  );

  await deps.repository.persistSeasonResults({
    seasonId: input.seasonId,
    fixtures,
    appearances,
    standings: simulation.standings,
  });

  const totalGoals = fixtures.reduce(
    (sum, fixture) => sum + fixture.homeGoals + fixture.awayGoals,
    0,
  );

  return {
    fixturesPlayed: simulation.fixtures.length,
    totalGoals,
    leaderClubId: simulation.standings[0]?.clubId ?? null,
  };
}

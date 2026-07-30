import type { MatchConfig } from '@football-life/shared';
import {
  createRandomSource,
  simulateKnockout,
} from '@football-life/simulation-engine';
import type {
  ContinentalRepository,
  ContinentalSummary,
} from '../repositories/continental-repository';
import { buildProtagonistRun, type KnockoutRunStep } from './knockout-format';

export function getContinental(
  repository: ContinentalRepository,
  saveGameId: string,
): Promise<ContinentalSummary | null> {
  return repository.getSummary(saveGameId);
}

export interface SimulateContinentalResult {
  competitionName: string;
  seasonLabel: string;
  championName: string;
  runnerUpName: string | null;
  roundsCount: number;
  protagonist: {
    participated: boolean;
    isChampion: boolean;
    exitRoundLabel: string | null;
    path: KnockoutRunStep[];
  };
}

export interface ContinentalDeps {
  repository: ContinentalRepository;
  config: MatchConfig;
  qualifiersPerCountry: number;
}

export async function simulateContinental(
  deps: ContinentalDeps,
  input: { saveGameId: string },
): Promise<SimulateContinentalResult | null> {
  const field = await deps.repository.loadField(
    input.saveGameId,
    deps.qualifiersPerCountry,
  );
  if (!field || field.entrants.length < 2) return null;

  const rng = createRandomSource(
    `${field.seed}:continental:${field.competitionId}:${field.seasonLabel}`,
  );
  const result = simulateKnockout({
    entrants: field.entrants,
    squads: field.squads,
    config: deps.config,
    rng,
    twoLegged: true,
  });

  const name = (id: string): string => field.clubNames.get(id) ?? 'Sconosciuto';
  const championName = name(result.championClubId);
  const runnerUpName = result.runnerUpClubId
    ? name(result.runnerUpClubId)
    : null;

  const protagonist = buildProtagonistRun(
    result,
    field.protagonistClubId,
    field.entrants,
    name,
  );

  await deps.repository.recordHonour({
    saveGameId: input.saveGameId,
    seasonLabel: field.seasonLabel,
    type: 'CONTINENTAL_CUP',
    competitionId: field.competitionId,
    competitionName: field.competitionName,
    clubId: result.championClubId,
    clubName: championName,
    detail: { runnerUpName, roundsCount: result.roundsCount },
  });

  return {
    competitionName: field.competitionName,
    seasonLabel: field.seasonLabel,
    championName,
    runnerUpName,
    roundsCount: result.roundsCount,
    protagonist,
  };
}

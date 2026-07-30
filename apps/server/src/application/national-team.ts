import type { MatchConfig } from '@football-life/shared';
import {
  createRandomSource,
  simulateKnockout,
} from '@football-life/simulation-engine';
import type {
  NationalTeamRepository,
  NationalTeamSummary,
} from '../repositories/national-team-repository';
import { buildProtagonistRun, type KnockoutRunStep } from './knockout-format';

export function getNationalTeamTournament(
  repository: NationalTeamRepository,
  saveGameId: string,
): Promise<NationalTeamSummary | null> {
  return repository.getSummary(saveGameId);
}

export interface SimulateNationalTeamResult {
  competitionName: string;
  seasonLabel: string;
  championName: string;
  runnerUpName: string | null;
  roundsCount: number;
  protagonist: {
    /** True only if the protagonist was actually called up into their nation's squad. */
    participated: boolean;
    isChampion: boolean;
    exitRoundLabel: string | null;
    path: KnockoutRunStep[];
  };
}

export interface NationalTeamDeps {
  repository: NationalTeamRepository;
  config: MatchConfig;
  squadSize: number;
}

export async function simulateNationalTeamTournament(
  deps: NationalTeamDeps,
  input: { saveGameId: string; excludeProtagonist?: boolean },
): Promise<SimulateNationalTeamResult | null> {
  const field = await deps.repository.loadField(
    input.saveGameId,
    deps.squadSize,
    { excludeProtagonist: input.excludeProtagonist ?? false },
  );
  if (!field || field.entrants.length < 2) return null;

  const rng = createRandomSource(
    `${field.seed}:national-team:${field.competitionId}:${field.seasonLabel}`,
  );
  const result = simulateKnockout({
    entrants: field.entrants,
    squads: field.squads,
    config: deps.config,
    rng,
    twoLegged: false,
  });

  const name = (id: string): string =>
    field.countryNames.get(id) ?? 'Sconosciuta';
  const championName = name(result.championClubId);
  const runnerUpName = result.runnerUpClubId
    ? name(result.runnerUpClubId)
    : null;

  const protagonist = buildProtagonistRun(
    result,
    field.protagonistCountryId,
    field.entrants,
    name,
  );

  await deps.repository.recordHonour({
    saveGameId: input.saveGameId,
    seasonLabel: field.seasonLabel,
    type: 'INTERNATIONAL',
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

import type { MatchConfig } from '@football-life/shared';
import {
  createRandomSource,
  simulateKnockout,
} from '@football-life/simulation-engine';
import type {
  CupRepository,
  HonourRecord,
} from '../repositories/cup-repository';
import { buildProtagonistRun, type KnockoutRunStep } from './knockout-format';

export interface CupWithHolder {
  competitionId: string;
  name: string;
  countryId: string | null;
  holderClubName: string | null;
  holderSeasonLabel: string | null;
}

export async function listCups(
  repository: CupRepository,
  saveGameId: string,
): Promise<CupWithHolder[]> {
  const [cups, honours] = await Promise.all([
    repository.listCups(saveGameId),
    repository.listHonours(saveGameId),
  ]);
  return cups.map((cup) => {
    const held = honours.find(
      (h) => h.type === 'NATIONAL_CUP' && h.competitionId === cup.competitionId,
    );
    return {
      competitionId: cup.competitionId,
      name: cup.name,
      countryId: cup.countryId,
      holderClubName: held?.clubName ?? null,
      holderSeasonLabel: held?.seasonLabel ?? null,
    };
  });
}

export function listHonours(
  repository: CupRepository,
  saveGameId: string,
): Promise<HonourRecord[]> {
  return repository.listHonours(saveGameId);
}

export type CupRunStep = KnockoutRunStep;

export interface SimulateCupResult {
  competitionName: string;
  seasonLabel: string;
  championName: string;
  runnerUpName: string | null;
  roundsCount: number;
  protagonist: {
    participated: boolean;
    isChampion: boolean;
    exitRoundLabel: string | null;
    path: CupRunStep[];
  };
}

export interface CupDeps {
  repository: CupRepository;
  config: MatchConfig;
}

export async function simulateNationalCup(
  deps: CupDeps,
  input: { saveGameId: string; competitionId: string },
): Promise<SimulateCupResult | null> {
  const field = await deps.repository.loadCupField(input.competitionId);
  if (!field || field.entrants.length < 2) return null;

  const rng = createRandomSource(
    `${field.seed}:cup:${field.competitionId}:${field.seasonLabel}`,
  );
  const result = simulateKnockout({
    entrants: field.entrants,
    squads: field.squads,
    config: deps.config,
    rng,
    twoLegged: false,
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
    type: 'NATIONAL_CUP',
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

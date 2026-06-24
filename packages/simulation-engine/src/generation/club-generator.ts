import type { NamePool, WorldGenerationConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import type { GeneratedClub, GeneratedCoach } from '../domain/world';
import { clamp } from '../util/math';

const CLUB_SUFFIXES = [
  'Calcio',
  'FC',
  'AC',
  'US',
  'Sporting',
  'Atletico',
] as const;

const COACH_ARCHETYPES = [
  'prudent',
  'aggressive',
  'opportunist',
  'conservative',
  'innovator',
  'short-term',
  'long-term',
] as const;

export interface GenerateClubParams {
  rng: RandomSource;
  key: string;
  competitionKey: string;
  countryId: string;
  /** Stable index used for collision-free, deterministic club naming. */
  cityIndex: number;
  namePool: NamePool;
  divisionMean: number;
  baseReputation: number;
  config: WorldGenerationConfig;
}

export function generateClub(params: GenerateClubParams): GeneratedClub {
  const { rng, namePool, divisionMean, baseReputation, config } = params;
  const cities = namePool.cities;
  const city = cities[params.cityIndex % cities.length]!;
  const suffix =
    CLUB_SUFFIXES[
      Math.floor(params.cityIndex / cities.length) % CLUB_SUFFIXES.length
    ]!;

  const strength = clamp(
    rng.normal(divisionMean, 6),
    config.ability.min,
    config.ability.max,
  );
  const reputation = clamp(
    Math.round(
      baseReputation + (strength - divisionMean) * 12 + rng.integer(-200, 200),
    ),
    1,
    10000,
  );

  const qualityMean = clamp(30 + reputation / 200, 20, 90);
  const quality = (): number =>
    clamp(Math.round(rng.normal(qualityMean, 10)), 1, 100);

  return {
    key: params.key,
    competitionKey: params.competitionKey,
    countryId: params.countryId,
    name: `${city} ${suffix}`,
    shortName: city.slice(0, 3).toUpperCase(),
    reputation,
    balance: Math.round(reputation * 1000 + rng.integer(0, 2_000_000)),
    wageBudget: Math.round(reputation * 500 + rng.integer(0, 500_000)),
    transferBudget: Math.round(reputation * 800 + rng.integer(0, 1_000_000)),
    academyQuality: quality(),
    trainingQuality: quality(),
    medicalQuality: quality(),
    scoutingQuality: quality(),
    pressureLevel: clamp(
      Math.round(reputation / 120 + rng.normal(0, 8)),
      1,
      100,
    ),
    strength,
  };
}

export interface GenerateCoachParams {
  rng: RandomSource;
  key: string;
  clubKey: string;
  countryId: string;
  namePool: NamePool;
  seasonStart: Date;
}

export function generateCoach(params: GenerateCoachParams): GeneratedCoach {
  const { rng, namePool, seasonStart } = params;
  const trait = (): number => clamp(Math.round(rng.normal(55, 15)), 1, 100);
  const age = clamp(Math.round(rng.normal(50, 8)), 35, 70);
  const birthDate = new Date(
    Date.UTC(
      seasonStart.getUTCFullYear() - age,
      rng.integer(0, 11),
      rng.integer(1, 28),
    ),
  );

  return {
    key: params.key,
    clubKey: params.clubKey,
    firstName: rng.pick(namePool.firstNames),
    lastName: rng.pick(namePool.lastNames),
    nationalityId: params.countryId,
    birthDate,
    archetype: rng.pick(COACH_ARCHETYPES),
    personality: {
      tactical: trait(),
      manManagement: trait(),
      youthDevelopment: trait(),
      discipline: trait(),
      adaptability: trait(),
      riskTaking: trait(),
    },
  };
}

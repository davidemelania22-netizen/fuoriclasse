import {
  ATTRIBUTE_DEFINITIONS,
  AttributeCategory,
  PlayerPosition,
  PreferredFoot,
  type NamePool,
  type WorldGenerationConfig,
} from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import type { GeneratedAttribute, GeneratedPlayer } from '../domain/world';
import { clamp } from '../util/math';

const PEAK_AGE = 27;

/** Build a positionally balanced list of squad positions of the given size. */
export function buildSquadPositions(size: number): PlayerPosition[] {
  const counts: Record<PlayerPosition, number> = {
    [PlayerPosition.Goalkeeper]: Math.max(2, Math.round(size * 0.12)),
    [PlayerPosition.Defender]: Math.round(size * 0.34),
    [PlayerPosition.Midfielder]: Math.round(size * 0.27),
    [PlayerPosition.Winger]: Math.round(size * 0.13),
    [PlayerPosition.Forward]: 0,
  };
  const assigned =
    counts[PlayerPosition.Goalkeeper] +
    counts[PlayerPosition.Defender] +
    counts[PlayerPosition.Midfielder] +
    counts[PlayerPosition.Winger];
  counts[PlayerPosition.Forward] = Math.max(2, size - assigned);

  // Reconcile rounding so the list length matches `size` exactly.
  let total =
    counts[PlayerPosition.Goalkeeper] +
    counts[PlayerPosition.Defender] +
    counts[PlayerPosition.Midfielder] +
    counts[PlayerPosition.Winger] +
    counts[PlayerPosition.Forward];
  while (total > size) {
    counts[PlayerPosition.Midfielder] = Math.max(
      1,
      counts[PlayerPosition.Midfielder] - 1,
    );
    total -= 1;
  }
  while (total < size) {
    counts[PlayerPosition.Midfielder] += 1;
    total += 1;
  }

  const positions: PlayerPosition[] = [];
  (Object.keys(counts) as PlayerPosition[]).forEach((position) => {
    for (let i = 0; i < counts[position]; i += 1) {
      positions.push(position);
    }
  });
  return positions;
}

function hiddenAttributeValue(rng: RandomSource, key: string): number {
  switch (key) {
    case 'expectedPeakAge':
      return clamp(Math.round(rng.normal(PEAK_AGE, 2)), 22, 34);
    case 'developmentSpeed':
      return clamp(Math.round(rng.normal(50, 15)), 1, 99);
    case 'injuryProneness':
      return clamp(Math.round(rng.normal(30, 15)), 1, 99);
    case 'emotionalStability':
      return clamp(Math.round(rng.normal(55, 15)), 1, 99);
    default:
      return clamp(Math.round(rng.normal(50, 18)), 1, 99);
  }
}

function positionalBias(position: PlayerPosition, key: string): number {
  if (position === PlayerPosition.Defender) {
    if (key === 'marking' || key === 'tackling' || key === 'heading') return 8;
  }
  if (position === PlayerPosition.Forward) {
    if (key === 'finishing' || key === 'dribbling') return 8;
  }
  if (position === PlayerPosition.Midfielder) {
    if (key === 'shortPassing' || key === 'vision' || key === 'decisions') {
      return 6;
    }
  }
  if (position === PlayerPosition.Winger) {
    if (key === 'pace' || key === 'crossing' || key === 'dribbling') return 8;
  }
  if (position === PlayerPosition.Goalkeeper) {
    if (key === 'finishing' || key === 'dribbling' || key === 'pace')
      return -12;
  }
  return 0;
}

function visibleAttributeValue(
  rng: RandomSource,
  position: PlayerPosition,
  key: string,
  ability: number,
): number {
  return clamp(
    Math.round(rng.normal(ability, 8) + positionalBias(position, key)),
    1,
    99,
  );
}

export interface GeneratePlayerParams {
  rng: RandomSource;
  key: string;
  clubKey: string;
  countryId: string;
  namePool: NamePool;
  position: PlayerPosition;
  clubStrength: number;
  config: WorldGenerationConfig;
  seasonStart: Date;
}

export function generatePlayer(params: GeneratePlayerParams): GeneratedPlayer {
  const { rng, namePool, position, clubStrength, config, seasonStart } = params;

  const age = clamp(
    Math.round(rng.normal(config.age.mean, config.age.spread)),
    config.age.min,
    config.age.max,
  );
  const month = rng.integer(0, 11);
  const day = rng.integer(1, 28);
  const birthDate = new Date(
    Date.UTC(seasonStart.getUTCFullYear() - age, month, day),
  );

  const ability = clamp(
    rng.normal(clubStrength, config.ability.spread),
    config.ability.min,
    config.ability.max,
  );
  const currentAbility = Math.round(ability);

  const headroom = Math.max(0, PEAK_AGE - age);
  const potentialAbility = clamp(
    currentAbility +
      rng.integer(0, Math.round(headroom * 1.6)) +
      rng.integer(0, 4),
    currentAbility,
    Math.round(config.ability.max),
  );

  const heightMean =
    position === PlayerPosition.Goalkeeper
      ? 189
      : position === PlayerPosition.Defender
        ? 184
        : position === PlayerPosition.Forward
          ? 182
          : 179;
  const heightCm = clamp(Math.round(rng.normal(heightMean, 6)), 165, 205);
  const weightKg = clamp(Math.round(heightCm - 100 + rng.normal(0, 4)), 58, 98);

  const preferredFoot = rng.weightedPick<PreferredFoot>([
    { value: PreferredFoot.Right, weight: 74 },
    { value: PreferredFoot.Left, weight: 22 },
    { value: PreferredFoot.Both, weight: 4 },
  ]);

  const attributes: GeneratedAttribute[] = ATTRIBUTE_DEFINITIONS.map(
    (definition) => ({
      key: definition.key,
      category: definition.category,
      value:
        definition.category === AttributeCategory.Hidden
          ? hiddenAttributeValue(rng, definition.key)
          : visibleAttributeValue(rng, position, definition.key, ability),
    }),
  );

  const ageFactor =
    age <= 23 ? 1.15 : age <= 29 ? 1.0 : Math.max(0.25, 1 - (age - 29) * 0.13);
  const valueBase = Math.max(0, currentAbility - 24);
  const marketValue = Math.round(valueBase * valueBase * 1400 * ageFactor);
  const reputation = clamp(
    Math.round(currentAbility * 6 + rng.integer(0, 40)),
    1,
    5000,
  );

  return {
    key: params.key,
    clubKey: params.clubKey,
    firstName: rng.pick(namePool.firstNames),
    lastName: rng.pick(namePool.lastNames),
    nationalityId: params.countryId,
    birthDate,
    primaryPosition: position,
    secondaryPositions: [],
    preferredFoot,
    heightCm,
    weightKg,
    currentAbility,
    potentialAbility,
    reputation,
    marketValue,
    attributes,
  };
}

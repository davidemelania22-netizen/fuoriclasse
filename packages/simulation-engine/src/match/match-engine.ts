import { PlayerPosition, type MatchConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { clamp, mean, roundTo } from '../util/math';
import { selectLineup } from './selection';
import { computeTeamStrength, effectiveAbility } from './team-strength';
import type {
  MatchAppearanceResult,
  MatchEvent,
  MatchPlayer,
  MatchResult,
  MatchTeamInput,
} from './types';

export interface SimulateMatchInput {
  home: MatchTeamInput;
  away: MatchTeamInput;
  importance?: number;
  config: MatchConfig;
  rng: RandomSource;
}

const ATTACK_WEIGHT: Record<PlayerPosition, number> = {
  [PlayerPosition.Goalkeeper]: 0.01,
  [PlayerPosition.Defender]: 0.15,
  [PlayerPosition.Midfielder]: 0.45,
  [PlayerPosition.Winger]: 0.85,
  [PlayerPosition.Forward]: 1.0,
};

const ASSIST_WEIGHT: Record<PlayerPosition, number> = {
  [PlayerPosition.Goalkeeper]: 0.03,
  [PlayerPosition.Defender]: 0.3,
  [PlayerPosition.Midfielder]: 1.0,
  [PlayerPosition.Winger]: 0.9,
  [PlayerPosition.Forward]: 0.6,
};

function poissonSample(rng: RandomSource, lambda: number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng.next();
  } while (p > l);
  return k - 1;
}

function expectedGoals(
  attackingPower: number,
  defensivePower: number,
  edge: number,
  config: MatchConfig,
): number {
  const exponent =
    (attackingPower - defensivePower + edge) / config.strengthSpread;
  return clamp(config.baseGoals * 2 ** exponent, config.minXg, config.maxXg);
}

function pickWeighted(
  rng: RandomSource,
  starters: readonly MatchPlayer[],
  weightOf: (player: MatchPlayer) => number,
  exclude?: string,
): MatchPlayer | null {
  const items = starters
    .filter((player) => player.id !== exclude)
    .map((player) => ({
      value: player,
      weight: Math.max(0.001, weightOf(player)),
    }));
  if (items.length === 0) return null;
  return rng.weightedPick(items);
}

export function simulateMatch(input: SimulateMatchInput): MatchResult {
  const { config, rng } = input;
  const homeStarters = selectLineup(
    input.home.players,
    config.formation,
    config,
    rng,
  );
  const awayStarters = selectLineup(
    input.away.players,
    config.formation,
    config,
    rng,
  );

  const homeStrength = computeTeamStrength(homeStarters, config);
  const awayStrength = computeTeamStrength(awayStarters, config);

  const homeXg = expectedGoals(
    homeStrength.attackingPower,
    awayStrength.defensivePower,
    config.homeAdvantage,
    config,
  );
  const awayXg = expectedGoals(
    awayStrength.attackingPower,
    homeStrength.defensivePower,
    -config.homeAdvantage * 0.5,
    config,
  );

  const homeGoals = poissonSample(rng, homeXg);
  const awayGoals = poissonSample(rng, awayXg);

  const events: MatchEvent[] = [];
  const scorerGoals = new Map<string, number>();
  const scorerAssists = new Map<string, number>();

  const registerGoals = (
    starters: readonly MatchPlayer[],
    clubId: string,
    goals: number,
  ): void => {
    for (let g = 0; g < goals; g += 1) {
      const scorer = pickWeighted(
        rng,
        starters,
        (p) =>
          (p.finishing * 0.6 + p.currentAbility * 0.4) *
          ATTACK_WEIGHT[p.position],
      );
      if (!scorer) continue;
      scorerGoals.set(scorer.id, (scorerGoals.get(scorer.id) ?? 0) + 1);

      let assistId: string | undefined;
      if (rng.chance(config.assistProbability)) {
        const assister = pickWeighted(
          rng,
          starters,
          (p) => p.currentAbility * ASSIST_WEIGHT[p.position],
          scorer.id,
        );
        if (assister) {
          assistId = assister.id;
          scorerAssists.set(
            assister.id,
            (scorerAssists.get(assister.id) ?? 0) + 1,
          );
        }
      }

      events.push(
        assistId === undefined
          ? { type: 'GOAL', clubId, playerId: scorer.id }
          : {
              type: 'GOAL',
              clubId,
              playerId: scorer.id,
              assistPlayerId: assistId,
            },
      );
    }
  };

  registerGoals(homeStarters, input.home.clubId, homeGoals);
  registerGoals(awayStarters, input.away.clubId, awayGoals);

  const appearances: MatchAppearanceResult[] = [];

  const buildAppearances = (
    starters: readonly MatchPlayer[],
    clubId: string,
    teamGoals: number,
    concededGoals: number,
  ): void => {
    const teamAverage =
      starters.length > 0 ? mean(starters.map(effectiveAbility)) : 50;
    const outcomeBonus =
      teamGoals > concededGoals
        ? config.rating.winBonus
        : teamGoals === concededGoals
          ? config.rating.drawBonus
          : config.rating.lossPenalty;

    for (const player of starters) {
      const goals = scorerGoals.get(player.id) ?? 0;
      const assists = scorerAssists.get(player.id) ?? 0;

      let rating =
        config.rating.base +
        rng.normal(0, config.rating.noise) +
        outcomeBonus +
        (effectiveAbility(player) - teamAverage) / 40 +
        goals * config.rating.goalBonus +
        assists * config.rating.assistBonus;

      if (
        player.position === PlayerPosition.Goalkeeper ||
        player.position === PlayerPosition.Defender
      ) {
        rating -= concededGoals * config.rating.concededPenalty;
      }

      const yellowProbability = clamp(
        config.cards.baseYellow *
          (1 +
            ((50 - player.discipline) / 100) * config.cards.disciplineFactor),
        0,
        0.6,
      );
      const yellowCards = rng.chance(yellowProbability) ? 1 : 0;
      const redCards = rng.chance(config.cards.baseRed) ? 1 : 0;
      if (yellowCards > 0) {
        events.push({ type: 'YELLOW_CARD', clubId, playerId: player.id });
      }
      if (redCards > 0) {
        events.push({ type: 'RED_CARD', clubId, playerId: player.id });
        rating -= 1;
      }

      appearances.push({
        playerId: player.id,
        clubId,
        started: true,
        minutesPlayed: 90,
        position: player.position,
        rating: roundTo(clamp(rating, config.rating.min, config.rating.max), 1),
        goals,
        assists,
        yellowCards,
        redCards,
      });
    }
  };

  buildAppearances(homeStarters, input.home.clubId, homeGoals, awayGoals);
  buildAppearances(awayStarters, input.away.clubId, awayGoals, homeGoals);

  const commentary = [
    `Final score: ${homeGoals}-${awayGoals} (xG ${roundTo(homeXg, 2)}-${roundTo(awayXg, 2)}).`,
    ...events
      .filter((event) => event.type === 'GOAL')
      .map((event) => `Goal for ${event.clubId}.`),
  ];

  return {
    homeClubId: input.home.clubId,
    awayClubId: input.away.clubId,
    homeGoals,
    awayGoals,
    homeXg,
    awayXg,
    appearances,
    events,
    commentary,
  };
}

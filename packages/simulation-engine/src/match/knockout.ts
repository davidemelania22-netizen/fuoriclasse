import type { MatchConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { simulateMatch } from './match-engine';
import type { MatchPlayer, MatchResult } from './types';

/** One resolved knockout tie (round of the bracket). */
export interface KnockoutTie {
  round: number;
  homeClubId: string;
  awayClubId: string;
  legs: MatchResult[];
  homeAggregate: number;
  awayAggregate: number;
  winnerClubId: string;
  decidedByPenalties: boolean;
}

export interface KnockoutResult {
  ties: KnockoutTie[];
  roundsCount: number;
  championClubId: string;
  runnerUpClubId: string | null;
}

export interface SimulateKnockoutInput {
  /** Entrant club ids in seed order (strongest first). */
  entrants: readonly string[];
  squads: ReadonlyMap<string, readonly MatchPlayer[]>;
  config: MatchConfig;
  rng: RandomSource;
  /** Two-legged ties (home & away). The final is always single-leg. */
  twoLegged?: boolean;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function playLeg(
  homeClubId: string,
  awayClubId: string,
  input: SimulateKnockoutInput,
): MatchResult {
  return simulateMatch({
    home: { clubId: homeClubId, players: input.squads.get(homeClubId) ?? [] },
    away: { clubId: awayClubId, players: input.squads.get(awayClubId) ?? [] },
    config: input.config,
    rng: input.rng,
  });
}

/** Resolve a tie between two clubs; `a` is the higher seed (home first). */
function resolveTie(
  round: number,
  a: string,
  b: string,
  twoLegged: boolean,
  input: SimulateKnockoutInput,
): KnockoutTie {
  const legs: MatchResult[] = [];
  let aggA: number;
  let aggB: number;
  let awayA: number;
  let awayB: number;

  if (twoLegged) {
    const leg1 = playLeg(a, b, input); // a home
    const leg2 = playLeg(b, a, input); // b home
    legs.push(leg1, leg2);
    aggA = leg1.homeGoals + leg2.awayGoals;
    aggB = leg1.awayGoals + leg2.homeGoals;
    awayA = leg2.awayGoals; // a's goals away (leg2)
    awayB = leg1.awayGoals; // b's goals away (leg1)
  } else {
    const leg = playLeg(a, b, input);
    legs.push(leg);
    aggA = leg.homeGoals;
    aggB = leg.awayGoals;
    awayA = 0;
    awayB = 0;
  }

  let winner: string;
  let decidedByPenalties = false;
  if (aggA > aggB) winner = a;
  else if (aggB > aggA) winner = b;
  else if (twoLegged && awayA !== awayB) winner = awayA > awayB ? a : b;
  else {
    decidedByPenalties = true;
    winner = input.rng.next() < 0.5 ? a : b;
  }

  return {
    round,
    homeClubId: a,
    awayClubId: b,
    legs,
    homeAggregate: aggA,
    awayAggregate: aggB,
    winnerClubId: winner,
    decidedByPenalties,
  };
}

/**
 * Simulate a full single-elimination bracket. Top seeds receive byes when the
 * entrant count is not a power of two. Produces one champion; the number of
 * ties is always `entrants - 1`.
 */
export function simulateKnockout(
  input: SimulateKnockoutInput,
): KnockoutResult {
  const entrants = [...input.entrants];
  if (entrants.length === 0) {
    return { ties: [], roundsCount: 0, championClubId: '', runnerUpClubId: null };
  }
  if (entrants.length === 1) {
    return {
      ties: [],
      roundsCount: 0,
      championClubId: entrants[0]!,
      runnerUpClubId: null,
    };
  }

  const ties: KnockoutTie[] = [];
  let alive = entrants;
  let round = 1;
  let byes = nextPowerOfTwo(alive.length) - alive.length;
  let runnerUp: string | null = null;

  while (alive.length > 1) {
    const byeTeams = byes > 0 ? alive.slice(0, byes) : [];
    const playing = byes > 0 ? alive.slice(byes) : alive;
    byes = 0;

    const isFinal = alive.length === 2;
    const twoLegged = (input.twoLegged ?? false) && !isFinal;

    const winners: string[] = [];
    for (let i = 0; i < playing.length / 2; i += 1) {
      const a = playing[i]!;
      const b = playing[playing.length - 1 - i]!;
      const tie = resolveTie(round, a, b, twoLegged, input);
      ties.push(tie);
      winners.push(tie.winnerClubId);
      if (isFinal) {
        runnerUp = tie.winnerClubId === a ? b : a;
      }
    }

    alive = [...byeTeams, ...winners];
    round += 1;
  }

  return {
    ties,
    roundsCount: round - 1,
    championClubId: alive[0]!,
    runnerUpClubId: runnerUp,
  };
}

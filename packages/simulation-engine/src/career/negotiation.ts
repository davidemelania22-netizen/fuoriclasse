import type { RandomSource } from '../random/random-source';

/**
 * Asking a club for more.
 *
 * The odds are computed before anything is rolled so the screen can show them,
 * the way every other gamble in this game declares its chances up front. What
 * decides them is leverage: how good the player is against how much the club
 * already committed, and how big the ask is.
 */

export type NegotiationAsk = 'WAGE' | 'ROLE';

/** Squad roles, weakest first — asking for "more" means one step up this list. */
export const SQUAD_ROLE_LADDER = [
  'PROSPECT',
  'BACKUP',
  'ROTATION',
  'FIRST_TEAM',
  'KEY',
] as const;

export type SquadRole = (typeof SQUAD_ROLE_LADDER)[number];

/** How much more money a successful wage negotiation wins. */
const WAGE_RAISE = 0.25;
/** A club that says no still nudges the wage, so asking is rarely pointless. */
const WAGE_CONSOLATION = 0.05;

export interface NegotiationInput {
  ask: NegotiationAsk;
  /** 1-100. */
  currentAbility: number;
  /** The club's reputation, on the same scale clubs are stored with. */
  clubReputation: number;
  /** What they have already put on the table. */
  offeredWage: number;
  squadRole: string;
  /** The player's own market value, the other half of the leverage. */
  marketValue: number;
}

export interface NegotiationOdds {
  /** 0-1, and never a certainty in either direction. */
  successChance: number;
  /** What a yes is worth, in words. */
  successLabel: string;
  /** What a no leaves you with. */
  failureLabel: string;
}

const clamp01 = (value: number) => Math.max(0.05, Math.min(0.92, value));

export function roleAbove(role: string): SquadRole | null {
  const index = SQUAD_ROLE_LADDER.indexOf(role as SquadRole);
  if (index < 0 || index === SQUAD_ROLE_LADDER.length - 1) return null;
  return SQUAD_ROLE_LADDER[index + 1]!;
}

/**
 * The odds of getting what you asked for, plus what either answer means.
 * Pure: the caller shows this, then calls `negotiate` with the same input.
 */
export function negotiationOdds(input: NegotiationInput): NegotiationOdds {
  // Ability is the floor of any leverage: a 90 asks from a position a 50
  // simply does not have.
  const ability = (input.currentAbility - 40) / 60; // ~0 at 40, 1 at 100
  // A club that wants you badly enough to bid above your value has already
  // shown its hand; one lowballing you has room to say no.
  const generosity =
    input.marketValue > 0
      ? Math.min(1.5, (input.offeredWage * 52) / Math.max(1, input.marketValue))
      : 0.5;

  if (input.ask === 'WAGE') {
    const chance = 0.28 + ability * 0.45 - Math.max(0, generosity - 0.6) * 0.25;
    return {
      successChance: clamp01(chance),
      successLabel: `Ingaggio a ${Math.round(input.offeredWage * (1 + WAGE_RAISE)).toLocaleString('it-IT')} € a settimana`,
      failureLabel: `Restano ${Math.round(input.offeredWage * (1 + WAGE_CONSOLATION)).toLocaleString('it-IT')} €: hanno limato, non ceduto`,
    };
  }

  const next = roleAbove(input.squadRole);
  if (!next) {
    return {
      successChance: 0,
      successLabel: 'Sei già al vertice della rosa',
      failureLabel: 'Non c’è un ruolo più alto da chiedere',
    };
  }
  // A bigger role costs the club a place in the eleven, so it leans harder on
  // how good the player actually is — and a big club protects its shirts.
  const reputationDrag = Math.min(0.3, input.clubReputation / 30_000);
  const chance = 0.22 + ability * 0.5 - reputationDrag;
  return {
    successChance: clamp01(chance),
    successLabel: `Ruolo in rosa: ${next}`,
    failureLabel: 'Il ruolo resta quello proposto',
  };
}

export interface NegotiationResult {
  succeeded: boolean;
  weeklyWage: number;
  squadRole: string;
}

/** Roll the ask. Same input as `negotiationOdds`, so the odds shown are real. */
export function negotiate(
  input: NegotiationInput,
  rng: RandomSource,
): NegotiationResult {
  const odds = negotiationOdds(input);
  const succeeded = odds.successChance > 0 && rng.chance(odds.successChance);

  if (input.ask === 'WAGE') {
    const factor = succeeded ? 1 + WAGE_RAISE : 1 + WAGE_CONSOLATION;
    return {
      succeeded,
      weeklyWage: Math.round(input.offeredWage * factor),
      squadRole: input.squadRole,
    };
  }

  const next = roleAbove(input.squadRole);
  return {
    succeeded: succeeded && next !== null,
    weeklyWage: input.offeredWage,
    squadRole: succeeded && next ? next : input.squadRole,
  };
}

import type { RandomSource } from './../random/random-source';

/**
 * Sitting at the table.
 *
 * A contract is not one number, so a negotiation cannot be one yes-or-no: the
 * player puts a whole package on the table — length, wage, signing fee,
 * appearance and goal bonuses, the shirt he expects — and the club answers as
 * a club would. It says yes if the package costs about what it was already
 * willing to spend, counters somewhere in the middle when the ask is greedy
 * but not absurd, and walks out when its patience runs out.
 *
 * The whole thing is priced as one number: what the deal costs the club over
 * its life. That is what lets a player trade one term for another — a year
 * less for a bigger signing fee, a smaller wage for the shirt he wants — which
 * is what makes it a negotiation instead of a slider.
 */

export interface ContractPackage {
  years: number;
  weeklyWage: number;
  signingBonus: number;
  appearanceBonus: number;
  goalBonus: number;
  squadRole: string;
}

/** What the club expects to pay out in bonuses over a season. */
const APPEARANCES_PER_SEASON = 30;
const GOALS_PER_SEASON = 8;

/** A shirt costs the club more than money: it costs a place in the eleven. */
const ROLE_PREMIUM: Record<string, number> = {
  PROSPECT: 0.85,
  BACKUP: 0.92,
  ROTATION: 1,
  FIRST_TEAM: 1.12,
  KEY: 1.3,
};

/** Bounds a proposal is clamped to, so nobody asks for a decade at 10x. */
export const TERM_LIMITS = {
  years: { min: 1, max: 6 },
  /** Multiples of whatever the club opened with. */
  weeklyWage: { min: 0.5, max: 4 },
  signingBonus: { min: 0, max: 6 },
  appearanceBonus: { min: 0, max: 6 },
  goalBonus: { min: 0, max: 6 },
} as const;

/**
 * How much a package costs the club **per season**.
 *
 * Annualised on purpose. Priced as a total, every extra year multiplied the
 * whole deal, so asking for a longer contract was always refused — and length
 * is one of the things a player most wants to negotiate. A club budgets by the
 * season; length is a separate question it has a mild opinion about, which is
 * what `lengthFactor` carries.
 */
export function packageCost(pkg: ContractPackage): number {
  const seasons = Math.max(1, pkg.years);
  const wages = pkg.weeklyWage * 52;
  const bonuses =
    pkg.appearanceBonus * APPEARANCES_PER_SEASON +
    pkg.goalBonus * GOALS_PER_SEASON;
  // The signing fee is paid once but felt across the deal.
  const perSeason = wages + bonuses + pkg.signingBonus / seasons;
  return perSeason * lengthFactor(seasons) * (ROLE_PREMIUM[pkg.squadRole] ?? 1);
}

/**
 * A long deal is a commitment, not a bill: it costs a little more per season
 * than a short one, never a multiple. Three years is the neutral point.
 */
function lengthFactor(years: number): number {
  return 1 + (years - 3) * 0.04;
}

export interface TalksLeverage {
  /** 1-100. */
  currentAbility: number;
  /** The club's reputation, on the scale clubs are stored with. */
  clubReputation: number;
  /** The player's market value — the other half of what he can demand. */
  marketValue: number;
  /**
   * True when the contract runs out inside a year: a club that risks losing
   * him for nothing pays more, which is the oldest lever in football.
   */
  expiringSoon: boolean;
}

/**
 * How far above its own opening package the club will go, as a multiple.
 * A modest player prises out a few percent; a star with a year left prises
 * out half as much again.
 */
export function clubCeiling(leverage: TalksLeverage): number {
  const ability = Math.max(0, Math.min(1, (leverage.currentAbility - 40) / 60));
  // A rich club has room to move; a poor one does not, whoever is asking.
  const wealth = Math.min(0.12, leverage.clubReputation / 60_000);
  const expiry = leverage.expiringSoon ? 0.12 : 0;
  return 1.04 + ability * 0.28 + wealth + expiry;
}

export type TalksVerdict = 'ACCEPT' | 'COUNTER' | 'REJECT' | 'WALKED_OUT';

export interface TalksResponse {
  verdict: TalksVerdict;
  /** The club's position after this round — what it is willing to sign. */
  terms: ContractPackage;
  patienceLeft: number;
  /** What the club would say, in words. */
  message: string;
}

/** Clamp a proposal into what anyone could plausibly ask of this club. */
export function clampProposal(
  proposal: ContractPackage,
  baseline: ContractPackage,
): ContractPackage {
  const span = (value: number, base: number, min: number, max: number) =>
    Math.round(Math.max(base * min, Math.min(base * max, value)));
  // A club that opened with no signing fee still has to allow one to be
  // asked for, so zero baselines fall back to a week of wages.
  const floorFor = (base: number) => (base > 0 ? base : baseline.weeklyWage);

  return {
    years: Math.round(
      Math.max(
        TERM_LIMITS.years.min,
        Math.min(TERM_LIMITS.years.max, proposal.years),
      ),
    ),
    weeklyWage: span(
      proposal.weeklyWage,
      baseline.weeklyWage,
      TERM_LIMITS.weeklyWage.min,
      TERM_LIMITS.weeklyWage.max,
    ),
    signingBonus: span(
      proposal.signingBonus,
      floorFor(baseline.signingBonus),
      TERM_LIMITS.signingBonus.min,
      TERM_LIMITS.signingBonus.max,
    ),
    appearanceBonus: span(
      proposal.appearanceBonus,
      floorFor(baseline.appearanceBonus),
      TERM_LIMITS.appearanceBonus.min,
      TERM_LIMITS.appearanceBonus.max,
    ),
    goalBonus: span(
      proposal.goalBonus,
      floorFor(baseline.goalBonus),
      TERM_LIMITS.goalBonus.min,
      TERM_LIMITS.goalBonus.max,
    ),
    squadRole: proposal.squadRole,
  };
}

/** Meet in the middle on every money term, keeping the club's own role. */
function midpoint(
  baseline: ContractPackage,
  proposal: ContractPackage,
  clubPosition: ContractPackage,
): ContractPackage {
  const between = (mine: number, theirs: number) =>
    Math.round(theirs + (mine - theirs) * 0.45);
  return {
    // Length is cheap to concede and the player usually cares about it.
    years: proposal.years,
    weeklyWage: between(proposal.weeklyWage, clubPosition.weeklyWage),
    signingBonus: between(proposal.signingBonus, clubPosition.signingBonus),
    appearanceBonus: between(
      proposal.appearanceBonus,
      clubPosition.appearanceBonus,
    ),
    goalBonus: between(proposal.goalBonus, clubPosition.goalBonus),
    // The shirt is granted or it is not; it is never split down the middle.
    squadRole:
      packageCost({ ...clubPosition, squadRole: proposal.squadRole }) <=
      packageCost(baseline) * 1.1
        ? proposal.squadRole
        : clubPosition.squadRole,
  };
}

export interface TalksInput {
  /** What the club opened with — the yardstick everything is measured against. */
  baseline: ContractPackage;
  /** Where the club stands now, after any previous rounds. */
  clubPosition: ContractPackage;
  proposal: ContractPackage;
  leverage: TalksLeverage;
  /** Rounds of pushing left before the club stops listening. */
  patience: number;
}

/**
 * One round at the table. Deterministic given the rng, so the same seed
 * replays the same negotiation.
 */
export function respondToProposal(
  input: TalksInput,
  rng: RandomSource,
): TalksResponse {
  const proposal = clampProposal(input.proposal, input.baseline);
  const ceiling = clubCeiling(input.leverage);
  const baselineCost = packageCost(input.baseline);
  const ratio = baselineCost > 0 ? packageCost(proposal) / baselineCost : 1;

  if (ratio <= ceiling) {
    return {
      verdict: 'ACCEPT',
      terms: proposal,
      patienceLeft: input.patience,
      message: 'Affare fatto: il club accetta le tue condizioni.',
    };
  }

  const patienceLeft = input.patience - (ratio > ceiling * 1.4 ? 2 : 1);
  if (patienceLeft <= 0) {
    return {
      verdict: 'WALKED_OUT',
      terms: input.clubPosition,
      patienceLeft: 0,
      message:
        'Il club si alza dal tavolo: hai tirato troppo la corda e la trattativa è chiusa.',
    };
  }

  if (ratio > ceiling * 1.4) {
    return {
      verdict: 'REJECT',
      terms: input.clubPosition,
      patienceLeft,
      message:
        'Richiesta fuori scala: il club non si muove di un centesimo e comincia a spazientirsi.',
    };
  }

  // A counter that lands a shade differently each time keeps the table alive
  // without ever going below where the club already stood.
  const jitter = 0.95 + rng.next() * 0.1;
  const counter = midpoint(input.baseline, proposal, input.clubPosition);
  return {
    verdict: 'COUNTER',
    terms: {
      ...counter,
      weeklyWage: Math.max(
        input.clubPosition.weeklyWage,
        Math.round(counter.weeklyWage * jitter),
      ),
    },
    patienceLeft,
    message: 'Il club fa una controproposta: non tutto, ma qualcosa si muove.',
  };
}

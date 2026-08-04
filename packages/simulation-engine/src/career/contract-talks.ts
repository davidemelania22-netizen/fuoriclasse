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
  /** Recent form, 0-100. */
  form: number;
  /** What he has actually done this season. */
  seasonAppearances: number;
  seasonGoals: number;
  /** Years old. A career winding down does not get a rise for being famous. */
  age: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * What the player has done lately, worth between a tenth off and a fifth on.
 *
 * Raw ability is what a player *could* do; a club pays for what he *has* done.
 * A reserve who never gets on the pitch has no case however good he is, and a
 * modest player in the middle of a great run has one.
 */
export function meritFactor(leverage: TalksLeverage): number {
  // Under ten games he is not yet part of the season; over twenty-five he is
  // the team. Form pulls either way around an ordinary 50.
  const played = clamp01((leverage.seasonAppearances - 8) / 18);
  const form = clamp01((leverage.form - 50) / 40);
  const scoring = clamp01(
    leverage.seasonGoals / Math.max(10, leverage.seasonAppearances),
  );
  const earned = played * (0.1 + form * 0.09 + scoring * 0.07);
  // Nothing on the pitch is worse than neutral: it is an argument against him,
  // and a big enough one to wipe out what raw ability would otherwise buy.
  const idle = leverage.seasonAppearances < 5 ? 0.18 : 0;
  return earned - idle;
}

/** Past thirty a club stops paying for the future and starts paying for now. */
function agePenalty(age: number): number {
  return clamp01((age - 30) / 6) * 0.12;
}

/**
 * How far above its own opening package the club will go, as a multiple.
 *
 * A benched player prises out nothing at all — the ceiling can sit below 1,
 * which is the club saying "these are the terms, take them or leave them".
 * A star in form with a year left prises out a third as much again.
 */
export function clubCeiling(leverage: TalksLeverage): number {
  const ability = clamp01((leverage.currentAbility - 40) / 60);
  // A rich club has room to move; a poor one does not, whoever is asking.
  const wealth = Math.min(0.1, leverage.clubReputation / 70_000);
  const expiry = leverage.expiringSoon ? 0.1 : 0;
  return (
    1.0 +
    ability * 0.18 +
    wealth +
    expiry +
    meritFactor(leverage) -
    agePenalty(leverage.age)
  );
}

/** Why a club will not sit down right now. */
export type TalksRefusal = 'COOLING_OFF' | 'JUST_SIGNED' | 'NOT_EARNED';

export interface WillingnessInput {
  /** Weeks before the club will talk again after a walk-out. 0 when free. */
  coolingOffWeeksLeft: number;
  /** Weeks since the last contract was signed here; null when never. */
  weeksSinceSigned: number | null;
  /** Months before the current contract runs out. */
  monthsLeft: number;
  seasonAppearances: number;
  seasonGoals: number;
  /** Recent form, 0-100, centred on an ordinary 50. */
  form: number;
}

export type Willingness =
  | { willing: true }
  | { willing: false; reason: TalksRefusal; message: string };

/** Weeks a club needs after a walk-out before it will hear you again. */
export const COOLING_OFF_WEEKS = 8;
/** Weeks before a freshly signed contract can be reopened. */
export const SETTLE_IN_WEEKS = 16;
/** A contract inside this many months of expiry is worth talking about. */
const EXPIRY_TALKING_MONTHS = 18;

/**
 * Whether the club will even sit down.
 *
 * Without this a renewal was a button: press it, sign it, press it again. A
 * club renews a contract for a reason — the deal is running out, or the player
 * has made himself impossible to ignore. Otherwise the answer is "not now".
 */
export function willClubTalk(input: WillingnessInput): Willingness {
  if (input.coolingOffWeeksLeft > 0) {
    const weeks = Math.ceil(input.coolingOffWeeksLeft);
    return {
      willing: false,
      reason: 'COOLING_OFF',
      message: `Ti sei alzato dal tavolo: al club serve tempo. Se ne riparla fra ${weeks} ${
        weeks === 1 ? 'settimana' : 'settimane'
      }.`,
    };
  }

  if (
    input.weeksSinceSigned !== null &&
    input.weeksSinceSigned < SETTLE_IN_WEEKS
  ) {
    const weeks = SETTLE_IN_WEEKS - Math.floor(input.weeksSinceSigned);
    return {
      willing: false,
      reason: 'JUST_SIGNED',
      message: `Hai firmato da poco: il club non riapre un contratto appena chiuso. Riprova fra ${weeks} ${
        weeks === 1 ? 'settimana' : 'settimane'
      }.`,
    };
  }

  // Either the deal is running down — then the club has its own reason to
  // talk — or the player has made himself impossible to ignore.
  const runningOut = input.monthsLeft <= EXPIRY_TALKING_MONTHS;
  // Being in the side is the price of entry; after that either the form or
  // the goals make the case. Form alone missed the obvious one — a striker
  // with a dozen goals and an ordinary average rating was being told no.
  const earnedIt =
    input.seasonAppearances >= 12 &&
    (input.form >= 55 || input.seasonGoals >= 8);
  if (!runningOut && !earnedIt) {
    return {
      willing: false,
      reason: 'NOT_EARNED',
      message:
        'Il club non ha motivo di ritoccare il tuo contratto adesso: hai ancora anni davanti. Gioca e falli ricredere.',
    };
  }

  return { willing: true };
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

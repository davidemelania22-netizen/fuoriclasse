/**
 * What a week of being a footballer actually pays.
 *
 * A contract is a set of promises — a wage, something per appearance, something
 * per goal — and until those promises turn into money on the balance they are
 * only decoration. This is the rule that turns them into money, so every term
 * argued over at the negotiating table is a term the career can feel.
 */

/** The money terms of a contract. Everything else about it is irrelevant here. */
export interface PayTerms {
  weeklyWage: number;
  appearanceBonus: number;
  goalBonus: number;
}

/** What the protagonist did on the pitch in the period being paid. */
export interface WeekOnThePitch {
  appearances: number;
  goals: number;
}

export type PayKind = 'WAGE' | 'APPEARANCE_BONUS' | 'GOAL_BONUS' | 'SIGNING_BONUS';

export interface PayslipLine {
  kind: PayKind;
  /** Words for the movement, as it appears in the ledger. */
  label: string;
  /** How many weeks, matches or goals this line pays for. */
  units: number;
  amount: number;
}

const plural = (n: number, one: string, many: string) =>
  n === 1 ? one : `${n} ${many}`;

/**
 * The lines a period of `weeks` earns. Zero-value lines are left out: a
 * contract without a goal bonus should not print an empty row every week.
 */
export function weeklyPayslip(
  terms: PayTerms,
  played: WeekOnThePitch,
  weeks = 1,
): PayslipLine[] {
  const lines: PayslipLine[] = [];
  const paidWeeks = Math.max(0, Math.round(weeks));

  const wage = Math.round(Math.max(0, terms.weeklyWage) * paidWeeks);
  if (wage > 0) {
    lines.push({
      kind: 'WAGE',
      label: `Stipendio · ${plural(paidWeeks, 'una settimana', 'settimane')}`,
      units: paidWeeks,
      amount: wage,
    });
  }

  const appearances = Math.max(0, Math.round(played.appearances));
  const appearanceFee = Math.round(
    Math.max(0, terms.appearanceBonus) * appearances,
  );
  if (appearanceFee > 0) {
    lines.push({
      kind: 'APPEARANCE_BONUS',
      label: `Bonus presenza · ${plural(appearances, 'una partita', 'partite')}`,
      units: appearances,
      amount: appearanceFee,
    });
  }

  const goals = Math.max(0, Math.round(played.goals));
  const goalFee = Math.round(Math.max(0, terms.goalBonus) * goals);
  if (goalFee > 0) {
    lines.push({
      kind: 'GOAL_BONUS',
      label: `Bonus gol · ${plural(goals, 'una rete', 'reti')}`,
      units: goals,
      amount: goalFee,
    });
  }

  return lines;
}

/** The one-off paid when ink meets paper. */
export function signingBonusLine(
  amount: number,
  clubName: string,
): PayslipLine | null {
  const paid = Math.round(Math.max(0, amount));
  if (paid <= 0) return null;
  return {
    kind: 'SIGNING_BONUS',
    label: `Bonus alla firma · ${clubName}`,
    units: 1,
    amount: paid,
  };
}

export const payslipTotal = (lines: readonly PayslipLine[]): number =>
  lines.reduce((sum, line) => sum + line.amount, 0);

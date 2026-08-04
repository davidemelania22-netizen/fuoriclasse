import {
  payslipTotal,
  signingBonusLine,
  weeklyPayslip,
  type PayslipLine,
} from '@football-life/simulation-engine';
import type { CareerRepository } from '../repositories/career-repository';
import type { FinanceRepository } from '../repositories/finance-repository';

/**
 * Getting paid.
 *
 * Until this existed the protagonist signed contracts and never saw a cent:
 * the wage, the appearance bonus and the goal bonus were columns in a table
 * nobody read. Now the week that just passed pays out, which is what makes
 * arguing over those numbers worth doing.
 */

export interface WagesDeps {
  career: CareerRepository;
  finance: FinanceRepository;
}

/** What the protagonist did in the period being paid. */
export interface PayPeriod {
  saveGameId: string;
  weeks: number;
  appearances: number;
  goals: number;
}

export interface PayResult {
  lines: PayslipLine[];
  total: number;
  balance: number;
}

/** Pay a week (or several) of wages and match bonuses. Null when unpaid. */
export async function payForWeeks(
  deps: WagesDeps,
  input: PayPeriod,
): Promise<PayResult | null> {
  const career = await deps.career.loadProtagonist(input.saveGameId);
  // No club, no wage. A career between contracts genuinely earns nothing, and
  // that is a pressure the player should feel rather than be shielded from.
  const contract = career?.currentContract;
  if (!contract) return null;

  const lines = weeklyPayslip(
    {
      weeklyWage: contract.weeklyWage,
      appearanceBonus: contract.appearanceBonus,
      goalBonus: contract.goalBonus,
    },
    { appearances: input.appearances, goals: input.goals },
    input.weeks,
  );
  if (lines.length === 0) return null;

  const balance = await deps.finance.recordEarnings(input.saveGameId, lines);
  if (balance === null) return null;
  return { lines, total: payslipTotal(lines), balance };
}

/** Pay the one-off a signature earns. Null when the deal carried no fee. */
export async function paySigningBonus(
  deps: Pick<WagesDeps, 'finance'>,
  input: { saveGameId: string; amount: number; clubName: string },
): Promise<PayResult | null> {
  const line = signingBonusLine(input.amount, input.clubName);
  if (!line) return null;
  const balance = await deps.finance.recordEarnings(input.saveGameId, [line]);
  if (balance === null) return null;
  return { lines: [line], total: line.amount, balance };
}

import { describe, expect, it } from 'vitest';
import {
  payslipTotal,
  signingBonusLine,
  weeklyPayslip,
  type PayTerms,
} from './payslip';

const terms: PayTerms = {
  weeklyWage: 6_000,
  appearanceBonus: 600,
  goalBonus: 3_000,
};

describe('weeklyPayslip', () => {
  it('pays the wage even in a week without a match', () => {
    const lines = weeklyPayslip(terms, { appearances: 0, goals: 0 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: 'WAGE', amount: 6_000 });
  });

  it('pays a match and the goals scored in it', () => {
    const lines = weeklyPayslip(terms, { appearances: 1, goals: 2 });
    expect(payslipTotal(lines)).toBe(6_000 + 600 + 6_000);
    expect(lines.map((l) => l.kind)).toEqual([
      'WAGE',
      'APPEARANCE_BONUS',
      'GOAL_BONUS',
    ]);
  });

  it('pays every week of a longer jump, not just one', () => {
    const lines = weeklyPayslip(terms, { appearances: 4, goals: 0 }, 4);
    expect(lines[0]).toMatchObject({ amount: 24_000, units: 4 });
  });

  it('leaves out the bonuses a contract does not carry', () => {
    const bare = { weeklyWage: 900, appearanceBonus: 0, goalBonus: 0 };
    const lines = weeklyPayslip(bare, { appearances: 3, goals: 1 });
    expect(lines.map((l) => l.kind)).toEqual(['WAGE']);
  });

  it('pays nothing at all without a contract', () => {
    const lines = weeklyPayslip(
      { weeklyWage: 0, appearanceBonus: 0, goalBonus: 0 },
      { appearances: 1, goals: 1 },
    );
    expect(lines).toEqual([]);
  });

  it('never pays a negative amount', () => {
    const lines = weeklyPayslip(
      { weeklyWage: -500, appearanceBonus: -10, goalBonus: -10 },
      { appearances: -3, goals: -1 },
    );
    expect(payslipTotal(lines)).toBe(0);
  });

  it('says in words what it is paying for', () => {
    const one = weeklyPayslip(terms, { appearances: 1, goals: 1 });
    expect(one[1]?.label).toContain('una partita');
    expect(one[2]?.label).toContain('una rete');
    const many = weeklyPayslip(terms, { appearances: 2, goals: 3 });
    expect(many[1]?.label).toContain('2 partite');
    expect(many[2]?.label).toContain('3 reti');
  });
});

describe('signingBonusLine', () => {
  it('names the club that paid it', () => {
    expect(signingBonusLine(120_000, 'Verona Scaligera')).toMatchObject({
      kind: 'SIGNING_BONUS',
      amount: 120_000,
      label: 'Bonus alla firma · Verona Scaligera',
    });
  });

  it('is nothing when the deal carried no fee', () => {
    expect(signingBonusLine(0, 'Verona Scaligera')).toBeNull();
  });
});

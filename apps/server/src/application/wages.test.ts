import { describe, expect, it } from 'vitest';
import { payForWeeks, paySigningBonus } from './wages';
import type {
  CareerRepository,
  ProtagonistCareer,
} from '../repositories/career-repository';
import type {
  EarningToRecord,
  FinanceRepository,
} from '../repositories/finance-repository';

function harness(contract: ProtagonistCareer['currentContract']) {
  const written: EarningToRecord[] = [];
  const career = {
    loadProtagonist: async () => ({ currentContract: contract }),
  } as unknown as CareerRepository;
  const finance = {
    recordEarnings: async (_id: string, lines: readonly EarningToRecord[]) => {
      written.push(...lines);
      return 100_000;
    },
  } as unknown as FinanceRepository;
  return { deps: { career, finance }, written };
}

const contract = {
  id: 'contract-1',
  clubId: 'club-1',
  endDate: new Date('2027-07-01T00:00:00.000Z'),
  squadRole: 'FIRST_TEAM',
  weeklyWage: 5_000,
  appearanceBonus: 500,
  goalBonus: 2_000,
};

describe('payForWeeks', () => {
  it('pays the wage and what the pitch earned', async () => {
    const h = harness(contract);
    const result = (await payForWeeks(h.deps, {
      saveGameId: 'save-1',
      weeks: 1,
      appearances: 1,
      goals: 2,
    }))!;
    expect(result.total).toBe(5_000 + 500 + 4_000);
    expect(result.balance).toBe(100_000);
    expect(h.written).toHaveLength(3);
  });

  it('files the movements under their real type', async () => {
    const h = harness(contract);
    await payForWeeks(h.deps, {
      saveGameId: 'save-1',
      weeks: 1,
      appearances: 1,
      goals: 1,
    });
    expect(h.written.map((w) => w.kind)).toEqual([
      'WAGE',
      'APPEARANCE_BONUS',
      'GOAL_BONUS',
    ]);
  });

  it('pays nothing to a player without a club', async () => {
    const h = harness(null);
    expect(
      await payForWeeks(h.deps, {
        saveGameId: 'save-1',
        weeks: 1,
        appearances: 0,
        goals: 0,
      }),
    ).toBeNull();
    expect(h.written).toEqual([]);
  });

  it('pays every week of a season skip', async () => {
    const h = harness(contract);
    const result = (await payForWeeks(h.deps, {
      saveGameId: 'save-1',
      weeks: 10,
      appearances: 0,
      goals: 0,
    }))!;
    expect(result.total).toBe(50_000);
  });
});

describe('paySigningBonus', () => {
  it('credits the fee and names the club', async () => {
    const h = harness(contract);
    const result = (await paySigningBonus(h.deps, {
      saveGameId: 'save-1',
      amount: 90_000,
      clubName: 'Verona Scaligera',
    }))!;
    expect(result.total).toBe(90_000);
    expect(h.written[0]?.label).toContain('Verona Scaligera');
  });

  it('writes nothing when there was no fee', async () => {
    const h = harness(contract);
    expect(
      await paySigningBonus(h.deps, {
        saveGameId: 'save-1',
        amount: 0,
        clubName: 'Verona Scaligera',
      }),
    ).toBeNull();
    expect(h.written).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { planPromotionRelegation } from './promotion';

describe('planPromotionRelegation', () => {
  const top = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
  const second = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'];

  it('relegates the bottom clubs and promotes the top clubs', () => {
    const swaps = planPromotionRelegation('TOP', top, 'SECOND', second, 2);
    expect(swaps).toEqual([
      { clubId: 'a5', toCompetitionId: 'SECOND' },
      { clubId: 'a6', toCompetitionId: 'SECOND' },
      { clubId: 'b1', toCompetitionId: 'TOP' },
      { clubId: 'b2', toCompetitionId: 'TOP' },
    ]);
  });

  it('never relegates the entire top flight', () => {
    const swaps = planPromotionRelegation(
      'TOP',
      ['a1', 'a2'],
      'SECOND',
      ['b1', 'b2', 'b3'],
      5,
    );
    // Clamped to top.length - 1 = 1 slot.
    expect(swaps).toEqual([
      { clubId: 'a2', toCompetitionId: 'SECOND' },
      { clubId: 'b1', toCompetitionId: 'TOP' },
    ]);
  });

  it('never promotes more clubs than the second flight has', () => {
    const swaps = planPromotionRelegation(
      'TOP',
      ['a1', 'a2', 'a3', 'a4'],
      'SECOND',
      ['b1'],
      3,
    );
    expect(swaps).toEqual([
      { clubId: 'a4', toCompetitionId: 'SECOND' },
      { clubId: 'b1', toCompetitionId: 'TOP' },
    ]);
  });

  it('returns no swaps when zero slots are possible', () => {
    expect(planPromotionRelegation('TOP', ['a1'], 'SECOND', [], 3)).toEqual([]);
  });
});

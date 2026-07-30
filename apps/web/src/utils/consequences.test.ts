import { describe, expect, it } from 'vitest';
import { consequenceChips, percentWord } from './consequences';

describe('consequenceChips', () => {
  it('says the direction and roughly how much, in words', () => {
    const chips = consequenceChips({ morale: 6, reputation: 45 });
    expect(chips.map((chip) => chip.label)).toEqual([
      'Fama ▲ parecchio',
      'Morale ▲ un po’',
    ]);
    expect(chips.every((chip) => chip.tone === 'up')).toBe(true);
  });

  it('treats rising stress as bad news, unlike every other stat', () => {
    const [stress] = consequenceChips({ stress: 8 });
    expect(stress!.label).toBe('Stress ▲ parecchio');
    expect(stress!.tone).toBe('down');

    const [relief] = consequenceChips({ stress: -8 });
    expect(relief!.tone).toBe('up');
  });

  it('formats money as money, with the sign in front', () => {
    expect(consequenceChips({ money: 50000 })[0]).toEqual({
      label: '+50.000 €',
      tone: 'up',
    });
    expect(consequenceChips({ money: -15000 })[0]).toEqual({
      label: '−15.000 €',
      tone: 'down',
    });
  });

  it('shows nothing for a choice that changes nothing', () => {
    expect(consequenceChips({})).toEqual([]);
    expect(consequenceChips({ morale: 0 })).toEqual([]);
  });

  it('survives events saved before choices carried their effects', () => {
    expect(consequenceChips(undefined)).toEqual([]);
  });

  it('puts the biggest effect first, whatever the scale', () => {
    const chips = consequenceChips({ morale: 3, reputation: 60, stress: 2 });
    expect(chips[0]!.label).toBe('Fama ▲ tantissimo');
  });
});

describe('percentWord', () => {
  it('rounds the odds the way a person would say them', () => {
    expect(percentWord(0.6)).toBe('60%');
    expect(percentWord(0.455)).toBe('46%');
    expect(percentWord(1 - 0.72)).toBe('28%');
  });
});

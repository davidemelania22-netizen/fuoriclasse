import type { EventConsequenceView } from '../api/client';

/**
 * Turns a choice's raw deltas into the plain-Italian line the player reads
 * BEFORE deciding. No more hidden consequences: if a choice costs morale, it
 * says so, in words, with the direction and roughly how much.
 */
export interface ConsequenceChip {
  label: string;
  /** 'up' = good for the player, 'down' = bad. Stress is inverted on purpose. */
  tone: 'up' | 'down';
}

interface FieldMeta {
  key: keyof EventConsequenceView;
  name: string;
  /** True when going UP is bad for the player (stress). */
  inverted?: boolean;
  /** Scale of the underlying stat, so "a lot" means the same everywhere. */
  scale: 'stat' | 'wide' | 'money';
}

const FIELDS: FieldMeta[] = [
  { key: 'morale', name: 'Morale', scale: 'stat' },
  { key: 'stress', name: 'Stress', inverted: true, scale: 'stat' },
  { key: 'happiness', name: 'Felicità', scale: 'stat' },
  { key: 'mentalHealth', name: 'Serenità', scale: 'stat' },
  { key: 'motivation', name: 'Motivazione', scale: 'stat' },
  { key: 'reputation', name: 'Fama', scale: 'wide' },
  { key: 'popularity', name: 'Popolarità', scale: 'wide' },
  { key: 'money', name: '', scale: 'money' },
];

/** 0-100 stats move in small steps; fame and popularity in much bigger ones. */
const STAT_BANDS = [
  { max: 3, word: 'un filo' },
  { max: 7, word: 'un po’' },
  { max: 15, word: 'parecchio' },
  { max: Infinity, word: 'tantissimo' },
];

const WIDE_BANDS = [
  { max: 10, word: 'un filo' },
  { max: 25, word: 'un po’' },
  { max: 50, word: 'parecchio' },
  { max: Infinity, word: 'tantissimo' },
];

const amountWord = (value: number, scale: 'stat' | 'wide'): string =>
  (scale === 'stat' ? STAT_BANDS : WIDE_BANDS).find(
    (band) => Math.abs(value) <= band.max,
  )!.word;

const euros = (value: number): string =>
  `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString('it-IT')} €`;

/**
 * Chips describing everything a set of deltas does, strongest effect first.
 * Tolerates a missing set: events stored by older versions have no deltas.
 */
export function consequenceChips(
  consequences: EventConsequenceView | undefined,
): ConsequenceChip[] {
  if (!consequences) return [];
  const chips: { chip: ConsequenceChip; weight: number }[] = [];
  for (const field of FIELDS) {
    const value = consequences[field.key];
    if (value === undefined || value === 0) continue;

    if (field.scale === 'money') {
      chips.push({
        chip: { label: euros(value), tone: value > 0 ? 'up' : 'down' },
        weight: Math.abs(value) / 1000,
      });
      continue;
    }

    const rising = value > 0;
    const good = field.inverted ? !rising : rising;
    chips.push({
      chip: {
        label: `${field.name} ${rising ? '▲' : '▼'} ${amountWord(value, field.scale)}`,
        tone: good ? 'up' : 'down',
      },
      weight: field.scale === 'wide' ? Math.abs(value) / 5 : Math.abs(value),
    });
  }
  return chips.sort((a, b) => b.weight - a.weight).map((entry) => entry.chip);
}

/** "60%" — the odds, rounded the way a person would say them. */
export const percentWord = (chance: number): string =>
  `${Math.round(chance * 100)}%`;

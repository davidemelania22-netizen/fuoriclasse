/**
 * FM-style words for the 0-20 rating scale: the game talks about quality
 * in plain Italian ("Discreto") instead of raw numbers. Bands cover the
 * whole clamped scale, so any 0-20 value maps to exactly one word.
 */
const BANDS: { max: number; word: string; tone: string }[] = [
  { max: 4, word: 'Scarso', tone: 'word-poor' },
  { max: 7, word: 'Mediocre', tone: 'word-weak' },
  { max: 10, word: 'Discreto', tone: 'word-fair' },
  { max: 13, word: 'Buono', tone: 'word-good' },
  { max: 16, word: 'Ottimo', tone: 'word-great' },
  { max: 18, word: 'Eccellente', tone: 'word-elite' },
  { max: 20, word: 'Fuoriclasse', tone: 'word-class' },
];

const bandOf = (value20: number) => {
  const clamped = Math.max(0, Math.min(20, Math.round(value20)));
  return BANDS.find((band) => clamped <= band.max)!;
};

/** Italian quality word for a 0-20 rating. */
export const ratingWord = (value20: number): string => bandOf(value20).word;

/** CSS tone class matching the word's band. */
export const ratingTone = (value20: number): string => bandOf(value20).tone;

/**
 * Morale and fitness need their own words: a body at 100% is "Perfetta", not
 * "Fuoriclasse", and a happy player is "Entusiasta", not "Ottimo". Both take
 * the raw 0-100 the engine stores.
 */
const MORALE_BANDS: { max: number; word: string; tone: string }[] = [
  { max: 20, word: 'A terra', tone: 'word-poor' },
  { max: 40, word: 'Scontento', tone: 'word-weak' },
  { max: 60, word: 'Neutrale', tone: 'word-fair' },
  { max: 80, word: 'Contento', tone: 'word-good' },
  { max: 100, word: 'Entusiasta', tone: 'word-great' },
];

const CONDITION_BANDS: { max: number; word: string; tone: string }[] = [
  { max: 30, word: 'Esausto', tone: 'word-poor' },
  { max: 55, word: 'Affaticato', tone: 'word-weak' },
  { max: 75, word: 'Sufficiente', tone: 'word-fair' },
  { max: 92, word: 'Buona', tone: 'word-good' },
  { max: 100, word: 'Perfetta', tone: 'word-great' },
];

const pick = (
  bands: { max: number; word: string; tone: string }[],
  v: number,
) => bands.find((band) => Math.max(0, Math.min(100, v)) <= band.max)!;

export const moraleWord = (value: number): string =>
  pick(MORALE_BANDS, value).word;
export const moraleTone = (value: number): string =>
  pick(MORALE_BANDS, value).tone;
export const conditionWord = (value: number): string =>
  pick(CONDITION_BANDS, value).word;
export const conditionTone = (value: number): string =>
  pick(CONDITION_BANDS, value).tone;

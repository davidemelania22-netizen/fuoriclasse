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

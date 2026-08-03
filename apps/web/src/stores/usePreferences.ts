import { create } from 'zustand';

/**
 * Preferences that never leave this device: how big the text is, which symbol
 * money wears, whether the scenes play. They apply the instant they change and
 * need no server, so they live in localStorage rather than beside the career.
 */

export type TextScale = 'small' | 'normal' | 'large' | 'larger';
export type Currency = 'EUR' | 'GBP' | 'USD';
export type AttributeDisplay = 'numbers' | 'words';

export interface Preferences {
  textScale: TextScale;
  currency: Currency;
  attributeDisplay: AttributeDisplay;
  /** The unveiling at a new club. */
  playPresentation: boolean;
  /** The trophy ceremony. */
  playCeremony: boolean;
  /** Honour the accessibility setting and cut motion everywhere. */
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  textScale: 'normal',
  currency: 'EUR',
  attributeDisplay: 'numbers',
  playPresentation: true,
  playCeremony: true,
  reduceMotion: false,
};

export const TEXT_SCALES: { key: TextScale; label: string; px: number }[] = [
  { key: 'small', label: 'Piccola', px: 14 },
  { key: 'normal', label: 'Normale', px: 16 },
  { key: 'large', label: 'Grande', px: 18 },
  { key: 'larger', label: 'Più grande', px: 20 },
];

export const CURRENCIES: { key: Currency; label: string; symbol: string }[] = [
  { key: 'EUR', label: '€ — Euro', symbol: '€' },
  { key: 'GBP', label: '£ — Sterlina', symbol: '£' },
  { key: 'USD', label: '$ — Dollaro', symbol: '$' },
];

const STORAGE_KEY = 'fuoriclasse:preferences';

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    // Merge over the defaults: a build that adds a preference must not break
    // on a file written by the build before it.
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as object) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function save(preferences: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // A full or blocked localStorage costs the preference, not the game.
  }
}

/** Push the ones the browser itself has to know about onto the document. */
export function applyPreferences(preferences: Preferences): void {
  const root = document.documentElement;
  const scale =
    TEXT_SCALES.find((s) => s.key === preferences.textScale) ?? TEXT_SCALES[1]!;
  root.style.fontSize = `${scale.px}px`;
  root.dataset.reduceMotion = preferences.reduceMotion ? 'true' : 'false';
}

interface PreferencesState extends Preferences {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
}

export const usePreferences = create<PreferencesState>(
  (setState, getState) => ({
    ...load(),
    set: (key, value) => {
      setState({ [key]: value } as Pick<Preferences, typeof key>);
      // Persist the preferences only — the two actions live on the same
      // object and have no business in localStorage.
      const s = { ...getState(), [key]: value };
      const next: Preferences = {
        textScale: s.textScale,
        currency: s.currency,
        attributeDisplay: s.attributeDisplay,
        playPresentation: s.playPresentation,
        playCeremony: s.playCeremony,
        reduceMotion: s.reduceMotion,
      };
      save(next);
      applyPreferences(next);
    },
    reset: () => {
      setState(DEFAULT_PREFERENCES);
      save(DEFAULT_PREFERENCES);
      applyPreferences(DEFAULT_PREFERENCES);
    },
  }),
);

/**
 * Money in the chosen currency. Only millions are abbreviated: a weekly wage
 * of 1.665 € read as "2K €", which is both wrong and useless — the figures
 * people compare offer to offer are exact ones.
 */
export function formatMoney(value: number, currency: Currency): string {
  const symbol = CURRENCIES.find((c) => c.key === currency)?.symbol ?? '€';
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000;
    return `${Math.abs(m) >= 10 ? Math.round(m) : m.toFixed(2).replace('.', ',')}M ${symbol}`;
  }
  return `${Math.round(value).toLocaleString('it-IT')} ${symbol}`;
}

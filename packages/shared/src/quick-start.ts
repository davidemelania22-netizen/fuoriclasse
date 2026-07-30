/** Career quick-start modes: how the protagonist enters the world. */
export const QUICK_START_KEYS = [
  'CLASSIC',
  'WONDERKID',
  'STARTER',
  'VETERAN',
] as const;

export type QuickStartKey = (typeof QUICK_START_KEYS)[number];

/** Which club, if any, the career signs with automatically at creation. */
export type QuickStartAutoSign = 'TOP_ELITE' | 'TOP_MID' | null;

export interface QuickStartDefinition {
  key: QuickStartKey;
  icon: string;
  label: string;
  description: string;
  /** Protagonist age at the start of the career. */
  ageYears: number;
  /** Baseline for every visible attribute (1-100 engine scale). */
  visibleBaseline: number;
  /** Potential ability ceiling (1-100). */
  potential: number;
  reputation: number;
  marketValue: number;
  autoSign: QuickStartAutoSign;
}

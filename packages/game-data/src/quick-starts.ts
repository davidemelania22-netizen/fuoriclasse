import type {
  QuickStartDefinition,
  QuickStartKey,
} from '@football-life/shared';

/**
 * Career quick-start modes, FM-style. CLASSIC mirrors the historical
 * defaults exactly; the others trade the slow climb for a different fantasy.
 */
export const QUICK_STARTS: readonly QuickStartDefinition[] = [
  {
    key: 'CLASSIC',
    icon: '🌱',
    label: 'La gavetta',
    description:
      'Hai 18 anni e tutto da dimostrare: scegli tu il club da cui partire e conquistati ogni minuto.',
    ageYears: 18,
    visibleBaseline: 25,
    potential: 65,
    reputation: 100,
    marketValue: 50_000,
    autoSign: null,
  },
  {
    key: 'WONDERKID',
    icon: '💎',
    label: 'Wonderkid',
    description:
      'A 16 anni un top club ti ha già preso: talento enorme, pressioni enormi. Devi solo crescere.',
    ageYears: 16,
    visibleBaseline: 40,
    potential: 92,
    reputation: 400,
    marketValue: 250_000,
    autoSign: 'TOP_ELITE',
  },
  {
    key: 'STARTER',
    icon: '⚡',
    label: 'Titolare subito',
    description:
      'Hai 21 anni e un posto da giocarti in prima divisione: parti già pronto in un club di metà classifica.',
    ageYears: 21,
    visibleBaseline: 62,
    potential: 78,
    reputation: 1500,
    marketValue: 1_000_000,
    autoSign: 'TOP_MID',
  },
  {
    key: 'VETERAN',
    icon: '👑',
    label: "L'ultimo ballo",
    description:
      'A 32 anni un grande club ti chiama per chiudere in gloria: esperienza al top, il tempo no.',
    ageYears: 32,
    visibleBaseline: 78,
    potential: 80,
    reputation: 5000,
    marketValue: 2_000_000,
    autoSign: 'TOP_ELITE',
  },
];

export function quickStartOf(
  key: QuickStartKey | undefined,
): QuickStartDefinition {
  return QUICK_STARTS.find((qs) => qs.key === key) ?? QUICK_STARTS[0]!;
}

import type {
  CareerLegacy,
  CareerTimelineEvent,
  SeasonStatsRow,
} from '../api/client';

/** Everything the shareable card puts on the image, already worded. */
export interface CareerCardData {
  playerName: string;
  gradeLabel: string;
  gradeIcon: string;
  gradeDescription: string;
  /** "Ritirato a 35 anni" / "In attività, 24 anni". */
  statusLine: string;
  /** "2024/2025 → 2036/2037", or '' when the player never played. */
  seasonSpan: string;
  stats: { value: string; label: string }[];
  clubs: string[];
  /** Trophies and personal awards, biggest first, ready to print. */
  honours: { icon: string; title: string }[];
  bestSeason: string | null;
  avatarDataUrl: string | null;
}

const GRADE_ICON: Record<string, string> = {
  LEGGENDA: '👑',
  STELLA: '⭐',
  PROFESSIONISTA: '🛡️',
  COMPRIMARIO: '🎽',
  METEORA: '☄️',
};

/** Personal awards read bigger than club trophies on a shareable card. */
const HONOUR_ORDER: Record<string, number> = { AWARD: 0, TROPHY: 1 };
const MAX_HONOURS = 5;
const MAX_CLUBS = 4;

/**
 * Folds the three career endpoints into one card. Seasons are newest-first
 * (as the API returns them), so the span is read from both ends.
 */
export function buildCareerCardData(input: {
  legacy: CareerLegacy;
  seasons: readonly SeasonStatsRow[];
  timeline: readonly CareerTimelineEvent[];
  avatarDataUrl: string | null;
}): CareerCardData {
  const { legacy, seasons, timeline } = input;

  const oldest = seasons[seasons.length - 1];
  const newest = seasons[0];
  const seasonSpan =
    oldest && newest
      ? oldest.seasonLabel === newest.seasonLabel
        ? oldest.seasonLabel
        : `${oldest.seasonLabel} → ${newest.seasonLabel}`
      : '';

  // Club order follows the career, oldest shirt first.
  const clubs: string[] = [];
  for (let i = seasons.length - 1; i >= 0; i -= 1) {
    const club = seasons[i]!.clubName;
    if (club && clubs[clubs.length - 1] !== club && !clubs.includes(club)) {
      clubs.push(club);
    }
  }

  const honours = timeline
    .filter((event) => event.type === 'AWARD' || event.type === 'TROPHY')
    .sort(
      (a, b) =>
        (HONOUR_ORDER[a.type] ?? 9) - (HONOUR_ORDER[b.type] ?? 9) ||
        b.date.localeCompare(a.date),
    )
    .slice(0, MAX_HONOURS)
    .map((event) => ({
      icon: event.type === 'AWARD' ? '🥇' : '🏆',
      title: event.title,
    }));

  return {
    playerName: legacy.playerName,
    gradeLabel: legacy.grade.label,
    gradeIcon: GRADE_ICON[legacy.grade.key] ?? '📈',
    gradeDescription: legacy.grade.description,
    statusLine: legacy.isRetired
      ? `Ritirato a ${legacy.age} anni`
      : `In attività · ${legacy.age} anni`,
    seasonSpan,
    stats: [
      { value: String(legacy.totals.appearances), label: 'Presenze' },
      { value: String(legacy.totals.goals), label: 'Gol' },
      { value: String(legacy.totals.assists), label: 'Assist' },
      { value: legacy.totals.averageRating.toFixed(2), label: 'Media voto' },
      { value: String(legacy.totals.trophies), label: 'Trofei' },
      { value: String(legacy.totals.personalAwards), label: 'Premi' },
    ],
    clubs: clubs.slice(0, MAX_CLUBS),
    honours,
    bestSeason: legacy.bestSeason
      ? `${legacy.bestSeason.seasonLabel} · ${legacy.bestSeason.clubName} — ${legacy.bestSeason.goals} gol in ${legacy.bestSeason.appearances} presenze`
      : null,
    avatarDataUrl: input.avatarDataUrl,
  };
}

/** A filename someone can find again: "carriera-mario-rossi.png". */
export function careerCardFileName(playerName: string): string {
  const slug =
    playerName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'giocatore';
  return `carriera-${slug}.png`;
}

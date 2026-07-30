import type { CareerStatsRepository } from '../repositories/career-stats-repository';
import type { CareerTimelineRepository } from '../repositories/career-timeline-repository';
import { buildCareerTimeline } from './career-timeline';

/** One season of the protagonist's career, aggregated from real appearances. */
export interface SeasonStatsRow {
  seasonLabel: string;
  competitionName: string;
  clubName: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating: number;
}

export interface CareerTotals {
  appearances: number;
  goals: number;
  assists: number;
  averageRating: number;
  trophies: number;
  personalAwards: number;
}

export type LegacyGradeKey =
  | 'LEGGENDA'
  | 'STELLA'
  | 'PROFESSIONISTA'
  | 'COMPRIMARIO'
  | 'METEORA';

export interface CareerLegacy {
  playerName: string;
  age: number;
  isRetired: boolean;
  totals: CareerTotals;
  bestSeason: SeasonStatsRow | null;
  grade: { key: LegacyGradeKey; label: string; description: string };
}

export interface CareerLegacyDeps {
  stats: CareerStatsRepository;
  timeline: CareerTimelineRepository;
}

/** Per-season stats table, newest season first. */
export async function getSeasonStats(
  repository: CareerStatsRepository,
  saveGameId: string,
): Promise<SeasonStatsRow[] | null> {
  const data = await repository.loadCareerStats(saveGameId);
  if (!data) return null;

  const bySeason = new Map<
    string,
    SeasonStatsRow & { seasonStartMs: number; ratingSum: number }
  >();
  for (const row of data.appearances) {
    let agg = bySeason.get(row.seasonId);
    if (!agg) {
      agg = {
        seasonLabel: row.seasonLabel,
        competitionName: row.competitionName,
        clubName: row.clubName,
        appearances: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        averageRating: 0,
        seasonStartMs: row.seasonStartMs,
        ratingSum: 0,
      };
      bySeason.set(row.seasonId, agg);
    }
    agg.appearances += 1;
    agg.goals += row.goals;
    agg.assists += row.assists;
    agg.yellowCards += row.yellowCards;
    agg.redCards += row.redCards;
    agg.ratingSum += row.rating;
    agg.clubName = row.clubName; // last club of the season wins
  }

  return [...bySeason.values()]
    .sort((a, b) => b.seasonStartMs - a.seasonStartMs)
    .map((agg) => ({
      seasonLabel: agg.seasonLabel,
      competitionName: agg.competitionName,
      clubName: agg.clubName,
      appearances: agg.appearances,
      goals: agg.goals,
      assists: agg.assists,
      yellowCards: agg.yellowCards,
      redCards: agg.redCards,
      averageRating:
        agg.appearances > 0
          ? Math.round((agg.ratingSum / agg.appearances) * 100) / 100
          : 0,
    }));
}

const GRADES: {
  min: number;
  key: LegacyGradeKey;
  label: string;
  description: string;
}[] = [
  {
    min: 900,
    key: 'LEGGENDA',
    label: 'Leggenda',
    description: 'Il tuo nome è scolpito nella storia di questo sport.',
  },
  {
    min: 500,
    key: 'STELLA',
    label: 'Stella',
    description: 'Una carriera che i tifosi racconteranno a lungo.',
  },
  {
    min: 250,
    key: 'PROFESSIONISTA',
    label: 'Professionista solido',
    description: 'Anni di mestiere, rispetto e partite vere.',
  },
  {
    min: 80,
    key: 'COMPRIMARIO',
    label: 'Comprimario',
    description: 'Hai lasciato un segno, anche se dal secondo piano.',
  },
  {
    min: 0,
    key: 'METEORA',
    label: 'Meteora',
    description: 'Una scia breve: il calcio è anche questo.',
  },
];

/** Career totals, best season and a hall-of-fame grade. */
export async function getCareerLegacy(
  deps: CareerLegacyDeps,
  saveGameId: string,
): Promise<CareerLegacy | null> {
  const data = await deps.stats.loadCareerStats(saveGameId);
  if (!data) return null;
  const seasons = (await getSeasonStats(deps.stats, saveGameId)) ?? [];
  const timeline = (await buildCareerTimeline(deps.timeline, saveGameId)) ?? [];

  const appearances = data.appearances.length;
  const goals = data.appearances.reduce((s, a) => s + a.goals, 0);
  const assists = data.appearances.reduce((s, a) => s + a.assists, 0);
  const averageRating =
    appearances > 0
      ? Math.round(
          (data.appearances.reduce((s, a) => s + a.rating, 0) / appearances) *
            100,
        ) / 100
      : 0;
  // Timeline already attributes trophies/awards to the protagonist correctly.
  const trophies = timeline.filter((e) => e.type === 'TROPHY').length;
  const personalAwards = timeline.filter((e) => e.type === 'AWARD').length;

  const score =
    appearances * 0.5 +
    goals * 4 +
    assists * 2.5 +
    (appearances > 0 ? averageRating * 20 : 0) +
    trophies * 40 +
    personalAwards * 60;
  const grade =
    GRADES.find((g) => score >= g.min) ?? GRADES[GRADES.length - 1]!;

  const bestSeason =
    seasons.length > 0
      ? [...seasons].sort(
          (a, b) =>
            b.goals - a.goals ||
            b.averageRating - a.averageRating ||
            b.appearances - a.appearances,
        )[0]!
      : null;

  return {
    playerName: `${data.firstName} ${data.lastName}`,
    age: data.age,
    isRetired: data.careerStatus === 'RETIRED',
    totals: {
      appearances,
      goals,
      assists,
      averageRating,
      trophies,
      personalAwards,
    },
    bestSeason,
    grade: {
      key: grade.key,
      label: grade.label,
      description: grade.description,
    },
  };
}

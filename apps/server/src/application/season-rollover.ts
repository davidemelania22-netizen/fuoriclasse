import {
  generateDoubleRoundRobin,
  planPromotionRelegation,
} from '@football-life/simulation-engine';
import type {
  NextSeasonPlan,
  SeasonRolloverRepository,
} from '../repositories/season-rollover-repository';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
/** Weeks of off-season between the last matchday and the next campaign. */
const BREAK_WEEKS = 6;

/** "2024/2025" -> "2025/2026"; falls back to the original if unparseable. */
function nextSeasonLabel(label: string): string {
  const parts = label.split('/').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 2 || parts.some((year) => Number.isNaN(year))) {
    return label;
  }
  return `${parts[0]! + 1}/${parts[1]! + 1}`;
}

export interface SeasonRolloverDeps {
  repository: SeasonRolloverRepository;
  /** Desired promotion/relegation slots per country (clamped per division). */
  promotionSlots?: number;
}

export interface SeasonRolloverResult {
  rolledOver: boolean;
  newSeasonLabel: string | null;
  promotedCount: number;
  relegatedCount: number;
  /** Filled in by the world-aging step after a rollover. */
  retiredCount: number;
  newcomerCount: number;
  /** Filled in by the youth-intake step after a rollover. */
  youthIntakeCount: number;
}

const NO_ROLLOVER: SeasonRolloverResult = {
  rolledOver: false,
  newSeasonLabel: null,
  promotedCount: 0,
  relegatedCount: 0,
  retiredCount: 0,
  newcomerCount: 0,
  youthIntakeCount: 0,
};

/**
 * When every league in the world has finished its season, generate the next
 * one: apply promotions/relegations between each country's two divisions, then
 * create fresh seasons, fixtures and (empty) standings. A no-op when at least
 * one league is still mid-season.
 */
export async function rolloverSeasonsIfComplete(
  deps: SeasonRolloverDeps,
  input: { saveGameId: string },
): Promise<SeasonRolloverResult> {
  const state = await deps.repository.loadRolloverState(input.saveGameId);
  if (!state) return NO_ROLLOVER;

  const desiredSlots = deps.promotionSlots ?? 3;

  // Promotion/relegation for each country that has both a top and second flight.
  const swaps: { clubId: string; toCompetitionId: string }[] = [];
  const byCountry = new Map<string, typeof state.leagues>();
  for (const league of state.leagues) {
    const key = league.countryId ?? '—';
    const group = byCountry.get(key) ?? [];
    group.push(league);
    byCountry.set(key, group);
  }
  for (const group of byCountry.values()) {
    const top = group.find((l) => l.tier === 1);
    const second = group.find((l) => l.tier === 2);
    if (top && second) {
      swaps.push(
        ...planPromotionRelegation(
          top.competitionId,
          top.rankedClubIds,
          second.competitionId,
          second.rankedClubIds,
          desiredSlots,
        ),
      );
    }
  }
  const swapDestination = new Map(
    swaps.map((swap) => [swap.clubId, swap.toCompetitionId]),
  );

  // Each competition's club set after the swaps.
  const newClubs = new Map<string, string[]>();
  for (const league of state.leagues) newClubs.set(league.competitionId, []);
  for (const league of state.leagues) {
    for (const clubId of league.clubIds) {
      const destination = swapDestination.get(clubId) ?? league.competitionId;
      newClubs.get(destination)!.push(clubId);
    }
  }

  // Align every new season to the same start: the longest league's schedule
  // plus a shared off-season break, so all leagues stay in weekly lockstep.
  const maxMatchdays = Math.max(
    ...state.leagues.map(
      (l) => 2 * (newClubs.get(l.competitionId)!.length - 1),
    ),
  );
  const offsetWeeks = maxMatchdays + BREAK_WEEKS;

  const seasons: NextSeasonPlan[] = [];
  let newSeasonLabel: string | null = null;
  for (const league of state.leagues) {
    const clubIds = newClubs.get(league.competitionId)!;
    const durationMs = league.seasonEndMs - league.seasonStartMs;
    const startMs = league.seasonStartMs + offsetWeeks * WEEK_MS;
    const startDate = new Date(startMs);
    const endDate = new Date(startMs + durationMs);
    const label = nextSeasonLabel(league.seasonLabel);
    newSeasonLabel = label;

    const fixtures = generateDoubleRoundRobin(clubIds).map((game) => ({
      matchday: game.matchday,
      homeClubId: game.homeClubKey,
      awayClubId: game.awayClubKey,
      scheduledAt: new Date(startMs + (game.matchday - 1) * WEEK_MS),
    }));

    seasons.push({
      competitionId: league.competitionId,
      label,
      startDate,
      endDate,
      clubIds,
      fixtures,
    });
  }

  await deps.repository.persistRollover(input.saveGameId, { swaps, seasons });

  return {
    rolledOver: true,
    newSeasonLabel,
    promotedCount: swaps.length / 2,
    relegatedCount: swaps.length / 2,
    retiredCount: 0,
    newcomerCount: 0,
    youthIntakeCount: 0,
  };
}

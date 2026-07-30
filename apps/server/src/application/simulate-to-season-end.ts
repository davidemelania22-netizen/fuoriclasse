import type { TrainingIntensity } from '@football-life/shared';
import type { SeasonSummaryRepository } from '../repositories/season-summary-repository';
import type { ProfileRepository } from '../repositories/profile-repository';
import {
  runWeeklyCycle,
  type WeeklyCycleDeps,
  type WeeklyCycleResult,
} from './weekly-cycle';

/** A season is ~22 matchdays plus a break; this only guards runaway loops. */
const MAX_WEEKS = 70;

export interface SeasonSkipTitle {
  type: string;
  competitionName: string;
}

export interface SeasonSkipAward {
  type: string;
  label: string;
  competitionName: string | null;
}

export interface SeasonSkipSummary {
  seasonLabel: string | null;
  clubName: string | null;
  weeksSimulated: number;
  /** True when the season actually ended (rollover happened). */
  seasonCompleted: boolean;
  retired: boolean;
  matchesPlayedByClub: number;
  appearances: number;
  goals: number;
  assists: number;
  /** Null when the protagonist never took the pitch. */
  averageRating: number | null;
  yellowCards: number;
  redCards: number;
  won: number;
  drawn: number;
  lost: number;
  titles: SeasonSkipTitle[];
  awards: SeasonSkipAward[];
  abilityBefore: number;
  abilityAfter: number;
  injuriesSustained: number;
  newSeasonLabel: string | null;
}

export interface SimulateToSeasonEndDeps {
  cycle: WeeklyCycleDeps;
  summary: SeasonSummaryRepository;
  profile: ProfileRepository;
}

const AWARD_LABELS: Record<string, string> = {
  BALLON_DOR: "Sfera d'Oro",
  GOLDEN_BOOT: 'Scarpa Dorata',
};

const TITLE_TYPES = new Set([
  'LEAGUE_TITLE',
  'NATIONAL_CUP',
  'CONTINENTAL_CUP',
  'INTERNATIONAL',
]);

/**
 * Fast-forward to the end of the current season by running the SAME weekly
 * cycle the player would click through, week after week, and report what the
 * protagonist actually did: goals, assists, average rating, awards, trophies.
 */
export async function simulateToSeasonEnd(
  deps: SimulateToSeasonEndDeps,
  input: { saveGameId: string; intensity?: TrainingIntensity | undefined },
): Promise<SeasonSkipSummary | 'not-found' | 'no-club'> {
  const { saveGameId } = input;
  const context = await deps.summary.loadContext(saveGameId);
  if (!context) return 'not-found';
  // Without a club there is no season to play: the loop would burn weeks and
  // months of career for nothing.
  if (!context.clubId) return 'no-club';

  const honoursBefore = new Set(
    (await deps.summary.listHonours(saveGameId)).map((honour) => honour.id),
  );

  let weeksSimulated = 0;
  let seasonCompleted = false;
  let retired = false;
  let matchesPlayedByClub = 0;
  let appearances = 0;
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;
  let ratingSum = 0;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let injuriesSustained = 0;
  let abilityBefore: number | null = null;
  let abilityAfter = 0;
  let newSeasonLabel: string | null = null;
  const titles: SeasonSkipTitle[] = [];

  while (weeksSimulated < MAX_WEEKS) {
    const cycle: WeeklyCycleResult | null = await runWeeklyCycle(deps.cycle, {
      saveGameId,
      weeks: 1,
      ...(input.intensity !== undefined ? { intensity: input.intensity } : {}),
      skipEvents: true,
    });
    if (!cycle) break;
    weeksSimulated += 1;

    abilityBefore ??= cycle.report.abilityBefore;
    abilityAfter = cycle.report.abilityAfter;
    injuriesSustained += cycle.report.injuriesSustained;

    for (const match of cycle.matches) {
      matchesPlayedByClub += 1;
      const ourGoals = match.isHome ? match.homeGoals : match.awayGoals;
      const theirGoals = match.isHome ? match.awayGoals : match.homeGoals;
      if (ourGoals > theirGoals) won += 1;
      else if (ourGoals < theirGoals) lost += 1;
      else drawn += 1;

      if (match.pagella) {
        appearances += 1;
        goals += match.pagella.goals;
        assists += match.pagella.assists;
        yellowCards += match.pagella.yellowCards;
        redCards += match.pagella.redCards;
        ratingSum += match.pagella.rating;
      }
    }

    // Cups, Europe and the national team report the protagonist directly.
    for (const competition of cycle.competitions) {
      if (competition.protagonistIsChampion) {
        titles.push({
          type: competition.type,
          competitionName: competition.competitionName,
        });
      }
    }

    if (cycle.report.retired) {
      retired = true;
      break;
    }
    if (cycle.seasonRollover.rolledOver) {
      seasonCompleted = true;
      newSeasonLabel = cycle.seasonRollover.newSeasonLabel ?? null;
      break;
    }
  }

  // League title (and any honour the loop could not attribute) from the diff.
  const honoursAfter = await deps.summary.listHonours(saveGameId);
  const awards: SeasonSkipAward[] = [];
  for (const honour of honoursAfter) {
    if (honoursBefore.has(honour.id)) continue;
    if (honour.playerId && honour.playerId === context.playerId) {
      awards.push({
        type: honour.type,
        label: AWARD_LABELS[honour.type] ?? honour.type,
        competitionName: honour.competitionName,
      });
      continue;
    }
    // Club trophies: only the ones our own club lifted, and only if the
    // knockout loop above did not already report them.
    const isOurClub =
      context.clubId !== null && honour.clubId === context.clubId;
    const alreadyCounted = titles.some(
      (title) =>
        title.type === honour.type &&
        title.competitionName === (honour.competitionName ?? ''),
    );
    if (isOurClub && TITLE_TYPES.has(honour.type) && !alreadyCounted) {
      titles.push({
        type: honour.type,
        competitionName: honour.competitionName ?? honour.clubName ?? 'Titolo',
      });
    }
  }

  // A flash interview from a mid-season match would be stale by now.
  await deps.profile.setPostMatchPending(saveGameId, null);

  return {
    seasonLabel: context.seasonLabel,
    clubName: context.clubName,
    weeksSimulated,
    seasonCompleted,
    retired,
    matchesPlayedByClub,
    appearances,
    goals,
    assists,
    averageRating:
      appearances > 0 ? Math.round((ratingSum / appearances) * 10) / 10 : null,
    yellowCards,
    redCards,
    won,
    drawn,
    lost,
    titles,
    awards,
    abilityBefore: abilityBefore ?? 0,
    abilityAfter,
    injuriesSustained,
    newSeasonLabel,
  };
}

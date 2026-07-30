import {
  leagueStrengthFactor,
  leagueStrengthLabel,
} from '@football-life/simulation-engine';
import type {
  AwardsRepository,
  SeasonPlayerStat,
} from '../repositories/awards-repository';

/**
 * Below this league strength the world simply is not watching: the season's
 * best player gets local recognition, not a Ballon d'Or.
 */
const BALLON_DOR_MIN_STRENGTH = 0.78;

export interface SeasonAwardWinner {
  playerName: string;
  clubName: string;
  goals: number;
  assists: number;
  averageRating: number;
}

export interface SeasonAwardsResult {
  seasonLabel: string;
  competitionName: string;
  goldenBoot: SeasonAwardWinner | null;
  playerOfSeason: SeasonAwardWinner | null;
  alreadyAwarded: boolean;
  /** 0.45-1: how much this league counts on the world stage. */
  leagueStrength: number;
  leagueStrengthLabel: string;
  /** False when the league is too weak for the world-level award. */
  ballonDorEligible: boolean;
}

function toWinner(stat: SeasonPlayerStat): SeasonAwardWinner {
  return {
    playerName: stat.playerName,
    clubName: stat.clubName,
    goals: stat.goals,
    assists: stat.assists,
    averageRating: stat.averageRating,
  };
}

/** Composite "best player" score: goals and assists matter, but so does the
 * average rating across the whole season — a heuristic stand-in for a real
 * Ballon d'Or panel vote. */
function playerOfSeasonScore(stat: SeasonPlayerStat): number {
  return stat.goals * 2 + stat.assists * 1.5 + stat.averageRating * 3;
}

export async function assignSeasonAwards(
  repository: AwardsRepository,
  saveGameId: string,
): Promise<SeasonAwardsResult | null> {
  const season = await repository.loadLastCompletedLeagueSeason(saveGameId);
  if (!season) return null;

  const strength = leagueStrengthFactor(
    season.competitionReputation,
    season.topLeagueReputation,
  );
  // A season in a modest league still crowns its own best player, but the
  // world-level award ignores whoever is hidden down there.
  const worldClassLeague = strength >= BALLON_DOR_MIN_STRENGTH;
  const leagueContext = {
    leagueStrength: strength,
    leagueStrengthLabel: leagueStrengthLabel(strength),
    ballonDorEligible: worldClassLeague,
  };

  const [existingGolden, existingPotw] = await Promise.all([
    repository.findExistingAward(
      saveGameId,
      season.competitionId,
      season.seasonLabel,
      'GOLDEN_BOOT',
    ),
    repository.findExistingAward(
      saveGameId,
      season.competitionId,
      season.seasonLabel,
      'BALLON_DOR',
    ),
  ]);
  if (existingGolden || existingPotw) {
    return {
      seasonLabel: season.seasonLabel,
      competitionName: season.competitionName,
      goldenBoot: existingGolden,
      playerOfSeason: existingPotw,
      alreadyAwarded: true,
      ...leagueContext,
    };
  }

  const stats = await repository.aggregateSeasonStats(season.seasonId);
  if (stats.length === 0) {
    return {
      seasonLabel: season.seasonLabel,
      competitionName: season.competitionName,
      goldenBoot: null,
      playerOfSeason: null,
      alreadyAwarded: false,
      ...leagueContext,
    };
  }

  const golden = [...stats].sort(
    (a, b) =>
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.averageRating - a.averageRating,
  )[0]!;
  const potw = [...stats].sort(
    (a, b) => playerOfSeasonScore(b) - playerOfSeasonScore(a),
  )[0]!;

  await repository.recordHonour({
    saveGameId,
    seasonLabel: season.seasonLabel,
    type: 'GOLDEN_BOOT',
    competitionId: season.competitionId,
    competitionName: season.competitionName,
    playerId: golden.playerId,
    playerName: golden.playerName,
    detail: {
      clubName: golden.clubName,
      goals: golden.goals,
      assists: golden.assists,
      averageRating: golden.averageRating,
    },
  });
  if (!worldClassLeague) {
    return {
      seasonLabel: season.seasonLabel,
      competitionName: season.competitionName,
      goldenBoot: toWinner(golden),
      playerOfSeason: null,
      alreadyAwarded: false,
      ...leagueContext,
    };
  }

  await repository.recordHonour({
    saveGameId,
    seasonLabel: season.seasonLabel,
    type: 'BALLON_DOR',
    competitionId: season.competitionId,
    competitionName: season.competitionName,
    playerId: potw.playerId,
    playerName: potw.playerName,
    detail: {
      clubName: potw.clubName,
      goals: potw.goals,
      assists: potw.assists,
      averageRating: potw.averageRating,
    },
  });

  return {
    seasonLabel: season.seasonLabel,
    competitionName: season.competitionName,
    goldenBoot: toWinner(golden),
    playerOfSeason: toWinner(potw),
    alreadyAwarded: false,
    ...leagueContext,
  };
}

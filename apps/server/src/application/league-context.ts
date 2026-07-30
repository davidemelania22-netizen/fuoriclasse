import {
  leagueGrowthModifier,
  leagueScoutAttention,
  leagueStrengthFactor,
  leagueStrengthLabel,
  leagueStrengthStars,
  reputationGainFromMatch,
} from '@football-life/simulation-engine';
import type { LeagueContextRepository } from '../repositories/league-context-repository';
import type { NewsItemInput } from '../repositories/news-repository';
import type { MatchdayReport } from './simulate-matchday';

/**
 * The shop window the career is played in. One weekly lookup feeds three
 * things at once: how fast the player develops, how far their name travels,
 * and how many scouts bother to show up.
 */
export interface LeagueSpotlight {
  competitionName: string;
  /** 0.45-1: what this league is worth against the world's strongest. */
  strength: number;
  label: string;
  stars: number;
  growthModifier: number;
  scoutAttention: number;
}

/** Neutral spotlight for an unattached player: nothing to scale by. */
const NO_LEAGUE: LeagueSpotlight = {
  competitionName: '',
  strength: 1,
  label: leagueStrengthLabel(1),
  stars: 5,
  growthModifier: 1,
  scoutAttention: 1,
};

export async function getLeagueSpotlight(
  repository: LeagueContextRepository,
  saveGameId: string,
): Promise<LeagueSpotlight | null> {
  const league = await repository.loadProtagonistLeague(saveGameId);
  if (!league) return null;
  const strength = leagueStrengthFactor(
    league.competitionReputation,
    league.topLeagueReputation,
  );
  return {
    competitionName: league.competitionName,
    strength,
    label: leagueStrengthLabel(strength),
    stars: leagueStrengthStars(strength),
    growthModifier: leagueGrowthModifier(strength),
    scoutAttention: leagueScoutAttention(strength),
  };
}

/** The spotlight to simulate with — neutral when the player has no league. */
export async function resolveSpotlight(
  repository: LeagueContextRepository,
  saveGameId: string,
): Promise<LeagueSpotlight> {
  return (await getLeagueSpotlight(repository, saveGameId)) ?? NO_LEAGUE;
}

/** Reputation milestones worth a headline, so fame is visible as it grows. */
const FAME_MILESTONES: { at: number; headline: string; body: string }[] = [
  {
    at: 1500,
    headline: 'Il tuo nome inizia a circolare',
    body: 'Le prestazioni non passano più inosservate: se ne parla oltre i confini del tuo club.',
  },
  {
    at: 3000,
    headline: 'Sei un nome noto del calcio',
    body: 'I tifosi ti riconoscono per strada e i giornali ti citano senza doverti presentare.',
  },
  {
    at: 5000,
    headline: 'Stella internazionale',
    body: 'La tua fama ha superato il campionato: sei uno dei volti del calcio che conta.',
  },
];

export interface ReputationWeek {
  delta: number;
  reputation: number;
  news: NewsItemInput[];
}

/**
 * Turns the week's performances into fame, weighted by the league. A hat-trick
 * in a provincial division moves far less than the same one at the top.
 */
export async function applyMatchReputation(
  repository: LeagueContextRepository,
  input: {
    saveGameId: string;
    matches: readonly MatchdayReport[];
    spotlight: LeagueSpotlight;
    gameDate: Date;
  },
): Promise<ReputationWeek | null> {
  const played = input.matches.filter((match) => match.pagella !== null);
  if (played.length === 0) return null;

  const delta = played.reduce(
    (sum, match) =>
      sum + reputationGainFromMatch(match.pagella!, input.spotlight.strength),
    0,
  );
  const rounded = Math.round(delta);
  if (rounded === 0) return null;

  const moved = await repository.addProtagonistReputation(
    input.saveGameId,
    rounded,
  );
  if (!moved) return null;
  const { before, after } = moved;

  const news: NewsItemInput[] = [];
  const crossed = FAME_MILESTONES.find(
    (milestone) => after >= milestone.at && before < milestone.at,
  );
  if (crossed) {
    news.push({
      gameDate: input.gameDate,
      category: 'MEDIA',
      headline: crossed.headline,
      body: crossed.body,
    });
  }

  return { delta: rounded, reputation: after, news };
}

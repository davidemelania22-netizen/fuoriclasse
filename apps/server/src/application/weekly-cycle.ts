import type { TrainingIntensity } from '@football-life/shared';
import {
  matchAftermath,
  transferWindowAt,
} from '@football-life/simulation-engine';
import type { MarketRepository } from '../repositories/market-repository';
import { advanceWeeks } from './advance-week';
import { simulateDueMatchdays } from './simulate-matchday';
import { announceNationalCallup } from './national-callup';
import { resolveDueCompetitions } from './resolve-competitions';
import { rolloverSeasonsIfComplete } from './season-rollover';
import { ageWorldAtSeasonBoundary } from './npc-aging';
import { reviewCompletedSeason } from './season-review';
import { runTransferWindow } from './transfer-market';
import { runYouthIntake } from './youth-intake';
import { runScoutingWeek } from './scouting';
import { updateManagerTrust } from './manager-status';
import { queuePostMatch } from './post-match';
import { generateWeeklyEvent } from './events';
import { buildProtagonistNews, buildTransferNews, recordNews } from './news';
import { maybeOfferLoan, returnFromLoanIfDue, type LoanDeps } from './loans';
import {
  maybeOfferNaturalization,
  type NaturalizationDeps,
} from './naturalization';
import { applyMatchReputation, resolveSpotlight } from './league-context';
import { payForWeeks, type WagesDeps } from './wages';
import type { ProfileRepository } from '../repositories/profile-repository';
import type { NewsRepository } from '../repositories/news-repository';
import type { LeagueContextRepository } from '../repositories/league-context-repository';

/**
 * Everything one in-game week does. Extracted from the advance-week route so
 * the season fast-forward runs the IDENTICAL pipeline — training, growth,
 * injuries, matches, competitions, rollover, market, scouting, trust — rather
 * than a shortcut that would quietly skip half the simulation.
 */
export interface WeeklyCycleDeps {
  advance: Parameters<typeof advanceWeeks>[0];
  matchday: Parameters<typeof simulateDueMatchdays>[0];
  nationalCallup: Parameters<typeof announceNationalCallup>[0];
  resolveCompetitions: Parameters<typeof resolveDueCompetitions>[0];
  seasonRollover: Parameters<typeof rolloverSeasonsIfComplete>[0];
  npcAging: Parameters<typeof ageWorldAtSeasonBoundary>[0];
  seasonReview: Parameters<typeof reviewCompletedSeason>[0];
  transferMarket: Parameters<typeof runTransferWindow>[0];
  youthIntake: Parameters<typeof runYouthIntake>[0];
  scouting: Parameters<typeof runScoutingWeek>[0];
  managerTrust: Parameters<typeof updateManagerTrust>[0];
  postMatch: Parameters<typeof queuePostMatch>[0];
  events: Parameters<typeof generateWeeklyEvent>[0];
  news: Parameters<typeof recordNews>[0];
  loans: LoanDeps;
  naturalization: NaturalizationDeps;
  profile: ProfileRepository;
  newsRepo: NewsRepository;
  leagueContext: LeagueContextRepository;
  market: MarketRepository;
  wages: WagesDeps;
}

export interface WeeklyCycleInput {
  saveGameId: string;
  weeks?: number | undefined;
  intensity?: TrainingIntensity | undefined;
  /**
   * Fast-forward mode: skip the weekly decision event so a season skip does
   * not bury the player under dozens of unresolved choices.
   */
  skipEvents?: boolean | undefined;
}

export type WeeklyCycleResult = NonNullable<
  Awaited<ReturnType<typeof runWeeklyCycle>>
>;

/** Runs one advance-week cycle. Null when the save has no protagonist. */
export async function runWeeklyCycle(
  deps: WeeklyCycleDeps,
  input: WeeklyCycleInput,
) {
  const { saveGameId } = input;
  // The league the career is played in scales three things this week: how fast
  // the player develops, how far a good game travels, and how many scouts come.
  const spotlight = await resolveSpotlight(deps.leagueContext, saveGameId);
  const report = await advanceWeeks(deps.advance, {
    saveGameId,
    leagueGrowthModifier: spotlight.growthModifier,
    ...(input.weeks !== undefined ? { weeks: input.weeks } : {}),
    ...(input.intensity !== undefined ? { intensity: input.intensity } : {}),
  });
  if (!report) return null;

  const toDate = new Date(report.newCurrentDate);
  // Simulate EVERYTHING still scheduled up to now, not just this advance's
  // window: a big time-skip can leave a rolled-over season's early fixtures
  // dated before the current date, and they must not be silently skipped.
  const fromDate = new Date(0);
  // Consume any prepared pre-match plan for the protagonist's fixture.
  const profileForPlan = await deps.profile.getProfile(saveGameId);
  const matchPlan = profileForPlan?.matchPlan ?? null;
  const matches = await simulateDueMatchdays(deps.matchday, {
    saveGameId,
    fromDate,
    toDate,
    matchPlan,
  });
  if (matchPlan) {
    await deps.profile.setMatchPlan(saveGameId, null);
  }

  // The CT names the provisional list before the tournament resolves.
  const callupAnnouncement = await announceNationalCallup(deps.nationalCallup, {
    saveGameId,
    toDate,
  });

  const competitions = await resolveDueCompetitions(deps.resolveCompetitions, {
    saveGameId,
    toDate,
  });

  const seasonRollover = await rolloverSeasonsIfComplete(deps.seasonRollover, {
    saveGameId,
  });
  // News that will land in the player's inbox this advance.
  const newsItems = buildProtagonistNews(matches);
  if (callupAnnouncement) newsItems.push(...callupAnnouncement.news);
  if (seasonRollover.rolledOver) {
    const aging = await ageWorldAtSeasonBoundary(deps.npcAging, {
      saveGameId,
      seasonLabel: seasonRollover.newSeasonLabel ?? 'next',
    });
    seasonRollover.retiredCount = aging.retiredCount;
    seasonRollover.newcomerCount = aging.youthCount;

    // Crown champions and churn the dugouts before the market opens.
    newsItems.push(
      ...(await reviewCompletedSeason(deps.seasonReview, {
        saveGameId,
        gameDate: toDate,
      })),
    );

    // The world moves in the transfer window between seasons.
    const transfers = await runTransferWindow(deps.transferMarket, {
      saveGameId,
      seasonLabel: seasonRollover.newSeasonLabel ?? 'next',
    });
    newsItems.push(...buildTransferNews(toDate, transfers));

    // Youth intake day: every academy graduates its new class.
    const intake = await runYouthIntake(deps.youthIntake, {
      saveGameId,
      seasonLabel: seasonRollover.newSeasonLabel ?? 'next',
    });
    seasonRollover.youthIntakeCount = intake.totalGraduates;
    newsItems.push(...intake.news);

    // Loans expire with the season: the player reports back to the owner.
    newsItems.push(
      ...(await returnFromLoanIfDue(deps.loans, {
        saveGameId,
        newSeasonLabel: seasonRollover.newSeasonLabel ?? 'next',
        gameDate: toDate,
      })),
    );
  }

  // A benched youngster gets shopped around the division below.
  const loanOffer = await maybeOfferLoan(deps.loans, {
    saveGameId,
    seed: saveGameId,
    gameDate: toDate,
  });
  if (loanOffer) newsItems.push(...loanOffer.news);

  // Years spent in a foreign league can earn a second passport.
  const naturalizationOffer = await maybeOfferNaturalization(
    deps.naturalization,
    { saveGameId, gameDate: toDate },
  );
  if (naturalizationOffer) newsItems.push(...naturalizationOffer.news);

  // Scouts in the stands: dossiers move, and big interest becomes offers.
  const marketState = await deps.market.loadMarketState(saveGameId);
  const marketOpen = marketState?.seasonStart
    ? transferWindowAt(toDate, marketState.seasonStart).isOpen
    : true;
  const scouting = await runScoutingWeek(deps.scouting, {
    saveGameId,
    matches,
    attention: spotlight.scoutAttention,
    marketOpen,
  });
  if (scouting) newsItems.push(...scouting.news);

  // Fame follows the performances, weighted by the shop window they happened in.
  const reputation = await applyMatchReputation(deps.leagueContext, {
    saveGameId,
    matches,
    spotlight,
    gameDate: toDate,
  });
  if (reputation) newsItems.push(...reputation.news);

  await recordNews(deps.news, saveGameId, newsItems);

  const managerTrust = await updateManagerTrust(deps.managerTrust, {
    saveGameId,
    matches,
    injured: report.injured,
  });

  // A flash interview waits after any match the protagonist played.
  const postMatch = await queuePostMatch(deps.postMatch, {
    saveGameId,
    matches,
  });

  // Ninety minutes leave a mark that training never did: legs and mood both.
  // Applied here rather than inside the advance, because the week's training
  // runs before anyone knows how Sunday went.
  const aftermath = matchAftermath(
    matches.map((match) => {
      const ours = match.isHome
        ? match.homeGoals > match.awayGoals
        : match.awayGoals > match.homeGoals;
      return {
        played: match.pagella !== null,
        minutes: match.pagella?.minutes ?? 0,
        rating: match.pagella?.rating ?? 0,
        goals: match.pagella?.goals ?? 0,
        won: ours,
        drew: match.homeGoals === match.awayGoals,
      };
    }),
  );
  if (aftermath.fatigue !== 0 || aftermath.morale !== 0) {
    const after = await deps.advance.repository.applyMatchAftermath({
      saveGameId,
      fatigueDelta: aftermath.fatigue,
      moraleDelta: aftermath.morale,
    });
    // The report is what the player reads: it must show the legs and the mood
    // as they are once Sunday is over, not as they were on the Monday before.
    if (after) {
      report.fatigue = after.fatigue;
      report.condition = after.condition;
      report.morale = after.morale;
    }
  }

  // Pay day. The wage is owed for every week that passed; the bonuses only for
  // what actually happened on the pitch.
  const played = matches.filter((match) => match.pagella !== null);
  const payslip = await payForWeeks(deps.wages, {
    saveGameId,
    weeks: report.weeksAdvanced,
    appearances: played.length,
    goals: played.reduce((sum, match) => sum + (match.pagella?.goals ?? 0), 0),
  });

  const event = input.skipEvents
    ? null
    : await generateWeeklyEvent(deps.events, { saveGameId });
  const unreadNews = await deps.newsRepo.countUnread(saveGameId);

  return {
    report,
    event,
    matches,
    seasonRollover,
    competitions,
    managerTrust,
    unreadNews,
    postMatch,
    scouting,
    loanOffer: loanOffer?.offer ?? null,
    naturalizationOffer: naturalizationOffer?.offer ?? null,
    spotlight,
    reputation,
    payslip,
  };
}

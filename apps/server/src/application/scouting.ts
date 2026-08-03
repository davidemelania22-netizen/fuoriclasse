import { DEFAULT_CAREER_CONFIG } from '@football-life/game-data';
import {
  createRandomSource,
  pickScoutingClubs,
  recommendContractTerms,
  scoutInterestAfterMatch,
  scoutInterestIdle,
  SCOUT_INTEREST_AFTER_OFFER,
  SCOUT_OFFER_THRESHOLD,
} from '@football-life/simulation-engine';
import type { ProfileRepository } from '../repositories/profile-repository';
import type { ScoutingRepository } from '../repositories/scouting-repository';
import type {
  CareerRepository,
  OfferInput,
} from '../repositories/career-repository';
import type { NewsItemInput } from '../repositories/news-repository';
import type { MatchdayReport } from './simulate-matchday';

const OFFER_VALIDITY_MS = 28 * 86_400_000;

export interface ScoutingDeps {
  scouting: ScoutingRepository;
  profile: ProfileRepository;
  career: CareerRepository;
}

export interface ScoutWatcher {
  clubName: string;
  interest: number;
  watchedThisWeek: boolean;
}

export interface ScoutingWeek {
  watchers: ScoutWatcher[];
  /** Clubs whose sustained interest turned into a real transfer offer. */
  offersFrom: string[];
  news: NewsItemInput[];
}

/**
 * Weekly scouting pass, run after the matchdays: scouts of bigger clubs may
 * attend the protagonist's match, their club's dossier moves with the
 * performance, unattended dossiers fade, and a dossier past the threshold
 * becomes a concrete transfer offer (visible in the agent's "offers" list).
 */
export async function runScoutingWeek(
  deps: ScoutingDeps,
  input: {
    saveGameId: string;
    matches: readonly MatchdayReport[];
    /** How closely the world watches this league (1 = a top division). */
    attention?: number | undefined;
    /**
     * Clubs can only table a bid while the market is open. Interest keeps
     * building when it is shut, so the window reopening brings a rush —
     * which is exactly how a transfer window feels.
     */
    marketOpen?: boolean | undefined;
  },
): Promise<ScoutingWeek | null> {
  const state = await deps.scouting.loadScoutingState(input.saveGameId);
  if (!state) return null;
  const profile = await deps.profile.getProfile(input.saveGameId);
  const dossiers = new Map(Object.entries(profile?.scoutInterest ?? {}));

  const played = [...input.matches]
    .reverse()
    .find((match) => match.pagella !== null);

  const rng = createRandomSource(
    `${state.seed}:scouting:${state.currentDate.toISOString()}`,
  );
  const clubById = new Map(state.candidates.map((c) => [c.id, c]));
  const news: NewsItemInput[] = [];
  const watchedIds = new Set<string>();

  if (played) {
    const opponent = played.isHome ? played.awayClubName : played.homeClubName;
    const watchers = pickScoutingClubs(
      state.candidates,
      dossiers,
      rng,
      input.attention ?? 1,
    );
    for (const watcher of watchers) {
      watchedIds.add(watcher.id);
      const before = dossiers.get(watcher.id) ?? 0;
      const after = scoutInterestAfterMatch(before, played.pagella!.rating);
      dossiers.set(watcher.id, after);
      // Only the opening of a dossier makes the papers; the follow-ups are
      // visible in the dashboard widget instead.
      if (before === 0 && after > 0) {
        const club = clubById.get(watcher.id)!;
        news.push({
          gameDate: new Date(played.date),
          category: 'SCOUT',
          headline: `Osservatori del ${club.name} in tribuna`,
          body: `Gli emissari del ${club.name} ti hanno seguito contro il ${opponent}: hanno aperto un dossier su di te.`,
        });
      }
    }
  }

  // Dossiers nobody updated this week fade; near zero they close.
  for (const [clubId, interest] of dossiers) {
    if (watchedIds.has(clubId)) continue;
    const faded = scoutInterestIdle(interest);
    if (faded === 0) dossiers.delete(clubId);
    else dossiers.set(clubId, faded);
  }

  // Interest past the threshold turns into a concrete offer.
  const offersFrom: string[] = [];
  const offerInputs: OfferInput[] = [];
  const marketOpen = input.marketOpen ?? true;
  for (const [clubId, interest] of dossiers) {
    if (interest < SCOUT_OFFER_THRESHOLD) continue;
    // Dossier is ready but the market is shut: the club waits rather than
    // losing the interest it built up.
    if (!marketOpen) continue;
    const club = clubById.get(clubId);
    if (!club) {
      dossiers.delete(clubId); // e.g. no longer above us after promotion
      continue;
    }
    const terms = recommendContractTerms(
      {
        currentAbility: state.player.currentAbility,
        age: state.player.age,
        clubReputation: club.reputation,
        clubStrength: club.strength,
      },
      DEFAULT_CAREER_CONFIG,
    );
    offerInputs.push({
      fromClubId: state.clubId,
      toClubId: club.id,
      fee: Math.max(0, state.player.marketValue),
      offeredWage: terms.weeklyWage,
      contractYears: terms.years,
      squadRole: terms.squadRole,
      createdAt: state.currentDate,
      expiresAt: new Date(state.currentDate.getTime() + OFFER_VALIDITY_MS),
    });
    offersFrom.push(club.name);
    dossiers.set(clubId, SCOUT_INTEREST_AFTER_OFFER);
    news.push({
      gameDate: state.currentDate,
      category: 'SCOUT',
      headline: `Il ${club.name} presenta un'offerta ufficiale`,
      body: `Dopo settimane di relazioni positive, gli osservatori del ${club.name} hanno convinto la dirigenza: c'è un'offerta sul tavolo del tuo procuratore.`,
    });
  }
  if (offerInputs.length > 0) {
    await deps.career.createOffers(state.playerId, offerInputs);
  }

  await deps.profile.setScoutInterest(
    input.saveGameId,
    Object.fromEntries(dossiers),
  );

  const watchers: ScoutWatcher[] = [...dossiers.entries()]
    .map(([clubId, interest]) => ({
      clubName: clubById.get(clubId)?.name ?? 'Sconosciuto',
      interest: Math.round(interest),
      watchedThisWeek: watchedIds.has(clubId),
    }))
    .sort((a, b) => b.interest - a.interest)
    .slice(0, 5);

  return { watchers, offersFrom, news };
}

/** Current dossiers for the dashboard widget (no simulation, read-only). */
export async function getScoutWatchers(
  deps: Pick<ScoutingDeps, 'scouting' | 'profile'>,
  saveGameId: string,
): Promise<ScoutWatcher[]> {
  const state = await deps.scouting.loadScoutingState(saveGameId);
  if (!state) return [];
  const profile = await deps.profile.getProfile(saveGameId);
  const clubById = new Map(state.candidates.map((c) => [c.id, c]));
  return Object.entries(profile?.scoutInterest ?? {})
    .map(([clubId, interest]) => ({
      clubName: clubById.get(clubId)?.name ?? 'Sconosciuto',
      interest: Math.round(interest),
      watchedThisWeek: false,
    }))
    .sort((a, b) => b.interest - a.interest)
    .slice(0, 5);
}

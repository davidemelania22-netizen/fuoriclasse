import { CompetitionType } from '@football-life/shared';
import { seasonLabelOf } from '../util/season-label';
import type { CompetitionCalendarRepository } from '../repositories/competition-calendar-repository';
import type { NationalTeamRepository } from '../repositories/national-team-repository';
import type {
  ProfileRepository,
  StoredNationalCallup,
} from '../repositories/profile-repository';
import type { InterviewRepository } from '../repositories/interview-repository';
import type { NaturalizationRepository } from '../repositories/naturalization-repository';
import type { NewsItemInput } from '../repositories/news-repository';

const DAY_MS = 86_400_000;
/** The CT announces the provisional list this many days before the Europei. */
const ANNOUNCE_DAYS_BEFORE = 21;

export interface NationalCallupDeps {
  calendar: CompetitionCalendarRepository;
  nationalTeam: NationalTeamRepository;
  profile: ProfileRepository;
  squadSize: number;
}

export interface CallupAnnouncement {
  callup: StoredNationalCallup;
  news: NewsItemInput[];
}

/**
 * Three weeks before the Europei the CT names the provisional squad. If the
 * protagonist makes the cut (same call-up scoring the tournament itself uses)
 * a PENDING call-up lands on their dashboard: accept it for pride and
 * exposure, or decline it to rest — and be left out of the tournament.
 * Runs at most once per season (any stored status for the season blocks it).
 */
export async function announceNationalCallup(
  deps: NationalCallupDeps,
  input: { saveGameId: string; toDate: Date },
): Promise<CallupAnnouncement | null> {
  const state = await deps.calendar.loadCalendarState(input.saveGameId);
  if (!state) return null;
  const international = state.competitions.find(
    (c) => c.type === CompetitionType.International,
  );
  if (!international) return null;

  const announceMs = state.lastMatchdayMs - ANNOUNCE_DAYS_BEFORE * DAY_MS;
  if (input.toDate.getTime() < announceMs) return null;

  const seasonLabel = seasonLabelOf(state.currentDate);
  // Once the tournament has been played this season, the moment has passed.
  const alreadyPlayed = state.honours.some(
    (h) => h.seasonLabel === seasonLabel && h.type === 'INTERNATIONAL',
  );
  if (alreadyPlayed) return null;

  const profile = await deps.profile.getProfile(input.saveGameId);
  if (profile?.nationalCallup?.seasonLabel === seasonLabel) return null;

  const field = await deps.nationalTeam.loadField(
    input.saveGameId,
    deps.squadSize,
  );
  if (!field) return null;

  const called = field.protagonistCountryId !== null;
  const countryName = called
    ? (field.countryNames.get(field.protagonistCountryId!) ?? 'Nazionale')
    : '';
  const callup: StoredNationalCallup = {
    seasonLabel,
    status: called ? 'PENDING' : 'NOT_CALLED',
    competitionName: field.competitionName,
    countryName,
  };
  await deps.profile.setNationalCallup(input.saveGameId, callup);

  if (!called) return null;
  return {
    callup,
    news: [
      {
        gameDate: state.currentDate,
        category: 'NATIONAL',
        headline: `Convocazione: sei nella lista per gli ${field.competitionName}`,
        body: `Il CT della ${countryName} ti ha inserito nella lista provvisoria per gli ${field.competitionName}. Rispondi alla convocazione dalla tua bacheca.`,
      },
    ],
  };
}

export interface CallupDecisionDeps {
  profile: ProfileRepository;
  interview: InterviewRepository;
  /** Used to read the nationality the call-up ties the player to. */
  naturalization: NaturalizationRepository;
}

export type CallupDecisionResult =
  | { status: 'ok'; callup: StoredNationalCallup }
  | { status: 'no-pending' };

/** Answer the CT: pride and exposure, or rest and a reputation dent. */
export async function decideNationalCallup(
  deps: CallupDecisionDeps,
  input: { saveGameId: string; accept: boolean },
): Promise<CallupDecisionResult> {
  const profile = await deps.profile.getProfile(input.saveGameId);
  const pending = profile?.nationalCallup;
  if (!pending || pending.status !== 'PENDING') return { status: 'no-pending' };

  const updated: StoredNationalCallup = {
    ...pending,
    status: input.accept ? 'ACCEPTED' : 'DECLINED',
  };
  await deps.profile.setNationalCallup(input.saveGameId, updated);
  if (input.accept) {
    // Answering the CT ties the player to this nation for good: no federation
    // can naturalise them afterwards.
    const context = await deps.naturalization.loadContext(input.saveGameId);
    if (context) {
      await deps.profile.setCappedForCountry(
        input.saveGameId,
        context.nationalityId,
      );
    }
  }
  await deps.interview.applyStatDeltas(
    input.saveGameId,
    input.accept
      ? { morale: 8, reputation: 8, popularity: 5, stress: 4 }
      : { stress: -6, mentalHealth: 3, reputation: -8, popularity: -6 },
  );
  return { status: 'ok', callup: updated };
}

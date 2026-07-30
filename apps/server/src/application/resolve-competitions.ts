import { CompetitionType } from '@football-life/shared';
import { seasonLabelOf } from '../util/season-label';
import type { CompetitionCalendarRepository } from '../repositories/competition-calendar-repository';
import type { ProfileRepository } from '../repositories/profile-repository';
import { simulateNationalCup, type CupDeps } from './cup';
import { simulateContinental, type ContinentalDeps } from './continental';
import {
  simulateNationalTeamTournament,
  type NationalTeamDeps,
} from './national-team';

const DAY_MS = 86_400_000;

// When each competition resolves, relative to the final league matchday.
const RESOLUTION_OFFSET_DAYS: Record<string, number> = {
  [CompetitionType.Cup]: -14,
  [CompetitionType.Continental]: -7,
  [CompetitionType.International]: 0,
};

// Competition type -> the Honour type its trophy is recorded under.
const HONOUR_TYPE: Record<string, string> = {
  [CompetitionType.Cup]: 'NATIONAL_CUP',
  [CompetitionType.Continental]: 'CONTINENTAL_CUP',
  [CompetitionType.International]: 'INTERNATIONAL',
};

// Resolve in a stable order: national cups, then Europe, then national teams.
const TYPE_ORDER: Record<string, number> = {
  [CompetitionType.Cup]: 0,
  [CompetitionType.Continental]: 1,
  [CompetitionType.International]: 2,
};

export interface ResolveCompetitionsDeps {
  calendarRepository: CompetitionCalendarRepository;
  cupDeps: CupDeps;
  continentalDeps: ContinentalDeps;
  nationalTeamDeps: NationalTeamDeps;
  profileRepository: ProfileRepository;
}

export interface ResolvedCompetition {
  type: string;
  competitionName: string;
  championName: string;
  protagonistParticipated: boolean;
  protagonistIsChampion: boolean;
}

/**
 * Resolve any cup, continental or national-team competition whose calendar slot
 * has arrived (near the end of the current season) and hasn't been played yet
 * this season. Reuses the one-shot knockout simulations; each is guarded so it
 * runs at most once per season.
 */
export async function resolveDueCompetitions(
  deps: ResolveCompetitionsDeps,
  input: { saveGameId: string; toDate: Date },
): Promise<ResolvedCompetition[]> {
  const state = await deps.calendarRepository.loadCalendarState(
    input.saveGameId,
  );
  if (!state) return [];

  const seasonLabel = seasonLabelOf(state.currentDate);
  const resolved = new Set(
    state.honours
      .filter((h) => h.seasonLabel === seasonLabel)
      .map((h) => `${h.type}:${h.competitionId}`),
  );

  const due = [...state.competitions]
    .filter((c) => c.type in RESOLUTION_OFFSET_DAYS)
    .sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9));

  const results: ResolvedCompetition[] = [];
  for (const competition of due) {
    const dueMs =
      state.lastMatchdayMs + RESOLUTION_OFFSET_DAYS[competition.type]! * DAY_MS;
    if (dueMs > input.toDate.getTime()) continue;

    const honourType = HONOUR_TYPE[competition.type]!;
    if (resolved.has(`${honourType}:${competition.competitionId}`)) continue;

    let outcome: {
      competitionName: string;
      championName: string;
      protagonist: { participated: boolean; isChampion: boolean };
    } | null = null;

    if (competition.type === CompetitionType.Cup) {
      outcome = await simulateNationalCup(deps.cupDeps, {
        saveGameId: input.saveGameId,
        competitionId: competition.competitionId,
      });
    } else if (competition.type === CompetitionType.Continental) {
      outcome = await simulateContinental(deps.continentalDeps, {
        saveGameId: input.saveGameId,
      });
    } else if (competition.type === CompetitionType.International) {
      // A declined call-up: the squad is assembled without the protagonist.
      const profile = await deps.profileRepository.getProfile(
        input.saveGameId,
      );
      const declined =
        profile?.nationalCallup?.seasonLabel === seasonLabel &&
        profile.nationalCallup.status === 'DECLINED';
      outcome = await simulateNationalTeamTournament(deps.nationalTeamDeps, {
        saveGameId: input.saveGameId,
        excludeProtagonist: declined,
      });
    }

    if (outcome) {
      results.push({
        type: competition.type,
        competitionName: outcome.competitionName,
        championName: outcome.championName,
        protagonistParticipated: outcome.protagonist.participated,
        protagonistIsChampion: outcome.protagonist.isChampion,
      });
    }
  }

  return results;
}

import {
  MATCH_APPROACHES,
  createRandomSource,
  keyMomentPrompts,
  type KeyMomentPrompt,
  type MatchApproach,
} from '@football-life/simulation-engine';
import type { ProfileRepository } from '../repositories/profile-repository';
import type { NextFixtureRepository } from '../repositories/next-fixture-repository';

const APPROACH_KEYS = new Set(MATCH_APPROACHES.map((a) => a.key));

/** Deterministic RNG seed for the moments a given fixture presents. */
function pickSeed(seed: string, fixtureId: string): string {
  return `${seed}:matchplan:${fixtureId}`;
}

export interface NextFixtureView {
  fixtureId: string;
  opponentName: string;
  isHome: boolean;
  date: string;
  competitionName: string;
  isDerby: boolean;
  approaches: typeof MATCH_APPROACHES;
  moments: KeyMomentPrompt[];
  /** The plan already prepared for THIS fixture, if any. */
  plannedApproach: MatchApproach | null;
  plannedChoices: Record<string, string>;
}

export interface MatchPlanDeps {
  profile: ProfileRepository;
  nextFixture: NextFixtureRepository;
}

/** The protagonist's next match plus the decisive moments to prepare for. */
export async function getNextFixture(
  deps: MatchPlanDeps,
  saveGameId: string,
): Promise<NextFixtureView | null> {
  const fixture = await deps.nextFixture.loadNextFixture(saveGameId);
  if (!fixture) return null;

  const isDerby =
    fixture.rivalClubId !== null &&
    fixture.rivalClubId === fixture.opponentClubId;
  const moments = keyMomentPrompts(
    createRandomSource(pickSeed(fixture.seed, fixture.fixtureId)),
  );

  const profile = await deps.profile.getProfile(saveGameId);
  const stored =
    profile?.matchPlan && profile.matchPlan.fixtureId === fixture.fixtureId
      ? profile.matchPlan
      : null;

  return {
    fixtureId: fixture.fixtureId,
    opponentName: fixture.opponentName,
    isHome: fixture.isHome,
    date: fixture.date.toISOString(),
    competitionName: fixture.competitionName,
    isDerby,
    approaches: MATCH_APPROACHES,
    moments,
    plannedApproach: (stored?.approach as MatchApproach | undefined) ?? null,
    plannedChoices: stored?.choices ?? {},
  };
}

export type SaveMatchPlanResult =
  | { status: 'ok' }
  | { status: 'no-fixture' }
  | { status: 'bad-approach' };

/** Stores the player's plan against their current next fixture. */
export async function saveMatchPlan(
  deps: MatchPlanDeps,
  saveGameId: string,
  input: { approach: string; choices?: Record<string, string> | undefined },
): Promise<SaveMatchPlanResult> {
  if (!APPROACH_KEYS.has(input.approach as MatchApproach)) {
    return { status: 'bad-approach' };
  }
  const fixture = await deps.nextFixture.loadNextFixture(saveGameId);
  if (!fixture) return { status: 'no-fixture' };

  const isDerby =
    fixture.rivalClubId !== null &&
    fixture.rivalClubId === fixture.opponentClubId;

  await deps.profile.setMatchPlan(saveGameId, {
    fixtureId: fixture.fixtureId,
    approach: input.approach,
    choices: input.choices ?? {},
    isDerby,
  });
  return { status: 'ok' };
}

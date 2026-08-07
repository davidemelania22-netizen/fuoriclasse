import {
  effectiveRoleBaseline,
  roleFromTrust,
  sortStandings,
  trustAfterMatch,
  trustWhenBenched,
  type EffectiveRole,
  type MatchTrustInput,
} from '@football-life/simulation-engine';
import type { ProfileRepository } from '../repositories/profile-repository';
import type { ManagerStatusRepository } from '../repositories/manager-status-repository';

export type ObjectiveTier = 'TITLE' | 'EUROPE' | 'MIDTABLE' | 'SURVIVAL';
export type ObjectiveStatus = 'ABOVE' | 'ON_TRACK' | 'BELOW' | 'PENDING';

export interface SeasonObjective {
  tier: ObjectiveTier;
  text: string;
  targetPosition: number;
  currentPosition: number | null;
  status: ObjectiveStatus;
}

export interface ManagerStatus {
  trust: number;
  role: EffectiveRole;
  contractRole: string | null;
  clubName: string;
  objective: SeasonObjective;
}

function deriveObjective(
  reputationRank: number,
  leagueSize: number,
): { tier: ObjectiveTier; text: string } {
  const frac = reputationRank / Math.max(1, leagueSize);
  if (reputationRank === 1)
    return { tier: 'TITLE', text: 'Vincere il campionato' };
  if (frac <= 0.3)
    return { tier: 'EUROPE', text: 'Qualificarsi alla coppa europea' };
  if (frac <= 0.65)
    return {
      tier: 'MIDTABLE',
      text: 'Un piazzamento tranquillo a metà classifica',
    };
  return { tier: 'SURVIVAL', text: 'Conquistare una salvezza serena' };
}

function objectiveStatus(
  currentPosition: number | null,
  targetPosition: number,
): ObjectiveStatus {
  if (currentPosition === null) return 'PENDING';
  if (currentPosition <= targetPosition - 2) return 'ABOVE';
  if (currentPosition >= targetPosition + 2) return 'BELOW';
  return 'ON_TRACK';
}

/** The protagonist's standing with their manager: trust, role and objective. */
export async function getManagerStatus(
  profileRepo: ProfileRepository,
  statusRepo: ManagerStatusRepository,
  saveGameId: string,
): Promise<ManagerStatus | null> {
  const data = await statusRepo.loadStatus(saveGameId);
  if (!data) return null;

  const profile = await profileRepo.getProfile(saveGameId);
  const baseline = effectiveRoleBaseline(
    data.squadRole,
    profile?.activeLoan != null,
  );
  const trust = profile?.managerTrust ?? baseline;

  const leagueSize = data.leagueReputations.length;
  const reputationRank =
    1 + data.leagueReputations.filter((r) => r > data.clubReputation).length;
  const { tier, text } = deriveObjective(reputationRank, leagueSize);

  const totalPlayed = data.standings.reduce((sum, row) => sum + row.played, 0);
  let currentPosition: number | null = null;
  if (totalPlayed > 0) {
    const index = sortStandings(data.standings).findIndex(
      (row) => row.clubId === data.clubId,
    );
    currentPosition = index >= 0 ? index + 1 : null;
  }

  return {
    trust: Math.round(trust),
    role: roleFromTrust(trust),
    contractRole: data.squadRole,
    clubName: data.clubName,
    objective: {
      tier,
      text,
      targetPosition: reputationRank,
      currentPosition,
      status: objectiveStatus(currentPosition, reputationRank),
    },
  };
}

/** A minimal view of a matchday report — did the protagonist play, and how? */
export interface TrustMatchInput {
  pagella: MatchTrustInput | null;
}

export interface ManagerTrustDeps {
  profile: ProfileRepository;
  status: ManagerStatusRepository;
}

export interface ManagerTrustChange {
  value: number;
  before: number;
  delta: number;
  role: EffectiveRole;
}

/**
 * Evolves manager trust from the protagonist's matchdays this advance: a game
 * played moves it toward the performance, a fit player left on the bench drifts
 * back toward their role baseline, and an injured player holds steady.
 */
export async function updateManagerTrust(
  deps: ManagerTrustDeps,
  input: {
    saveGameId: string;
    matches: readonly TrustMatchInput[];
    injured: boolean;
  },
): Promise<ManagerTrustChange | null> {
  const squadRole = await deps.status.loadSquadRole(input.saveGameId);
  if (squadRole === null) return null; // unattached: no manager to trust

  const profile = await deps.profile.getProfile(input.saveGameId);
  const baseline = effectiveRoleBaseline(
    squadRole,
    profile?.activeLoan != null,
  );
  const before = profile?.managerTrust ?? baseline;

  let trust = before;
  for (const report of input.matches) {
    if (report.pagella) {
      trust = trustAfterMatch(trust, report.pagella);
    } else if (!input.injured) {
      trust = trustWhenBenched(trust, baseline);
    }
  }

  await deps.profile.setManagerTrust(input.saveGameId, trust);
  return {
    value: Math.round(trust),
    before: Math.round(before),
    delta: Math.round(trust) - Math.round(before),
    role: roleFromTrust(trust),
  };
}

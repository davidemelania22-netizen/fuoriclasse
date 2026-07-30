import type { RandomSource } from '../random/random-source';

/**
 * End-of-season manager sackings: a club that finishes far below what its
 * reputation demanded fires the coach. Manager identity is intentionally
 * light — a name per club (stored in Club.philosophy) — enough to make the
 * world's dugouts churn believably without a full Manager entity.
 */

export interface SackingClub {
  id: string;
  name: string;
  /** 1 = biggest reputation in the league. */
  reputationRank: number;
  /** 1 = league winner. */
  finalPosition: number;
  managerName: string;
}

export interface PlannedSacking {
  clubId: string;
  clubName: string;
  sackedManager: string;
  newManager: string;
  finalPosition: number;
  expectedPosition: number;
}

/** Finishing this many places below the reputation rank costs the job. */
const TOLERANCE = 3;
/** Even a fair-season board can panic occasionally; a disaster is certain. */
const DISASTER_GAP = 6;

export function planSackings(
  clubs: readonly SackingClub[],
  managerNamePool: readonly string[],
  rng: RandomSource,
): PlannedSacking[] {
  const sackings: PlannedSacking[] = [];
  const assignedThisRun = new Set<string>();

  for (const club of clubs) {
    const gap = club.finalPosition - club.reputationRank;
    if (gap < TOLERANCE) continue;
    const certain = gap >= DISASTER_GAP;
    if (!certain && !rng.chance(0.5)) continue;

    // Prefer a name nobody got this window; names may repeat across leagues
    // and seasons (small pools must never block a deserved sacking), but the
    // sacked club can never re-hire the same coach on the spot.
    const notCurrent = managerNamePool.filter(
      (name) => name !== club.managerName,
    );
    const fresh = notCurrent.filter((name) => !assignedThisRun.has(name));
    const candidates = fresh.length > 0 ? fresh : notCurrent;
    if (candidates.length === 0) continue;
    const newManager = candidates[rng.integer(0, candidates.length - 1)]!;
    assignedThisRun.add(newManager);

    sackings.push({
      clubId: club.id,
      clubName: club.name,
      sackedManager: club.managerName,
      newManager,
      finalPosition: club.finalPosition,
      expectedPosition: club.reputationRank,
    });
  }
  return sackings;
}

/** Deterministic manager name for clubs that never had one assigned. */
export function defaultManagerName(
  clubId: string,
  namePool: readonly string[],
): string {
  if (namePool.length === 0) return 'Mister';
  let hash = 0;
  for (let i = 0; i < clubId.length; i += 1) {
    hash = (hash * 31 + clubId.charCodeAt(i)) >>> 0;
  }
  return namePool[hash % namePool.length]!;
}

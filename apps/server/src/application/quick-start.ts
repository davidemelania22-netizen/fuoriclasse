import type { QuickStartAutoSign } from '@football-life/shared';
import type { ClubDirectoryEntry } from '../repositories/career-repository';

/**
 * Picks the club a quick-start career signs with. Preference order: the
 * protagonist's own country's top division, falling back to any top division
 * (tiny test worlds), then to whatever clubs exist. TOP_ELITE takes the
 * strongest club by reputation, TOP_MID the mid-table one.
 */
export function pickAutoSignClub(
  clubs: ClubDirectoryEntry[],
  nationalityId: string,
  mode: Exclude<QuickStartAutoSign, null>,
): string | null {
  if (clubs.length === 0) return null;

  const topDivision = clubs.filter((club) =>
    club.competitionName?.endsWith('Serie A'),
  );
  const home = topDivision.filter((club) => club.countryId === nationalityId);
  const pool =
    home.length > 0 ? home : topDivision.length > 0 ? topDivision : clubs;

  const byReputation = [...pool].sort((a, b) => b.reputation - a.reputation);
  const pick =
    mode === 'TOP_ELITE'
      ? byReputation[0]!
      : byReputation[Math.floor(byReputation.length / 2)]!;
  return pick.clubId;
}

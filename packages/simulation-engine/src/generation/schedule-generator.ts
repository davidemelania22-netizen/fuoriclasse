export interface ScheduledGame {
  matchday: number;
  homeClubKey: string;
  awayClubKey: string;
}

const BYE = '__BYE__';

/**
 * Double round-robin fixtures via the circle method. Every pair of clubs plays
 * exactly twice (once home, once away); within any matchday a club appears at
 * most once. Matchdays are numbered 1..2(n-1).
 */
export function generateDoubleRoundRobin(
  clubKeys: readonly string[],
): ScheduledGame[] {
  if (clubKeys.length < 2) return [];

  const teams = [...clubKeys];
  if (teams.length % 2 !== 0) teams.push(BYE);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const rotation = [...teams];
  const games: ScheduledGame[] = [];

  for (let r = 0; r < rounds; r += 1) {
    for (let i = 0; i < half; i += 1) {
      const home = rotation[i]!;
      const away = rotation[n - 1 - i]!;
      if (home === BYE || away === BYE) continue;

      // Alternate venue by round so home/away stays balanced.
      const firstHome = r % 2 === 0 ? home : away;
      const firstAway = r % 2 === 0 ? away : home;

      games.push({
        matchday: r + 1,
        homeClubKey: firstHome,
        awayClubKey: firstAway,
      });
      games.push({
        matchday: rounds + r + 1,
        homeClubKey: firstAway,
        awayClubKey: firstHome,
      });
    }

    // Rotate, keeping the first element fixed.
    const last = rotation[n - 1]!;
    for (let i = n - 1; i > 1; i -= 1) {
      rotation[i] = rotation[i - 1]!;
    }
    rotation[1] = last;
  }

  games.sort((a, b) => a.matchday - b.matchday);
  return games;
}

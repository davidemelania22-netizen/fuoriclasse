export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export function emptyStanding(clubId: string): StandingRow {
  return {
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

export interface ResultLine {
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

export function applyResult(
  table: Map<string, StandingRow>,
  result: ResultLine,
): void {
  const home = table.get(result.homeClubId) ?? emptyStanding(result.homeClubId);
  const away = table.get(result.awayClubId) ?? emptyStanding(result.awayClubId);

  home.played += 1;
  away.played += 1;
  home.goalsFor += result.homeGoals;
  home.goalsAgainst += result.awayGoals;
  away.goalsFor += result.awayGoals;
  away.goalsAgainst += result.homeGoals;

  if (result.homeGoals > result.awayGoals) {
    home.won += 1;
    home.points += 3;
    away.lost += 1;
  } else if (result.homeGoals < result.awayGoals) {
    away.won += 1;
    away.points += 3;
    home.lost += 1;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.points += 1;
    away.points += 1;
  }

  table.set(result.homeClubId, home);
  table.set(result.awayClubId, away);
}

const goalDifference = (row: StandingRow): number =>
  row.goalsFor - row.goalsAgainst;

/** Sort by points, then goal difference, then goals scored, then club id. */
export function sortStandings(rows: readonly StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      goalDifference(b) - goalDifference(a) ||
      b.goalsFor - a.goalsFor ||
      a.clubId.localeCompare(b.clubId),
  );
}

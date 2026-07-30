import { sortStandings } from '@football-life/simulation-engine';
import type { StandingsRepository } from '../repositories/standings-repository';

export interface StandingsTableRow {
  position: number;
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isProtagonistClub: boolean;
}

export interface LeagueTable {
  competitionId: string;
  competitionName: string;
  competitionLogo: string | null;
  countryId: string | null;
  seasonLabel: string;
  hasProtagonist: boolean;
  rows: StandingsTableRow[];
}

/** All league tables across the world, sorted, with the protagonist's club flagged. */
export async function getStandings(
  repository: StandingsRepository,
  saveGameId: string,
): Promise<LeagueTable[]> {
  const data = await repository.loadStandings(saveGameId);
  if (!data) return [];

  return data.leagues.map((league) => {
    const rows = sortStandings(league.rows).map((row, index) => ({
      position: index + 1,
      clubId: row.clubId,
      clubName: league.clubNames.get(row.clubId) ?? 'Sconosciuta',
      clubLogo: league.clubLogos.get(row.clubId) ?? null,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalsFor - row.goalsAgainst,
      points: row.points,
      isProtagonistClub: row.clubId === data.protagonistClubId,
    }));
    return {
      competitionId: league.competitionId,
      competitionName: league.competitionName,
      competitionLogo: league.competitionLogo,
      countryId: league.countryId,
      seasonLabel: league.seasonLabel,
      hasProtagonist: rows.some((r) => r.isProtagonistClub),
      rows,
    };
  });
}

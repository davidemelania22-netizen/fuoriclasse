import {
  createRandomSource,
  defaultManagerName,
  planSackings,
  sortStandings,
  type SackingClub,
} from '@football-life/simulation-engine';
import type { NewsItemInput } from '../repositories/news-repository';
import type { SeasonReviewRepository } from '../repositories/season-review-repository';

export interface SeasonReviewDeps {
  repository: SeasonReviewRepository;
  /** "Mister {lastName}" candidates per country id (fallback pool under ''). */
  managerNamePools: Record<string, readonly string[]>;
}

/**
 * End-of-season world review, run right after a rollover: crowns each league's
 * champion and sacks the managers who fell far short of their club's standing.
 * Returns ready-to-store news items.
 */
export async function reviewCompletedSeason(
  deps: SeasonReviewDeps,
  input: { saveGameId: string; gameDate: Date },
): Promise<NewsItemInput[]> {
  const seed = await deps.repository.seed(input.saveGameId);
  if (!seed) return [];
  const leagues = await deps.repository.loadCompletedLeagues(input.saveGameId);

  const news: NewsItemInput[] = [];
  const managerChanges: { clubId: string; managerName: string }[] = [];

  for (const league of leagues) {
    const pool =
      deps.managerNamePools[league.countryId ?? ''] ??
      deps.managerNamePools[''] ??
      [];

    // Final table and reputation pecking order.
    const ranked = sortStandings(league.standings);
    const byReputation = [...league.clubs].sort(
      (a, b) => b.reputation - a.reputation,
    );
    const reputationRank = new Map(byReputation.map((c, i) => [c.id, i + 1]));
    const clubById = new Map(league.clubs.map((c) => [c.id, c]));

    // Champion news.
    const championId = ranked[0]?.clubId;
    const champion = championId ? clubById.get(championId) : undefined;
    if (champion) {
      news.push({
        gameDate: input.gameDate,
        category: 'SEASON',
        headline: `${champion.name} campione: ${league.competitionName} ${league.seasonLabel}`,
        body: `Il ${champion.name} conquista il titolo di ${league.competitionName} nella stagione ${league.seasonLabel}.`,
      });
    }

    // Sackings: judged on final position vs reputation expectation.
    const sackingInput: SackingClub[] = ranked
      .map((row, index) => {
        const club = clubById.get(row.clubId);
        if (!club) return null;
        return {
          id: club.id,
          name: club.name,
          reputationRank: reputationRank.get(club.id) ?? index + 1,
          finalPosition: index + 1,
          managerName:
            club.managerName ?? defaultManagerName(club.id, pool),
        };
      })
      .filter((c): c is SackingClub => c !== null);

    const rng = createRandomSource(
      `${seed}:sackings:${league.seasonLabel}:${league.competitionId}`,
    );
    for (const sacking of planSackings(sackingInput, pool, rng)) {
      managerChanges.push({
        clubId: sacking.clubId,
        managerName: sacking.newManager,
      });
      news.push({
        gameDate: input.gameDate,
        category: 'SACKING',
        headline: `${sacking.clubName} esonera ${sacking.sackedManager}`,
        body: `Il ${sacking.clubName}, atteso al ${sacking.expectedPosition}º posto e arrivato ${sacking.finalPosition}º, cambia guida tecnica: arriva ${sacking.newManager}.`,
      });
    }
  }

  await deps.repository.applyManagerNames(managerChanges);
  return news;
}

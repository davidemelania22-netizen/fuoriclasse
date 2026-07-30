import type {
  NewsItemInput,
  NewsItemRecord,
  NewsRepository,
} from '../repositories/news-repository';
import type { AppliedTransfer } from './transfer-market';
import type { MatchdayReport } from './simulate-matchday';

/** A protagonist match is newsworthy at this rating, or with this many goals. */
const STANDOUT_RATING = 7.5;
const STANDOUT_GOALS = 2;

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${Math.round(value / 1_000)}k`;
  return `€${value}`;
}

/** One headline per completed AI transfer, plus a window-summary banner. */
export function buildTransferNews(
  gameDate: Date,
  transfers: readonly AppliedTransfer[],
): NewsItemInput[] {
  if (transfers.length === 0) return [];
  const items: NewsItemInput[] = transfers.map((t) => ({
    gameDate,
    category: 'TRANSFER',
    headline: `${t.playerName} passa al ${t.toClubName}`,
    body: `Colpo di mercato: il ${t.toClubName} preleva ${t.playerName} (abilità ${t.ability}) dal ${t.fromClubName} per ${formatMoney(t.fee)}.`,
  }));
  items.unshift({
    gameDate,
    category: 'SEASON',
    headline: 'Sessione di mercato conclusa',
    body: `${transfers.length} ${transfers.length === 1 ? 'trasferimento ha' : 'trasferimenti hanno'} animato i campionati in vista della nuova stagione.`,
  });
  return items;
}

/** News for the protagonist's own standout performances this advance. */
export function buildProtagonistNews(
  matches: readonly MatchdayReport[],
): NewsItemInput[] {
  const items: NewsItemInput[] = [];
  for (const match of matches) {
    if (!match.pagella) continue;
    const { rating, goals, assists } = match.pagella;
    if (rating < STANDOUT_RATING && goals < STANDOUT_GOALS) continue;
    const opponent = match.isHome ? match.awayClubName : match.homeClubName;
    const detail =
      goals >= 2
        ? `Doppietta e voto ${rating.toFixed(1)}`
        : goals === 1
          ? `Gol e voto ${rating.toFixed(1)}`
          : assists >= 1
            ? `Assist e voto ${rating.toFixed(1)}`
            : `Voto ${rating.toFixed(1)}`;
    items.push({
      gameDate: new Date(match.date),
      category: 'PROTAGONIST',
      headline: `La tua prestazione fa notizia contro ${opponent}`,
      body: `${detail}: la stampa esalta la tua gara contro ${opponent}.`,
    });
  }
  return items;
}

export interface NewsDeps {
  repository: NewsRepository;
}

export async function recordNews(
  deps: NewsDeps,
  saveGameId: string,
  items: readonly NewsItemInput[],
): Promise<void> {
  await deps.repository.addNews(saveGameId, items);
}

export interface NewsFeed {
  items: NewsItemRecord[];
  unread: number;
}

export async function getNews(
  deps: NewsDeps,
  saveGameId: string,
): Promise<NewsFeed> {
  const [items, unread] = await Promise.all([
    deps.repository.listNews(saveGameId, 60),
    deps.repository.countUnread(saveGameId),
  ]);
  return { items, unread };
}

export async function markNewsRead(
  deps: NewsDeps,
  saveGameId: string,
): Promise<void> {
  await deps.repository.markAllRead(saveGameId);
}

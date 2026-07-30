export interface NewsItemInput {
  gameDate: Date;
  category: string; // TRANSFER | SEASON | PROTAGONIST
  headline: string;
  body: string;
}

export interface NewsItemRecord {
  id: string;
  gameDate: string;
  category: string;
  headline: string;
  body: string;
  isRead: boolean;
}

export interface NewsRepository {
  addNews(saveGameId: string, items: readonly NewsItemInput[]): Promise<void>;
  listNews(saveGameId: string, limit: number): Promise<NewsItemRecord[]>;
  countUnread(saveGameId: string): Promise<number>;
  markAllRead(saveGameId: string): Promise<void>;
}

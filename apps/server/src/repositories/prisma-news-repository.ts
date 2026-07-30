import type { PrismaClient } from '@prisma/client';
import type {
  NewsItemInput,
  NewsItemRecord,
  NewsRepository,
} from './news-repository';

export class PrismaNewsRepository implements NewsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async addNews(
    saveGameId: string,
    items: readonly NewsItemInput[],
  ): Promise<void> {
    if (items.length === 0) return;
    await this.prisma.newsItem.createMany({
      data: items.map((item) => ({
        saveGameId,
        gameDate: item.gameDate,
        category: item.category,
        headline: item.headline,
        body: item.body,
      })),
    });
  }

  async listNews(saveGameId: string, limit: number): Promise<NewsItemRecord[]> {
    const rows = await this.prisma.newsItem.findMany({
      where: { saveGameId },
      orderBy: [{ gameDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      gameDate: row.gameDate.toISOString(),
      category: row.category,
      headline: row.headline,
      body: row.body,
      isRead: row.isRead,
    }));
  }

  countUnread(saveGameId: string): Promise<number> {
    return this.prisma.newsItem.count({
      where: { saveGameId, isRead: false },
    });
  }

  async markAllRead(saveGameId: string): Promise<void> {
    await this.prisma.newsItem.updateMany({
      where: { saveGameId, isRead: false },
      data: { isRead: true },
    });
  }
}

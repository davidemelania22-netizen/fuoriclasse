import type { PrismaClient } from '@prisma/client';
import type {
  MarketRepository,
  MarketState,
  WorldTransferRecord,
} from './market-repository';

export class PrismaMarketRepository implements MarketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadMarketState(saveGameId: string): Promise<MarketState | null> {
    if (!saveGameId) return null;
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    if (!person?.player) return null;
    const player = person.player;

    const contract = await this.prisma.contract.findFirst({
      where: { playerId: player.id, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });

    // The window is measured against the league the player is actually in;
    // without a club we fall back to any current season so the page still
    // knows when the market opens.
    const season = await this.prisma.season.findFirst({
      where: {
        saveGameId,
        ...(player.club?.competitionId
          ? { competitionId: player.club.competitionId }
          : {}),
      },
      orderBy: { startDate: 'desc' },
    });

    return {
      playerId: player.id,
      currentDate: save.currentDate,
      seasonStart: season?.startDate ?? null,
      seasonLabel: season?.label ?? null,
      currentAbility: player.currentAbility,
      marketValue: player.marketValue,
      clubId: player.clubId,
      clubName: player.club?.name ?? null,
      currentWeeklyWage: contract?.weeklyWage ?? null,
      currentSquadRole: contract?.squadRole ?? null,
      currentContractEnd: contract?.endDate ?? null,
      currentClubReputation: player.club?.reputation ?? null,
    };
  }

  async listWorldTransfers(
    saveGameId: string,
    limit: number,
  ): Promise<WorldTransferRecord[]> {
    const items = await this.prisma.newsItem.findMany({
      where: { saveGameId, category: 'TRANSFER' },
      orderBy: { gameDate: 'desc' },
      take: limit,
    });
    return items.map((item) => ({
      date: item.gameDate.toISOString(),
      headline: item.headline,
      body: item.body,
    }));
  }

  async updateOfferTerms(input: {
    offerId: string;
    playerId: string;
    weeklyWage: number;
    squadRole: string;
    contractYears?: number;
  }): Promise<boolean> {
    // Guard on the player too: an offer id from elsewhere must not be editable.
    const result = await this.prisma.transferOffer.updateMany({
      where: {
        id: input.offerId,
        playerId: input.playerId,
        status: 'PENDING',
      },
      data: {
        offeredWage: input.weeklyWage,
        squadRole: input.squadRole,
        ...(input.contractYears !== undefined
          ? { contractYears: input.contractYears }
          : {}),
      },
    });
    return result.count > 0;
  }

  async setContractBonuses(input: {
    playerId: string;
    signingBonus: number;
    appearanceBonus: number;
    goalBonus: number;
  }): Promise<boolean> {
    const contract = await this.prisma.contract.findFirst({
      where: { playerId: input.playerId, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });
    if (!contract) return false;
    await this.prisma.contract.update({
      where: { id: contract.id },
      data: {
        signingBonus: input.signingBonus,
        appearanceBonus: input.appearanceBonus,
        goalBonus: input.goalBonus,
      },
    });
    return true;
  }
}

import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  CareerStatus,
  ContractStatus,
  TransferOfferStatus,
} from '@football-life/shared';
import { calendarAge } from '@football-life/simulation-engine';
import type {
  AcceptOfferInput,
  CandidateClub,
  CareerRepository,
  ClubDirectoryEntry,
  OfferInput,
  PendingOffer,
  ProtagonistCareer,
  RenewContractInput,
  SignContractInput,
} from './career-repository';

const DEFAULT_LEAGUE_REPUTATION = 1000;

function addYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

export class PrismaCareerRepository implements CareerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadProtagonist(saveGameId: string): Promise<ProtagonistCareer | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save || !save.playerPersonId) return null;

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: true },
    });
    if (!person || !person.player) return null;
    const player = person.player;

    let leagueReputation = DEFAULT_LEAGUE_REPUTATION;
    if (player.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: player.clubId },
      });
      if (club?.competitionId) {
        const competition = await this.prisma.competition.findUnique({
          where: { id: club.competitionId },
        });
        leagueReputation = competition?.reputation ?? DEFAULT_LEAGUE_REPUTATION;
      }
    }

    const contract = await this.prisma.contract.findFirst({
      where: { playerId: player.id, status: ContractStatus.Active },
      orderBy: { endDate: 'desc' },
    });

    return {
      saveGameId,
      playerId: player.id,
      currentDate: save.currentDate,
      age: calendarAge(person.birthDate, save.currentDate),
      currentAbility: player.currentAbility,
      potentialAbility: player.potentialAbility,
      form: player.form,
      reputation: player.reputation,
      marketValue: player.marketValue,
      clubId: player.clubId,
      leagueReputation,
      currentContract: contract
        ? {
            id: contract.id,
            clubId: contract.clubId,
            endDate: contract.endDate,
            squadRole: contract.squadRole,
            weeklyWage: contract.weeklyWage,
          }
        : null,
    };
  }

  async listCandidateClubs(saveGameId: string): Promise<CandidateClub[]> {
    const clubs = await this.prisma.club.findMany({ where: { saveGameId } });
    return clubs.map((club) => {
      const philosophy = club.philosophy as { strength?: number } | null;
      return {
        clubId: club.id,
        reputation: club.reputation,
        strength: philosophy?.strength ?? club.reputation / 40,
        transferBudget: club.transferBudget,
      };
    });
  }

  async listClubDirectory(saveGameId: string): Promise<ClubDirectoryEntry[]> {
    const clubs = await this.prisma.club.findMany({
      where: { saveGameId },
      include: { competition: true },
      orderBy: { reputation: 'desc' },
    });
    return clubs.map((club) => {
      const philosophy = club.philosophy as { strength?: number } | null;
      return {
        clubId: club.id,
        name: club.name,
        shortName: club.shortName,
        logo: club.logo,
        reputation: club.reputation,
        strength: Math.round(philosophy?.strength ?? club.reputation / 40),
        competitionName: club.competition?.name ?? null,
        countryId: club.countryId,
      };
    });
  }

  async signContract(input: SignContractInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.contract.updateMany({
        where: { playerId: input.playerId, status: ContractStatus.Active },
        data: { status: ContractStatus.Terminated },
      });
      await tx.player.update({
        where: { id: input.playerId },
        data: { clubId: input.clubId, careerStatus: CareerStatus.Active },
      });
      await tx.contract.create({
        data: {
          saveGameId: input.saveGameId,
          playerId: input.playerId,
          clubId: input.clubId,
          startDate: input.startDate,
          endDate: input.endDate,
          weeklyWage: input.weeklyWage,
          signingBonus: input.signingBonus,
          appearanceBonus: input.appearanceBonus,
          goalBonus: input.goalBonus,
          squadRole: input.squadRole,
          status: ContractStatus.Active,
        },
      });
    });
  }

  async renewContract(input: RenewContractInput): Promise<void> {
    await this.prisma.contract.update({
      where: { id: input.contractId },
      data: {
        endDate: input.newEndDate,
        weeklyWage: input.weeklyWage,
        squadRole: input.squadRole,
      },
    });
  }

  async createOffers(
    playerId: string,
    offers: OfferInput[],
  ): Promise<string[]> {
    const { saveGameId } = await this.prisma.player.findUniqueOrThrow({
      where: { id: playerId },
      select: { saveGameId: true },
    });

    const ids: string[] = [];
    for (const offer of offers) {
      const id = randomUUID();
      await this.prisma.transferOffer.create({
        data: {
          id,
          saveGameId,
          playerId,
          fromClubId: offer.fromClubId,
          toClubId: offer.toClubId,
          fee: offer.fee,
          offeredWage: offer.offeredWage,
          contractYears: offer.contractYears,
          squadRole: offer.squadRole,
          status: TransferOfferStatus.Pending,
          createdAt: offer.createdAt,
          expiresAt: offer.expiresAt,
        },
      });
      ids.push(id);
    }
    return ids;
  }

  async expirePendingOffers(playerId: string): Promise<void> {
    await this.prisma.transferOffer.updateMany({
      where: { playerId, status: TransferOfferStatus.Pending },
      data: { status: TransferOfferStatus.Expired },
    });
  }

  async listPendingOffers(playerId: string): Promise<PendingOffer[]> {
    const offers = await this.prisma.transferOffer.findMany({
      where: { playerId, status: TransferOfferStatus.Pending },
      orderBy: { fee: 'desc' },
    });
    return offers.map((offer) => ({
      id: offer.id,
      fromClubId: offer.fromClubId,
      toClubId: offer.toClubId,
      fee: offer.fee,
      offeredWage: offer.offeredWage,
      contractYears: offer.contractYears,
      squadRole: offer.squadRole,
    }));
  }

  async acceptOffer(input: AcceptOfferInput): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.transferOffer.findUnique({
        where: { id: input.offerId },
      });
      if (!offer || offer.status !== TransferOfferStatus.Pending) {
        return false;
      }

      await tx.contract.updateMany({
        where: { playerId: input.playerId, status: ContractStatus.Active },
        data: { status: ContractStatus.Terminated },
      });
      await tx.player.update({
        where: { id: input.playerId },
        data: { clubId: offer.toClubId },
      });
      await tx.contract.create({
        data: {
          saveGameId: input.saveGameId,
          playerId: input.playerId,
          clubId: offer.toClubId,
          startDate: input.startDate,
          endDate: addYears(input.startDate, offer.contractYears),
          weeklyWage: offer.offeredWage,
          signingBonus: 0,
          appearanceBonus: 0,
          goalBonus: 0,
          squadRole: offer.squadRole,
          status: ContractStatus.Active,
        },
      });
      await tx.transferOffer.update({
        where: { id: offer.id },
        data: { status: TransferOfferStatus.Accepted },
      });
      await tx.transferOffer.updateMany({
        where: {
          playerId: input.playerId,
          status: TransferOfferStatus.Pending,
          id: { not: offer.id },
        },
        data: { status: TransferOfferStatus.Expired },
      });
      await tx.club.update({
        where: { id: offer.toClubId },
        data: { transferBudget: { decrement: offer.fee } },
      });
      return true;
    });
  }

  async rejectOffer(offerId: string): Promise<void> {
    await this.prisma.transferOffer.update({
      where: { id: offerId },
      data: { status: TransferOfferStatus.Rejected },
    });
  }

  async updateMarketValue(playerId: string, value: number): Promise<void> {
    await this.prisma.player.update({
      where: { id: playerId },
      data: { marketValue: value },
    });
  }
}

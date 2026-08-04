import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  PlayerProfile,
  ProfileRepository,
  StoredLoan,
  StoredLoanOffer,
  StoredMatchPlan,
  StoredNationalCallup,
  StoredNaturalization,
  StoredPostMatch,
  StoredContractTalks,
  StoredPendingRenewal,
  StoredTalksMemory,
} from './profile-repository';

const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async personId(saveGameId: string): Promise<string | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    return save?.playerPersonId ?? null;
  }

  async getProfile(saveGameId: string): Promise<PlayerProfile | null> {
    const id = await this.personId(saveGameId);
    if (!id) return null;
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) return null;
    const profile = (person.personalityProfile ?? {}) as Record<
      string,
      unknown
    >;
    return {
      agentKey: (profile.agentKey as string | undefined) ?? null,
      lifestyle: (profile.lifestyle as string | undefined) ?? null,
      avatarDataUrl: (profile.avatarDataUrl as string | undefined) ?? null,
      managerTrust: (profile.managerTrust as number | undefined) ?? null,
      matchPlan: (profile.matchPlan as StoredMatchPlan | undefined) ?? null,
      postMatchPending:
        (profile.postMatchPending as StoredPostMatch | undefined) ?? null,
      scoutInterest:
        (profile.scoutInterest as Record<string, number> | undefined) ?? {},
      tacticalInstructions:
        (profile.tacticalInstructions as
          | { style: string; temperament: string }
          | undefined) ?? null,
      nationalCallup:
        (profile.nationalCallup as StoredNationalCallup | undefined) ?? null,
      activeLoan: (profile.activeLoan as StoredLoan | undefined) ?? null,
      loanOffer: (profile.loanOffer as StoredLoanOffer | undefined) ?? null,
      cappedForCountryId:
        (profile.cappedForCountryId as string | undefined) ?? null,
      naturalization:
        (profile.naturalization as StoredNaturalization | undefined) ?? null,
      lastPresentedClubId:
        (profile.lastPresentedClubId as string | undefined) ?? null,
      celebratedHonourIds:
        (profile.celebratedHonourIds as string[] | undefined) ?? [],
      negotiatedOfferIds:
        (profile.negotiatedOfferIds as string[] | undefined) ?? [],
      contractTalks:
        (profile.contractTalks as StoredContractTalks | undefined) ?? null,
      talksMemory:
        (profile.talksMemory as StoredTalksMemory | undefined) ?? null,
      pendingRenewal:
        (profile.pendingRenewal as StoredPendingRenewal | undefined) ?? null,
    };
  }

  private async patch(
    saveGameId: string,
    patch: Record<string, unknown>,
  ): Promise<boolean> {
    const id = await this.personId(saveGameId);
    if (!id) return false;
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) return false;
    const current = (person.personalityProfile ?? {}) as Record<
      string,
      unknown
    >;
    await this.prisma.person.update({
      where: { id },
      data: { personalityProfile: j({ ...current, ...patch }) },
    });
    return true;
  }

  setAgent(saveGameId: string, agentKey: string): Promise<boolean> {
    return this.patch(saveGameId, { agentKey });
  }

  setLifestyle(saveGameId: string, lifestyle: string): Promise<boolean> {
    return this.patch(saveGameId, { lifestyle });
  }

  setAvatar(
    saveGameId: string,
    avatarDataUrl: string | null,
  ): Promise<boolean> {
    return this.patch(saveGameId, { avatarDataUrl });
  }

  setManagerTrust(saveGameId: string, trust: number): Promise<boolean> {
    return this.patch(saveGameId, { managerTrust: trust });
  }

  setMatchPlan(
    saveGameId: string,
    plan: StoredMatchPlan | null,
  ): Promise<boolean> {
    return this.patch(saveGameId, { matchPlan: plan });
  }

  setPostMatchPending(
    saveGameId: string,
    pending: StoredPostMatch | null,
  ): Promise<boolean> {
    return this.patch(saveGameId, { postMatchPending: pending });
  }

  setScoutInterest(
    saveGameId: string,
    interest: Record<string, number>,
  ): Promise<boolean> {
    return this.patch(saveGameId, { scoutInterest: interest });
  }

  setTacticalInstructions(
    saveGameId: string,
    instructions: { style: string; temperament: string },
  ): Promise<boolean> {
    return this.patch(saveGameId, { tacticalInstructions: instructions });
  }

  setNationalCallup(
    saveGameId: string,
    callup: StoredNationalCallup,
  ): Promise<boolean> {
    return this.patch(saveGameId, { nationalCallup: callup });
  }

  setActiveLoan(saveGameId: string, loan: StoredLoan | null): Promise<boolean> {
    return this.patch(saveGameId, { activeLoan: loan });
  }

  setLoanOffer(
    saveGameId: string,
    offer: StoredLoanOffer | null,
  ): Promise<boolean> {
    return this.patch(saveGameId, { loanOffer: offer });
  }

  setLastPresentedClub(saveGameId: string, clubId: string): Promise<boolean> {
    return this.patch(saveGameId, { lastPresentedClubId: clubId });
  }

  setCelebratedHonours(
    saveGameId: string,
    honourIds: string[],
  ): Promise<boolean> {
    return this.patch(saveGameId, { celebratedHonourIds: honourIds });
  }

  setNegotiatedOffers(
    saveGameId: string,
    offerIds: string[],
  ): Promise<boolean> {
    return this.patch(saveGameId, { negotiatedOfferIds: offerIds });
  }

  setContractTalks(
    saveGameId: string,
    talks: StoredContractTalks | null,
  ): Promise<boolean> {
    return this.patch(saveGameId, { contractTalks: talks });
  }

  setTalksMemory(
    saveGameId: string,
    memory: StoredTalksMemory,
  ): Promise<boolean> {
    return this.patch(saveGameId, { talksMemory: memory });
  }

  setPendingRenewal(
    saveGameId: string,
    renewal: StoredPendingRenewal | null,
  ): Promise<boolean> {
    return this.patch(saveGameId, { pendingRenewal: renewal });
  }

  setCappedForCountry(saveGameId: string, countryId: string): Promise<boolean> {
    return this.patch(saveGameId, { cappedForCountryId: countryId });
  }

  setNaturalization(
    saveGameId: string,
    naturalization: StoredNaturalization | null,
  ): Promise<boolean> {
    return this.patch(saveGameId, { naturalization });
  }
}

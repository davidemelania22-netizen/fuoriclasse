import type { CareerConfig } from '@football-life/shared';
import {
  computeMarketValue,
  createRandomSource,
  generateTransferOffers,
  recommendContractTerms,
  recommendSquadRole,
  smoothMarketValue,
  type TransferClub,
} from '@football-life/simulation-engine';
import type {
  CareerRepository,
  OfferInput,
  PendingOffer,
} from '../repositories/career-repository';

const YEAR_MS = 365 * 86_400_000;
const OFFER_VALIDITY_MS = 28 * 86_400_000;

function addYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

export interface CareerDeps {
  repository: CareerRepository;
  config: CareerConfig;
}

export interface SignContractResult {
  clubId: string;
  weeklyWage: number;
  squadRole: string;
  endDate: string;
}

export async function signWithClub(
  deps: CareerDeps,
  input: { saveGameId: string; clubId: string },
): Promise<SignContractResult | null> {
  const career = await deps.repository.loadProtagonist(input.saveGameId);
  if (!career) return null;

  const club = (
    await deps.repository.listCandidateClubs(input.saveGameId)
  ).find((candidate) => candidate.clubId === input.clubId);
  if (!club) return null;

  const terms = recommendContractTerms(
    {
      currentAbility: career.currentAbility,
      age: career.age,
      clubReputation: club.reputation,
      clubStrength: club.strength,
    },
    deps.config,
  );
  const endDate = addYears(career.currentDate, terms.years);

  await deps.repository.signContract({
    saveGameId: input.saveGameId,
    playerId: career.playerId,
    clubId: input.clubId,
    startDate: career.currentDate,
    endDate,
    weeklyWage: terms.weeklyWage,
    signingBonus: terms.signingBonus,
    appearanceBonus: terms.appearanceBonus,
    goalBonus: terms.goalBonus,
    squadRole: terms.squadRole,
  });

  return {
    clubId: input.clubId,
    weeklyWage: terms.weeklyWage,
    squadRole: terms.squadRole,
    endDate: endDate.toISOString(),
  };
}

export interface RenewContractResult {
  newEndDate: string;
  weeklyWage: number;
}

export async function renewProtagonistContract(
  deps: CareerDeps,
  input: { saveGameId: string },
): Promise<RenewContractResult | null> {
  const career = await deps.repository.loadProtagonist(input.saveGameId);
  if (!career || !career.currentContract) return null;

  const club = (
    await deps.repository.listCandidateClubs(input.saveGameId)
  ).find((candidate) => candidate.clubId === career.currentContract?.clubId);
  const terms = recommendContractTerms(
    {
      currentAbility: career.currentAbility,
      age: career.age,
      clubReputation: club?.reputation ?? 1000,
      clubStrength: club?.strength ?? 50,
    },
    deps.config,
  );
  const newEndDate = addYears(career.currentDate, terms.years);

  await deps.repository.renewContract({
    contractId: career.currentContract.id,
    newEndDate,
    weeklyWage: terms.weeklyWage,
    squadRole: terms.squadRole,
  });

  return { newEndDate: newEndDate.toISOString(), weeklyWage: terms.weeklyWage };
}

export async function generateProtagonistOffers(
  deps: CareerDeps,
  input: { saveGameId: string },
): Promise<PendingOffer[] | null> {
  const career = await deps.repository.loadProtagonist(input.saveGameId);
  if (!career) return null;
  if (!career.clubId) return []; // a free agent must sign a first contract

  const clubs = await deps.repository.listCandidateClubs(input.saveGameId);
  const clubById = new Map(clubs.map((club) => [club.clubId, club]));
  const transferClubs: TransferClub[] = clubs.map((club) => ({
    clubId: club.clubId,
    reputation: club.reputation,
    strength: club.strength,
    transferBudget: club.transferBudget,
  }));

  const rng = createRandomSource(
    `${input.saveGameId}:offers:${career.currentDate.toISOString()}`,
  );
  const generated = generateTransferOffers(
    {
      currentAbility: career.currentAbility,
      potentialAbility: career.potentialAbility,
      reputation: career.reputation,
      age: career.age,
      marketValue: career.marketValue,
    },
    transferClubs,
    career.clubId,
    deps.config,
    rng,
  );

  const expiresAt = new Date(career.currentDate.getTime() + OFFER_VALIDITY_MS);
  const offerInputs: OfferInput[] = generated.map((offer) => {
    const club = clubById.get(offer.clubId);
    return {
      fromClubId: career.clubId!,
      toClubId: offer.clubId,
      fee: offer.fee,
      offeredWage: offer.offeredWeeklyWage,
      contractYears: offer.contractYears,
      squadRole: recommendSquadRole(
        career.currentAbility,
        club?.strength ?? 50,
        career.age,
      ),
      createdAt: career.currentDate,
      expiresAt,
    };
  });

  await deps.repository.createOffers(career.playerId, offerInputs);
  return deps.repository.listPendingOffers(career.playerId);
}

export async function respondToOffer(
  deps: CareerDeps,
  input: { saveGameId: string; offerId: string; accept: boolean },
): Promise<{ accepted: boolean } | null> {
  const career = await deps.repository.loadProtagonist(input.saveGameId);
  if (!career) return null;

  if (input.accept) {
    const accepted = await deps.repository.acceptOffer({
      offerId: input.offerId,
      saveGameId: input.saveGameId,
      playerId: career.playerId,
      startDate: career.currentDate,
    });
    return { accepted };
  }

  await deps.repository.rejectOffer(input.offerId);
  return { accepted: false };
}

export async function updateProtagonistMarketValue(
  deps: CareerDeps,
  input: { saveGameId: string },
): Promise<number | null> {
  const career = await deps.repository.loadProtagonist(input.saveGameId);
  if (!career) return null;

  const contractYearsRemaining = career.currentContract
    ? Math.max(
        0,
        (career.currentContract.endDate.getTime() -
          career.currentDate.getTime()) /
          YEAR_MS,
      )
    : 0;

  const calculated = computeMarketValue(
    {
      currentAbility: career.currentAbility,
      potentialAbility: career.potentialAbility,
      age: career.age,
      form: career.form,
      reputation: career.reputation,
      contractYearsRemaining,
      leagueReputation: career.leagueReputation,
    },
    deps.config,
  );
  const smoothed = smoothMarketValue(
    career.marketValue,
    calculated,
    deps.config,
  );

  await deps.repository.updateMarketValue(career.playerId, smoothed);
  return smoothed;
}

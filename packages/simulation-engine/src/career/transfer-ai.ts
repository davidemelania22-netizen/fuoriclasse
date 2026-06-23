import type { CareerConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';
import { recommendContractTerms } from './contract';

export interface TransferClub {
  clubId: string;
  reputation: number;
  strength: number;
  transferBudget: number;
}

export interface TransferPlayer {
  currentAbility: number;
  potentialAbility: number;
  reputation: number;
  age: number;
  marketValue: number;
}

export function computeClubInterest(
  club: TransferClub,
  player: TransferPlayer,
  askingFee: number,
  config: CareerConfig,
  rng: RandomSource,
): number {
  const w = config.transfer.interestWeights;
  const quality = clamp(player.currentAbility, 0, 100);
  const potential = clamp(player.potentialAbility, 0, 100);
  const reputation = clamp(player.reputation / 50, 0, 100);
  const valueForMoney = clamp(
    100 - (askingFee / Math.max(1, club.transferBudget)) * 60,
    0,
    100,
  );
  const levelFit = clamp(
    100 - Math.abs(player.currentAbility - club.strength) * 3,
    0,
    100,
  );
  const noise = rng.next() * 100;

  return (
    config.transfer.defaultRoleNeed * w.roleNeed +
    (quality * 0.6 + levelFit * 0.4) * w.quality +
    config.transfer.defaultTacticalFit * w.tacticalFit +
    valueForMoney * w.valueForMoney +
    reputation * w.reputation +
    potential * w.potential +
    config.transfer.agentNetwork * w.agentNetwork +
    noise * w.noise
  );
}

export interface GeneratedOffer {
  clubId: string;
  fee: number;
  offeredWeeklyWage: number;
  contractYears: number;
  interest: number;
}

/**
 * TransferAI: for each interested club within budget, produce an offer. Offers
 * are ranked by interest and capped at config.transfer.maxOffers.
 */
export function generateTransferOffers(
  player: TransferPlayer,
  clubs: readonly TransferClub[],
  currentClubId: string | null,
  config: CareerConfig,
  rng: RandomSource,
): GeneratedOffer[] {
  const offers: GeneratedOffer[] = [];

  for (const club of clubs) {
    if (club.clubId === currentClubId) continue;

    const noiseFactor = 1 + (rng.next() * 2 - 1) * config.transfer.feeNoise;
    const fee = Math.round(Math.max(0, player.marketValue) * noiseFactor);
    if (club.transferBudget < fee) continue;

    const interest = computeClubInterest(club, player, fee, config, rng);
    if (interest < config.transfer.minInterest) continue;

    const terms = recommendContractTerms(
      {
        currentAbility: player.currentAbility,
        age: player.age,
        clubReputation: club.reputation,
        clubStrength: club.strength,
      },
      config,
    );

    offers.push({
      clubId: club.clubId,
      fee,
      offeredWeeklyWage: terms.weeklyWage,
      contractYears: terms.years,
      interest,
    });
  }

  offers.sort((a, b) => b.interest - a.interest);
  return offers.slice(0, config.transfer.maxOffers);
}

import {
  clampProposal,
  createRandomSource,
  packageCost,
  respondToProposal,
  TERM_LIMITS,
  type ContractPackage,
  type TalksVerdict,
} from '@football-life/simulation-engine';
import { DEFAULT_CAREER_CONFIG } from '@football-life/game-data';
import type { CareerRepository } from '../repositories/career-repository';
import type { MarketRepository } from '../repositories/market-repository';
import type { ProfileRepository } from '../repositories/profile-repository';

/**
 * Sitting down over a contract — a transfer offer or a renewal with the club
 * you are already at. Both are the same conversation, so both go through here.
 *
 * The session lives in the profile JSON: what the club opened with, where it
 * stands now, how much patience is left. Nothing new in the schema, and a
 * career that never opens talks carries no extra state at all.
 */

const SQUAD_ROLE_WORDS: Record<string, string> = {
  KEY: 'Stella',
  FIRST_TEAM: 'Titolare',
  ROTATION: 'Rotazione',
  BACKUP: 'Riserva',
  PROSPECT: 'Giovane di prospettiva',
};

/** Rounds of pushing before a club stops listening. */
const STARTING_PATIENCE = 3;

/** A renewal has no offer id, so it gets a reserved one. */
export const RENEWAL_SUBJECT = 'RENEWAL';

/**
 * The session as it is stored. `lastVerdict` stays a plain string: it is only
 * ever displayed, and keeping it loose lets the repository carry the record
 * without importing this module.
 */
export interface StoredTalks {
  subject: string;
  baseline: ContractPackage;
  clubPosition: ContractPackage;
  patience: number;
  round: number;
  status: 'OPEN' | 'AGREED' | 'BROKEN';
  lastVerdict: string | null;
  lastMessage: string | null;
}

export interface TalksView extends StoredTalks {
  clubName: string;
  /** Words for the club's current position. */
  squadRoleLabel: string;
  /** What the player may ask for, so the screen can bound its inputs. */
  limits: {
    years: { min: number; max: number };
    weeklyWage: { min: number; max: number };
    signingBonus: { min: number; max: number };
    appearanceBonus: { min: number; max: number };
    goalBonus: { min: number; max: number };
  };
  /** True while the club is still at the table. */
  isOpen: boolean;
}

export interface TalksDeps {
  market: MarketRepository;
  career: CareerRepository;
  profile: ProfileRepository;
}

const bound = (base: number, span: { min: number; max: number }) => ({
  min: Math.round(base * span.min),
  max: Math.round(base * span.max),
});

function limitsFor(baseline: ContractPackage) {
  // A club that opened with no fee must still allow one to be asked for.
  const floor = (value: number) => (value > 0 ? value : baseline.weeklyWage);
  return {
    years: { ...TERM_LIMITS.years },
    weeklyWage: bound(baseline.weeklyWage, TERM_LIMITS.weeklyWage),
    signingBonus: bound(floor(baseline.signingBonus), TERM_LIMITS.signingBonus),
    appearanceBonus: bound(
      floor(baseline.appearanceBonus),
      TERM_LIMITS.appearanceBonus,
    ),
    goalBonus: bound(floor(baseline.goalBonus), TERM_LIMITS.goalBonus),
  };
}

/** Everything needed to price and apply a deal, for either subject. */
async function context(deps: TalksDeps, saveGameId: string, subject: string) {
  const state = await deps.market.loadMarketState(saveGameId);
  if (!state) return null;

  const career = await deps.career.loadProtagonist(saveGameId);
  if (!career) return null;

  const directory = await deps.career.listClubDirectory(saveGameId);
  const expiringSoon =
    state.currentContractEnd !== null &&
    state.currentContractEnd.getTime() - state.currentDate.getTime() <
      365 * 86_400_000;

  if (subject === RENEWAL_SUBJECT) {
    if (!state.clubId || !career.currentContract) return null;
    const club = directory.find((c) => c.clubId === state.clubId);
    const contract = career.currentContract;
    const config = DEFAULT_CAREER_CONFIG.contract;
    return {
      state,
      career,
      clubName: state.clubName ?? 'il tuo club',
      clubReputation: club?.reputation ?? 0,
      expiringSoon,
      // A renewal opens from what the player earns today: the club's first
      // word is "the same again", and everything is argued from there.
      baseline: {
        years: config.defaultYears,
        weeklyWage: contract.weeklyWage,
        signingBonus: Math.round(
          contract.weeklyWage * config.signingBonusWeeks,
        ),
        appearanceBonus: Math.round(
          contract.weeklyWage * config.appearanceBonusFactor,
        ),
        goalBonus: Math.round(contract.weeklyWage * config.goalBonusFactor),
        squadRole: contract.squadRole,
      } satisfies ContractPackage,
    };
  }

  const offers = await deps.career.listPendingOffers(state.playerId);
  const offer = offers.find((o) => o.id === subject);
  if (!offer) return null;
  const club = directory.find((c) => c.clubId === offer.toClubId);
  const config = DEFAULT_CAREER_CONFIG.contract;
  return {
    state,
    career,
    clubName: club?.name ?? 'Sconosciuto',
    clubReputation: club?.reputation ?? 0,
    expiringSoon,
    baseline: {
      years: offer.contractYears,
      weeklyWage: offer.offeredWage,
      signingBonus: Math.round(offer.offeredWage * config.signingBonusWeeks),
      appearanceBonus: Math.round(
        offer.offeredWage * config.appearanceBonusFactor,
      ),
      goalBonus: Math.round(offer.offeredWage * config.goalBonusFactor),
      squadRole: offer.squadRole,
    } satisfies ContractPackage,
  };
}

function view(talks: StoredTalks, clubName: string): TalksView {
  return {
    ...talks,
    clubName,
    squadRoleLabel:
      SQUAD_ROLE_WORDS[talks.clubPosition.squadRole] ??
      talks.clubPosition.squadRole,
    limits: limitsFor(talks.baseline),
    isOpen: talks.status === 'OPEN' && talks.patience > 0,
  };
}

/** Open (or reopen) the table on a subject. */
export async function openTalks(
  deps: TalksDeps,
  input: { saveGameId: string; subject: string },
): Promise<TalksView | null> {
  const ctx = await context(deps, input.saveGameId, input.subject);
  if (!ctx) return null;

  const profile = await deps.profile.getProfile(input.saveGameId);
  const existing = profile?.contractTalks ?? null;
  // Resuming the same conversation keeps its history; a different subject
  // replaces it, because you can only be at one table at a time.
  if (existing && existing.subject === input.subject) {
    return view(existing, ctx.clubName);
  }

  const talks: StoredTalks = {
    subject: input.subject,
    baseline: ctx.baseline,
    clubPosition: ctx.baseline,
    patience: STARTING_PATIENCE,
    round: 0,
    status: 'OPEN',
    lastVerdict: null,
    lastMessage: null,
  };
  await deps.profile.setContractTalks(input.saveGameId, talks);
  return view(talks, ctx.clubName);
}

export async function getTalks(
  deps: TalksDeps,
  saveGameId: string,
): Promise<TalksView | null> {
  const profile = await deps.profile.getProfile(saveGameId);
  const talks = profile?.contractTalks;
  if (!talks) return null;
  const ctx = await context(deps, saveGameId, talks.subject);
  return view(talks, ctx?.clubName ?? 'Il club');
}

export interface ProposalResult extends TalksView {
  /** What the club just did with the package it was handed. */
  verdict: TalksVerdict;
  message: string;
}

/** Put a package on the table and hear back. */
export async function proposeTerms(
  deps: TalksDeps,
  input: { saveGameId: string; proposal: ContractPackage },
): Promise<ProposalResult | null> {
  const profile = await deps.profile.getProfile(input.saveGameId);
  const talks = profile?.contractTalks;
  if (!talks || talks.status !== 'OPEN' || talks.patience <= 0) return null;

  const ctx = await context(deps, input.saveGameId, talks.subject);
  if (!ctx) return null;

  const rng = createRandomSource(
    `${input.saveGameId}:talks:${talks.subject}:${talks.round}`,
  );
  const response = respondToProposal(
    {
      baseline: talks.baseline,
      clubPosition: talks.clubPosition,
      proposal: input.proposal,
      leverage: {
        currentAbility: ctx.career.currentAbility,
        clubReputation: ctx.clubReputation,
        marketValue: ctx.state.marketValue,
        expiringSoon: ctx.expiringSoon,
      },
      patience: talks.patience,
    },
    rng,
  );

  const next: StoredTalks = {
    ...talks,
    clubPosition: response.terms,
    patience: response.patienceLeft,
    round: talks.round + 1,
    status:
      response.verdict === 'ACCEPT'
        ? 'AGREED'
        : response.verdict === 'WALKED_OUT'
          ? 'BROKEN'
          : 'OPEN',
    lastVerdict: response.verdict,
    lastMessage: response.message,
  };
  await deps.profile.setContractTalks(input.saveGameId, next);

  return {
    ...view(next, ctx.clubName),
    verdict: response.verdict,
    message: response.message,
  };
}

export interface SignResult {
  signed: boolean;
  terms: ContractPackage;
  clubName: string;
}

/**
 * Take what is on the table. The club's current position is always signable —
 * accepting its opening offer without arguing is a legitimate move.
 */
export async function signAgreedTerms(
  deps: TalksDeps,
  saveGameId: string,
): Promise<SignResult | null> {
  const profile = await deps.profile.getProfile(saveGameId);
  const talks = profile?.contractTalks;
  if (!talks) return null;
  // A club that walked out has stopped *negotiating*, not withdrawn what it
  // already put on the table: its last position stays signable, which is what
  // the screen promises.

  const ctx = await context(deps, saveGameId, talks.subject);
  if (!ctx) return null;
  const terms = clampProposal(talks.clubPosition, talks.baseline);

  if (talks.subject === RENEWAL_SUBJECT) {
    const contract = ctx.career.currentContract;
    if (!contract) return null;
    await deps.career.renewContract({
      contractId: contract.id,
      newEndDate: new Date(
        ctx.state.currentDate.getTime() + terms.years * 365 * 86_400_000,
      ),
      weeklyWage: terms.weeklyWage,
      squadRole: terms.squadRole,
      signingBonus: terms.signingBonus,
      appearanceBonus: terms.appearanceBonus,
      goalBonus: terms.goalBonus,
    });
  } else {
    // The offer row carries wage, length and role; write them, sign, then put
    // the bonuses on the contract the signing just created.
    await deps.market.updateOfferTerms({
      offerId: talks.subject,
      playerId: ctx.state.playerId,
      weeklyWage: terms.weeklyWage,
      squadRole: terms.squadRole,
      contractYears: terms.years,
    });
    const accepted = await deps.career.acceptOffer({
      offerId: talks.subject,
      saveGameId,
      playerId: ctx.state.playerId,
      startDate: ctx.state.currentDate,
    });
    if (!accepted) return null;
    await deps.market.setContractBonuses({
      playerId: ctx.state.playerId,
      signingBonus: terms.signingBonus,
      appearanceBonus: terms.appearanceBonus,
      goalBonus: terms.goalBonus,
    });
  }

  await deps.profile.setContractTalks(saveGameId, null);
  return { signed: true, terms, clubName: ctx.clubName };
}

/** Walk away from the table without signing. */
export async function cancelTalks(
  deps: TalksDeps,
  saveGameId: string,
): Promise<boolean> {
  return deps.profile.setContractTalks(saveGameId, null);
}

/** What a package would cost the club per season — shown while you draft it. */
export function costOf(pkg: ContractPackage): number {
  return Math.round(packageCost(pkg));
}

import {
  createRandomSource,
  negotiate,
  negotiationOdds,
  transferWindowAt,
  transferWindowLabel,
  type NegotiationAsk,
} from '@football-life/simulation-engine';
import type { CareerRepository } from '../repositories/career-repository';
import type {
  MarketRepository,
  WorldTransferRecord,
} from '../repositories/market-repository';
import type { ProfileRepository } from '../repositories/profile-repository';

/**
 * The transfer market as one screen: whether it is open, what is on the table,
 * how each offer compares to the deal you already have, who is still watching,
 * and what the rest of the world has been doing.
 *
 * Offers themselves are made by the scouting pass, which is where interest
 * turns into a bid. This assembles and negotiates; it never invents an offer.
 */

const SQUAD_ROLE_WORDS: Record<string, string> = {
  KEY: 'Stella',
  FIRST_TEAM: 'Titolare',
  ROTATION: 'Rotazione',
  BACKUP: 'Riserva',
  PROSPECT: 'Giovane di prospettiva',
};

/** Rank of a squad role, so an offer can be called a step up or a step down. */
const ROLE_RANK: Record<string, number> = {
  PROSPECT: 0,
  BACKUP: 1,
  ROTATION: 2,
  FIRST_TEAM: 3,
  KEY: 4,
};

export interface MarketOfferView {
  id: string;
  clubName: string;
  clubLogo: string | null;
  clubReputation: number;
  competitionName: string | null;
  fee: number;
  weeklyWage: number;
  contractYears: number;
  squadRole: string;
  squadRoleLabel: string;
  /** Against the current deal: positive means the offer is better. */
  wageDelta: number | null;
  roleDelta: number | null;
  reputationDelta: number | null;
  /** False once the player has already pushed this club. */
  canNegotiate: boolean;
}

export interface MarketView {
  window: {
    isOpen: boolean;
    kind: string;
    label: string;
    daysAway: number;
    opensAt: string;
    closesAt: string;
  };
  current: {
    clubName: string | null;
    weeklyWage: number | null;
    squadRoleLabel: string | null;
    contractEnd: string | null;
    marketValue: number;
  };
  offers: MarketOfferView[];
  worldTransfers: WorldTransferRecord[];
}

export interface MarketDeps {
  market: MarketRepository;
  career: CareerRepository;
  profile: ProfileRepository;
}

const WORLD_TRANSFERS_SHOWN = 8;

export async function getMarket(
  deps: MarketDeps,
  saveGameId: string,
): Promise<MarketView | null> {
  const state = await deps.market.loadMarketState(saveGameId);
  if (!state) return null;

  // Without a season we cannot place the window; treat the market as open so a
  // brand-new career is never locked out of signing somewhere.
  const window = state.seasonStart
    ? transferWindowAt(state.currentDate, state.seasonStart)
    : {
        isOpen: true,
        kind: 'SUMMER' as const,
        daysAway: 0,
        opensAt: state.currentDate,
        closesAt: state.currentDate,
      };

  const offers = await deps.career.listPendingOffers(state.playerId);
  const directory = new Map(
    (await deps.career.listClubDirectory(saveGameId)).map((c) => [c.clubId, c]),
  );
  const profile = await deps.profile.getProfile(saveGameId);
  const negotiated = new Set(profile?.negotiatedOfferIds ?? []);

  const currentRank =
    state.currentSquadRole !== null
      ? (ROLE_RANK[state.currentSquadRole] ?? null)
      : null;

  return {
    window: {
      isOpen: window.isOpen,
      kind: window.kind,
      label: transferWindowLabel(window.kind),
      daysAway: window.daysAway,
      opensAt: window.opensAt.toISOString(),
      closesAt: window.closesAt.toISOString(),
    },
    current: {
      clubName: state.clubName,
      weeklyWage: state.currentWeeklyWage,
      squadRoleLabel:
        state.currentSquadRole !== null
          ? (SQUAD_ROLE_WORDS[state.currentSquadRole] ?? state.currentSquadRole)
          : null,
      contractEnd: state.currentContractEnd?.toISOString() ?? null,
      marketValue: state.marketValue,
    },
    offers: offers.map((offer) => {
      const club = directory.get(offer.toClubId);
      const offerRank = ROLE_RANK[offer.squadRole] ?? null;
      return {
        id: offer.id,
        clubName: club?.name ?? 'Sconosciuto',
        clubLogo: club?.logo ?? null,
        clubReputation: club?.reputation ?? 0,
        competitionName: club?.competitionName ?? null,
        fee: offer.fee,
        weeklyWage: offer.offeredWage,
        contractYears: offer.contractYears,
        squadRole: offer.squadRole,
        squadRoleLabel: SQUAD_ROLE_WORDS[offer.squadRole] ?? offer.squadRole,
        wageDelta:
          state.currentWeeklyWage !== null
            ? offer.offeredWage - state.currentWeeklyWage
            : null,
        roleDelta:
          currentRank !== null && offerRank !== null
            ? offerRank - currentRank
            : null,
        reputationDelta:
          state.currentClubReputation !== null && club
            ? club.reputation - state.currentClubReputation
            : null,
        canNegotiate: !negotiated.has(offer.id),
      };
    }),
    worldTransfers: await deps.market.listWorldTransfers(
      saveGameId,
      WORLD_TRANSFERS_SHOWN,
    ),
  };
}

export interface NegotiationPreview {
  successChance: number;
  successLabel: string;
  failureLabel: string;
}

/** The odds, shown before the player commits — never rolled here. */
export async function previewNegotiation(
  deps: MarketDeps,
  input: { saveGameId: string; offerId: string; ask: NegotiationAsk },
): Promise<NegotiationPreview | null> {
  const built = await buildNegotiation(deps, input);
  if (!built) return null;
  const odds = negotiationOdds(built.negotiationInput);
  // The engine speaks in role keys; nobody should read FIRST_TEAM on screen.
  return { ...odds, successLabel: inWords(odds.successLabel) };
}

/** Swap any squad-role key inside a sentence for its Italian word. */
function inWords(text: string): string {
  return Object.entries(SQUAD_ROLE_WORDS).reduce(
    (out, [key, word]) => out.replace(key, word),
    text,
  );
}

export interface NegotiationOutcome {
  succeeded: boolean;
  weeklyWage: number;
  squadRole: string;
  squadRoleLabel: string;
}

/**
 * Push the club. The roll is seeded on the save, the offer and the ask, so it
 * cannot be re-rolled by asking again — and asking again is blocked anyway.
 */
export async function runNegotiation(
  deps: MarketDeps,
  input: { saveGameId: string; offerId: string; ask: NegotiationAsk },
): Promise<NegotiationOutcome | null> {
  const built = await buildNegotiation(deps, input);
  if (!built) return null;

  const profile = await deps.profile.getProfile(input.saveGameId);
  const negotiated = new Set(profile?.negotiatedOfferIds ?? []);
  if (negotiated.has(input.offerId)) return null;

  const rng = createRandomSource(
    `${input.saveGameId}:negotiate:${input.offerId}:${input.ask}`,
  );
  const result = negotiate(built.negotiationInput, rng);

  const written = await deps.market.updateOfferTerms({
    offerId: input.offerId,
    playerId: built.playerId,
    weeklyWage: result.weeklyWage,
    squadRole: result.squadRole,
  });
  if (!written) return null;

  negotiated.add(input.offerId);
  await deps.profile.setNegotiatedOffers(input.saveGameId, [...negotiated]);

  return {
    succeeded: result.succeeded,
    weeklyWage: result.weeklyWage,
    squadRole: result.squadRole,
    squadRoleLabel: SQUAD_ROLE_WORDS[result.squadRole] ?? result.squadRole,
  };
}

/** Shared lookup: the offer, its club and the player's leverage. */
async function buildNegotiation(
  deps: MarketDeps,
  input: { saveGameId: string; offerId: string; ask: NegotiationAsk },
) {
  const state = await deps.market.loadMarketState(input.saveGameId);
  if (!state) return null;

  const offers = await deps.career.listPendingOffers(state.playerId);
  const offer = offers.find((o) => o.id === input.offerId);
  if (!offer) return null;

  const club = (await deps.career.listClubDirectory(input.saveGameId)).find(
    (c) => c.clubId === offer.toClubId,
  );

  return {
    playerId: state.playerId,
    negotiationInput: {
      ask: input.ask,
      currentAbility: state.currentAbility,
      clubReputation: club?.reputation ?? 0,
      offeredWage: offer.offeredWage,
      squadRole: offer.squadRole,
      marketValue: state.marketValue,
    },
  };
}

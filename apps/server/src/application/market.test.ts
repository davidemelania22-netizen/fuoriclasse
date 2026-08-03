import { describe, expect, it } from 'vitest';
import { getMarket, previewNegotiation, runNegotiation } from './market';
import type {
  MarketRepository,
  MarketState,
} from '../repositories/market-repository';
import type {
  CareerRepository,
  PendingOffer,
} from '../repositories/career-repository';
import type { ProfileRepository } from '../repositories/profile-repository';

const SEASON_START = new Date('2024-08-17T00:00:00.000Z');
const WEEK = 7 * 86_400_000;

function state(overrides: Partial<MarketState> = {}): MarketState {
  return {
    playerId: 'player-1',
    currentDate: new Date(SEASON_START.getTime() - 4 * WEEK), // pre-season
    seasonStart: SEASON_START,
    seasonLabel: '2024/25',
    currentAbility: 70,
    marketValue: 5_000_000,
    clubId: 'club-now',
    clubName: 'Frosinone Ciociara',
    currentWeeklyWage: 4_000,
    currentSquadRole: 'ROTATION',
    currentContractEnd: new Date('2026-06-30T00:00:00.000Z'),
    currentClubReputation: 1_200,
    ...overrides,
  };
}

const offer: PendingOffer = {
  id: 'offer-1',
  fromClubId: 'club-now',
  toClubId: 'club-big',
  fee: 12_000_000,
  offeredWage: 9_000,
  contractYears: 4,
  squadRole: 'FIRST_TEAM',
};

function deps(options: {
  marketState?: MarketState | null;
  offers?: PendingOffer[];
  negotiated?: string[];
}) {
  const negotiated = [...(options.negotiated ?? [])];
  let updated: { weeklyWage: number; squadRole: string } | null = null;

  const market: MarketRepository = {
    loadMarketState: async () =>
      options.marketState === undefined ? state() : options.marketState,
    listWorldTransfers: async () => [
      { date: '2024-07-02T00:00:00.000Z', headline: 'Un colpo', body: 'Testo' },
    ],
    updateOfferTerms: async (input) => {
      updated = { weeklyWage: input.weeklyWage, squadRole: input.squadRole };
      return true;
    },
  };

  const career = {
    listPendingOffers: async () => options.offers ?? [offer],
    listClubDirectory: async () => [
      {
        clubId: 'club-big',
        name: 'Milano Nerazzurra',
        shortName: 'MIL',
        logo: null,
        reputation: 6_000,
        strength: 80,
        competitionName: 'Italia Prima Divisione',
        countryId: 'IT',
      },
    ],
  } as unknown as CareerRepository;

  const profile = {
    getProfile: async () => ({ negotiatedOfferIds: negotiated }),
    setNegotiatedOffers: async (_id: string, ids: string[]) => {
      negotiated.splice(0, negotiated.length, ...ids);
      return true;
    },
  } as unknown as ProfileRepository;

  return {
    deps: { market, career, profile },
    negotiated,
    getUpdated: () => updated,
  };
}

describe('market', () => {
  it('returns null without a protagonist', async () => {
    const { deps: d } = deps({ marketState: null });
    expect(await getMarket(d, 'save-1')).toBeNull();
  });

  it('reports the window and counts down to the deadline', async () => {
    const { deps: d } = deps({});
    const view = (await getMarket(d, 'save-1'))!;
    expect(view.window.isOpen).toBe(true);
    expect(view.window.label).toBe('Mercato estivo');
    expect(view.window.daysAway).toBeGreaterThan(0);
  });

  it('shuts in mid-season', async () => {
    const { deps: d } = deps({
      marketState: state({
        currentDate: new Date(SEASON_START.getTime() + 10 * WEEK),
      }),
    });
    const view = (await getMarket(d, 'save-1'))!;
    expect(view.window.isOpen).toBe(false);
  });

  it('treats a world with no season as open, never as locked', async () => {
    const { deps: d } = deps({ marketState: state({ seasonStart: null }) });
    expect((await getMarket(d, 'save-1'))!.window.isOpen).toBe(true);
  });

  it('compares each offer with the deal already in hand', async () => {
    const { deps: d } = deps({});
    const [view] = (await getMarket(d, 'save-1'))!.offers;
    expect(view!.wageDelta).toBe(5_000); // 9.000 against 4.000
    expect(view!.roleDelta).toBe(1); // ROTATION → FIRST_TEAM
    expect(view!.reputationDelta).toBe(4_800); // 6.000 against 1.200
    expect(view!.squadRoleLabel).toBe('Titolare');
  });

  it('leaves the comparison blank for a player with no contract', async () => {
    const { deps: d } = deps({
      marketState: state({
        currentWeeklyWage: null,
        currentSquadRole: null,
        currentClubReputation: null,
      }),
    });
    const [view] = (await getMarket(d, 'save-1'))!.offers;
    expect(view!.wageDelta).toBeNull();
    expect(view!.roleDelta).toBeNull();
    expect(view!.reputationDelta).toBeNull();
  });

  it('shows the odds without rolling anything', async () => {
    const { deps: d, getUpdated } = deps({});
    const preview = (await previewNegotiation(d, {
      saveGameId: 'save-1',
      offerId: 'offer-1',
      ask: 'WAGE',
    }))!;
    expect(preview.successChance).toBeGreaterThan(0);
    expect(preview.successChance).toBeLessThan(1);
    expect(getUpdated()).toBeNull();
  });

  it('never prints a role key on screen', async () => {
    const { deps: d } = deps({});
    const preview = (await previewNegotiation(d, {
      saveGameId: 'save-1',
      offerId: 'offer-1',
      ask: 'ROLE',
    }))!;
    expect(preview.successLabel).toContain('Stella');
    expect(preview.successLabel).not.toContain('KEY');
  });

  it('writes the negotiated terms back onto the offer', async () => {
    const { deps: d, getUpdated } = deps({});
    const outcome = (await runNegotiation(d, {
      saveGameId: 'save-1',
      offerId: 'offer-1',
      ask: 'WAGE',
    }))!;
    expect(getUpdated()).toEqual({
      weeklyWage: outcome.weeklyWage,
      squadRole: outcome.squadRole,
    });
    // Win or lose, the wage never comes out below what was offered.
    expect(outcome.weeklyWage).toBeGreaterThanOrEqual(offer.offeredWage);
  });

  it('refuses a second go at the same club', async () => {
    const { deps: d } = deps({});
    expect(
      await runNegotiation(d, {
        saveGameId: 'save-1',
        offerId: 'offer-1',
        ask: 'WAGE',
      }),
    ).not.toBeNull();
    expect(
      await runNegotiation(d, {
        saveGameId: 'save-1',
        offerId: 'offer-1',
        ask: 'ROLE',
      }),
    ).toBeNull();
  });

  it('marks an already-negotiated offer as closed to further asks', async () => {
    const { deps: d } = deps({ negotiated: ['offer-1'] });
    const [view] = (await getMarket(d, 'save-1'))!.offers;
    expect(view!.canNegotiate).toBe(false);
  });

  it('ignores an offer id that is not on the table', async () => {
    const { deps: d } = deps({});
    expect(
      await previewNegotiation(d, {
        saveGameId: 'save-1',
        offerId: 'non-esiste',
        ask: 'WAGE',
      }),
    ).toBeNull();
  });
});

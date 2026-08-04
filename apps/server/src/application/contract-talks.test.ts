import { describe, expect, it } from 'vitest';
import {
  cancelTalks,
  getTalks,
  openTalks,
  proposeTerms,
  RENEWAL_SUBJECT,
  signAgreedTerms,
  type StoredTalks,
} from './contract-talks';
import type {
  MarketRepository,
  MarketState,
} from '../repositories/market-repository';
import type {
  CareerRepository,
  PendingOffer,
  ProtagonistCareer,
} from '../repositories/career-repository';
import type {
  ProfileRepository,
  StoredPendingRenewal,
  StoredTalksMemory,
} from '../repositories/profile-repository';
import type { CareerStatsRepository } from '../repositories/career-stats-repository';

const NOW = new Date('2024-07-01T00:00:00.000Z');

const offer: PendingOffer = {
  id: 'offer-1',
  fromClubId: 'club-now',
  toClubId: 'club-big',
  fee: 30_000_000,
  offeredWage: 12_000,
  contractYears: 3,
  squadRole: 'FIRST_TEAM',
};

function harness(
  options: {
    talks?: StoredTalks | null;
    memory?: StoredTalksMemory | null;
    seasonAppearances?: number;
    seasonGoals?: number;
  } = {},
) {
  let stored: StoredTalks | null = options.talks ?? null;
  let memory: StoredTalksMemory | null = options.memory ?? null;
  let pendingRenewal: StoredPendingRenewal | null = null;
  const renewed: unknown[] = [];
  const accepted: string[] = [];
  const bonusesWritten: unknown[] = [];
  const offerTerms: unknown[] = [];

  const state: MarketState = {
    playerId: 'player-1',
    currentDate: NOW,
    seasonStart: new Date('2024-08-17T00:00:00.000Z'),
    seasonLabel: '2024/25',
    currentAbility: 85,
    marketValue: 40_000_000,
    clubId: 'club-now',
    clubName: 'Bologna Felsinea',
    currentWeeklyWage: 6_000,
    currentSquadRole: 'KEY',
    currentContractEnd: new Date('2027-07-01T00:00:00.000Z'),
    currentClubReputation: 2_500,
  };

  const career: ProtagonistCareer = {
    saveGameId: 'save-1',
    playerId: 'player-1',
    currentDate: NOW,
    age: 28,
    currentAbility: 85,
    potentialAbility: 88,
    form: 60,
    reputation: 5_000,
    marketValue: 40_000_000,
    clubId: 'club-now',
    leagueReputation: 3_000,
    currentContract: {
      id: 'contract-1',
      clubId: 'club-now',
      endDate: new Date('2027-07-01T00:00:00.000Z'),
      squadRole: 'KEY',
      weeklyWage: 6_000,
      appearanceBonus: 600,
      goalBonus: 3_000,
    },
  };

  const market = {
    loadMarketState: async () => state,
    listWorldTransfers: async () => [],
    updateOfferTerms: async (input: unknown) => {
      offerTerms.push(input);
      return true;
    },
    setContractBonuses: async (input: unknown) => {
      bonusesWritten.push(input);
      return true;
    },
  } as unknown as MarketRepository;

  const careerRepo = {
    loadProtagonist: async () => career,
    listPendingOffers: async () => [offer],
    listClubDirectory: async () => [
      { clubId: 'club-now', name: 'Bologna Felsinea', reputation: 2_500 },
      { clubId: 'club-big', name: 'Milano Nerazzurra', reputation: 7_000 },
    ],
    renewContract: async (input: unknown) => {
      renewed.push(input);
    },
    acceptOffer: async (input: { offerId: string }) => {
      accepted.push(input.offerId);
      return true;
    },
  } as unknown as CareerRepository;

  const profile = {
    getProfile: async () => ({ contractTalks: stored, talksMemory: memory }),
    setContractTalks: async (_id: string, talks: StoredTalks | null) => {
      stored = talks;
      return true;
    },
    setTalksMemory: async (_id: string, next: StoredTalksMemory) => {
      memory = next;
      return true;
    },
    setPendingRenewal: async (
      _id: string,
      next: StoredPendingRenewal | null,
    ) => {
      pendingRenewal = next;
      return true;
    },
  } as unknown as ProfileRepository;

  // A regular starter by default: enough on the pitch for a club to listen.
  const careerStats = {
    loadCareerStats: async () => ({
      appearances: Array.from(
        { length: options.seasonAppearances ?? 20 },
        (_, i) => ({
          seasonStartMs: 0,
          goals: i < (options.seasonGoals ?? 6) ? 1 : 0,
        }),
      ),
    }),
  } as unknown as CareerStatsRepository;

  return {
    deps: { market, career: careerRepo, profile, careerStats },
    get memory() {
      return memory;
    },
    get pendingRenewal() {
      return pendingRenewal;
    },
    get stored() {
      return stored;
    },
    renewed,
    accepted,
    bonusesWritten,
    offerTerms,
  };
}

/** Open the table and insist it actually opened. */
async function sitDown(
  deps: Parameters<typeof openTalks>[0],
  subject: string,
) {
  const result = await openTalks(deps, { saveGameId: 'save-1', subject });
  if (!result || result.status !== 'OPEN') {
    throw new Error(`il club non si è seduto: ${JSON.stringify(result)}`);
  }
  return result.talks;
}

describe('contract talks', () => {
  it('opens a renewal from what the player earns today', async () => {
    const h = harness();
    const talks = await sitDown(h.deps, RENEWAL_SUBJECT);
    expect(talks.clubName).toBe('Bologna Felsinea');
    expect(talks.baseline.weeklyWage).toBe(6_000);
    expect(talks.baseline.squadRole).toBe('KEY');
    // Every term is on the table, not just the wage.
    expect(talks.baseline.signingBonus).toBeGreaterThan(0);
    expect(talks.baseline.appearanceBonus).toBeGreaterThan(0);
    expect(talks.baseline.goalBonus).toBeGreaterThan(0);
    expect(talks.isOpen).toBe(true);
  });

  it('opens a transfer from what the club bid', async () => {
    const h = harness();
    const talks = await sitDown(h.deps, 'offer-1');
    expect(talks.clubName).toBe('Milano Nerazzurra');
    expect(talks.baseline.weeklyWage).toBe(12_000);
    expect(talks.baseline.years).toBe(3);
  });

  it('refuses a subject that is neither a renewal nor a live offer', async () => {
    const h = harness();
    expect(
      await openTalks(h.deps, { saveGameId: 'save-1', subject: 'non-esiste' }),
    ).toBeNull();
  });

  it('resumes the same table instead of restarting it', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    await proposeTerms(h.deps, {
      saveGameId: 'save-1',
      proposal: { ...h.stored!.baseline, weeklyWage: 20_000 },
    });
    const spent = h.stored!.patience;
    const again = await sitDown(h.deps, 'offer-1');
    expect(again.patience).toBe(spent);
    expect(again.round).toBe(1);
  });

  it('bounds what may be asked for', async () => {
    const h = harness();
    const talks = await sitDown(h.deps, 'offer-1');
    expect(talks.limits.weeklyWage.max).toBe(12_000 * 4);
    expect(talks.limits.years.max).toBe(6);
  });

  it('moves the club when the ask is reasonable', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    const result = (await proposeTerms(h.deps, {
      saveGameId: 'save-1',
      proposal: { ...h.stored!.baseline, weeklyWage: 17_000 },
    }))!;
    expect(['ACCEPT', 'COUNTER']).toContain(result.verdict);
    expect(result.clubPosition.weeklyWage).toBeGreaterThanOrEqual(12_000);
  });

  it('closes the table once the club has agreed', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    const result = (await proposeTerms(h.deps, {
      saveGameId: 'save-1',
      proposal: h.stored!.baseline,
    }))!;
    expect(result.verdict).toBe('ACCEPT');
    expect(result.status).toBe('AGREED');
  });

  it('stops listening after too much pushing', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    const greedy = { ...h.stored!.baseline, weeklyWage: 48_000 };
    await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy });
    const second = await proposeTerms(h.deps, {
      saveGameId: 'save-1',
      proposal: greedy,
    });
    expect(second?.status).toBe('BROKEN');
    // And no further round is even accepted.
    expect(
      await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy }),
    ).toBeNull();
  });

  it('still lets the club’s last position be signed after it walked out', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    const greedy = { ...h.stored!.baseline, weeklyWage: 48_000 };
    await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy });
    await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy });
    expect(h.stored!.status).toBe('BROKEN');

    const signed = await signAgreedTerms(h.deps, 'save-1');
    expect(signed?.signed).toBe(true);
    expect(h.accepted).toEqual(['offer-1']);
  });

  it('writes every agreed term when a renewal is signed', async () => {
    const h = harness();
    await sitDown(h.deps, RENEWAL_SUBJECT);
    await proposeTerms(h.deps, {
      saveGameId: 'save-1',
      proposal: { ...h.stored!.baseline, years: 5 },
    });
    const signed = (await signAgreedTerms(h.deps, 'save-1'))!;
    expect(signed.terms.years).toBe(5);

    const renewal = h.renewed[0] as Record<string, number>;
    expect(renewal.weeklyWage).toBe(signed.terms.weeklyWage);
    expect(renewal.signingBonus).toBe(signed.terms.signingBonus);
    expect(renewal.appearanceBonus).toBe(signed.terms.appearanceBonus);
    expect(renewal.goalBonus).toBe(signed.terms.goalBonus);
  });

  it('puts the bonuses on the contract a transfer creates', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    const signed = (await signAgreedTerms(h.deps, 'save-1'))!;

    // Wage, length and role travel on the offer; bonuses land afterwards.
    expect(h.offerTerms[0]).toMatchObject({
      weeklyWage: signed.terms.weeklyWage,
      contractYears: signed.terms.years,
      squadRole: signed.terms.squadRole,
    });
    expect(h.bonusesWritten[0]).toMatchObject({
      signingBonus: signed.terms.signingBonus,
      appearanceBonus: signed.terms.appearanceBonus,
      goalBonus: signed.terms.goalBonus,
    });
  });

  it('leaves a renewal waiting for its moment on screen', async () => {
    const h = harness();
    await sitDown(h.deps, RENEWAL_SUBJECT);
    const signed = (await signAgreedTerms(h.deps, 'save-1'))!;
    expect(h.pendingRenewal).toMatchObject({
      clubId: 'club-now',
      years: signed.terms.years,
      weeklyWage: signed.terms.weeklyWage,
    });
  });

  it('does not stage a renewal scene after a transfer', async () => {
    // Joining somewhere new has its own unveiling; this must stay untouched.
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    await signAgreedTerms(h.deps, 'save-1');
    expect(h.pendingRenewal).toBeNull();
  });

  it('clears the table once signed', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    await signAgreedTerms(h.deps, 'save-1');
    expect(h.stored).toBeNull();
    expect(await getTalks(h.deps, 'save-1')).toBeNull();
  });

  it('lets the player walk away without signing', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    await cancelTalks(h.deps, 'save-1');
    expect(await getTalks(h.deps, 'save-1')).toBeNull();
    expect(h.accepted).toEqual([]);
    expect(h.renewed).toEqual([]);
  });
});

describe('what the club remembers', () => {
  it('does not refund the patience spent when you leave and come back', async () => {
    const h = harness();
    await sitDown(h.deps, 'offer-1');
    await proposeTerms(h.deps, {
      saveGameId: 'save-1',
      proposal: { ...h.stored!.baseline, weeklyWage: 20_000 },
    });
    const spent = h.stored!.patience;
    expect(spent).toBeLessThan(3);

    await cancelTalks(h.deps, 'save-1');
    const again = await sitDown(h.deps, 'offer-1');
    expect(again.patience).toBe(spent);
  });

  it('shuts the door for weeks after the club walks out', async () => {
    const h = harness();
    await sitDown(h.deps, RENEWAL_SUBJECT);
    const greedy = { ...h.stored!.baseline, weeklyWage: 24_000 };
    await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy });
    await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy });
    expect(h.stored!.status).toBe('BROKEN');
    expect(h.memory?.coolingOffUntil).toBeTruthy();

    // A different subject is refused too: the club is not listening at all.
    await cancelTalks(h.deps, 'save-1');
    const answer = await openTalks(h.deps, {
      saveGameId: 'save-1',
      subject: 'offer-1',
    });
    expect(answer).toMatchObject({
      status: 'REFUSED',
      reason: 'COOLING_OFF',
    });
  });

  it('does not let the same table be reopened to dodge the cooling off', async () => {
    const h = harness();
    await sitDown(h.deps, RENEWAL_SUBJECT);
    const greedy = { ...h.stored!.baseline, weeklyWage: 24_000 };
    await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy });
    await proposeTerms(h.deps, { saveGameId: 'save-1', proposal: greedy });
    await cancelTalks(h.deps, 'save-1');

    const answer = await openTalks(h.deps, {
      saveGameId: 'save-1',
      subject: RENEWAL_SUBJECT,
    });
    expect(answer).toMatchObject({
      status: 'REFUSED',
      reason: 'COOLING_OFF',
    });
  });

  it('will not reopen a contract it has just signed', async () => {
    const h = harness();
    await sitDown(h.deps, RENEWAL_SUBJECT);
    await signAgreedTerms(h.deps, 'save-1');
    expect(h.memory?.lastSignedAt).toBe(NOW.toISOString());

    const answer = await openTalks(h.deps, {
      saveGameId: 'save-1',
      subject: RENEWAL_SUBJECT,
    });
    expect(answer).toMatchObject({
      status: 'REFUSED',
      reason: 'JUST_SIGNED',
    });
  });

  it('will not improve a long contract for someone who never plays', async () => {
    const h = harness({ seasonAppearances: 2, seasonGoals: 0 });
    const answer = await openTalks(h.deps, {
      saveGameId: 'save-1',
      subject: RENEWAL_SUBJECT,
    });
    expect(answer).toMatchObject({
      status: 'REFUSED',
      reason: 'NOT_EARNED',
    });
  });

  it('still hears an offer from another club when you are benched', async () => {
    // Somebody else wanting you is not a favour your own club grants.
    const h = harness({ seasonAppearances: 2, seasonGoals: 0 });
    const answer = await openTalks(h.deps, {
      saveGameId: 'save-1',
      subject: 'offer-1',
    });
    expect(answer?.status).toBe('OPEN');
  });
});

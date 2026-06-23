import { describe, expect, it } from 'vitest';
import { SquadRole, type CareerConfig } from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import { computeMarketValue, smoothMarketValue } from './market-value';
import {
  isExpiringSoon,
  recommendContractTerms,
  recommendSquadRole,
  weeksUntilExpiry,
} from './contract';
import {
  generateTransferOffers,
  type TransferClub,
  type TransferPlayer,
} from './transfer-ai';
import { computeStartingScore, decideSelection } from './selection';

const config: CareerConfig = {
  marketValue: {
    baseScale: 1500,
    abilityFloor: 20,
    abilityExponent: 2,
    smoothing: 0.75,
    potentialWeight: 3,
    ageCoefficients: [
      { maxAge: 18, coefficient: 1.05 },
      { maxAge: 21, coefficient: 1.1 },
      { maxAge: 24, coefficient: 1.0 },
      { maxAge: 27, coefficient: 0.95 },
      { maxAge: 30, coefficient: 0.7 },
      { maxAge: 33, coefficient: 0.4 },
      { maxAge: 200, coefficient: 0.18 },
    ],
    leagueReferenceReputation: 3000,
  },
  wage: {
    base: 200,
    scale: 1.2,
    abilityFloor: 20,
    abilityExponent: 2,
    clubReferenceReputation: 3000,
    roleMultipliers: {
      KEY: 1.3,
      FIRST_TEAM: 1.0,
      ROTATION: 0.7,
      BACKUP: 0.5,
      PROSPECT: 0.35,
    },
  },
  contract: {
    defaultYears: 3,
    signingBonusWeeks: 20,
    appearanceBonusFactor: 0.1,
    goalBonusFactor: 0.5,
    renewalExpiryWeeks: 52,
  },
  transfer: {
    interestWeights: {
      roleNeed: 0.23,
      quality: 0.2,
      tacticalFit: 0.16,
      valueForMoney: 0.14,
      reputation: 0.1,
      potential: 0.08,
      agentNetwork: 0.05,
      noise: 0.04,
    },
    minInterest: 52,
    maxOffers: 4,
    feeNoise: 0.18,
    defaultRoleNeed: 60,
    defaultTacticalFit: 68,
    agentNetwork: 55,
  },
  selection: {
    weights: {
      ability: 0.28,
      form: 0.21,
      condition: 0.14,
      tacticalFit: 0.13,
      coachRelationship: 0.12,
      contractImportance: 0.07,
      noise: 0.05,
    },
    defaultTacticalFit: 70,
  },
};

describe('market value', () => {
  it('values a strong young player higher than an older equal-ability one', () => {
    const young = computeMarketValue(
      {
        currentAbility: 80,
        potentialAbility: 88,
        age: 22,
        form: 50,
        reputation: 2000,
        contractYearsRemaining: 4,
        leagueReputation: 3000,
      },
      config,
    );
    const old = computeMarketValue(
      {
        currentAbility: 80,
        potentialAbility: 80,
        age: 33,
        form: 50,
        reputation: 2000,
        contractYearsRemaining: 1,
        leagueReputation: 3000,
      },
      config,
    );
    expect(young).toBeGreaterThan(old);
    expect(young).toBeGreaterThan(0);
  });

  it('increases with ability', () => {
    const base = {
      potentialAbility: 80,
      age: 25,
      form: 50,
      reputation: 1500,
      contractYearsRemaining: 3,
      leagueReputation: 3000,
    };
    const low = computeMarketValue(
      { ...base, currentAbility: 55, potentialAbility: 60 },
      config,
    );
    const high = computeMarketValue(
      { ...base, currentAbility: 85, potentialAbility: 90 },
      config,
    );
    expect(high).toBeGreaterThan(low * 2);
  });

  it('smooths toward the previous value', () => {
    expect(smoothMarketValue(0, 1_000_000, config)).toBe(1_000_000);
    expect(smoothMarketValue(1_000_000, 2_000_000, config)).toBe(1_250_000);
  });
});

describe('contracts', () => {
  it('recommends higher wages for better players at bigger clubs', () => {
    const star = recommendContractTerms(
      { currentAbility: 85, age: 26, clubReputation: 6000, clubStrength: 70 },
      config,
    );
    const squadFiller = recommendContractTerms(
      { currentAbility: 45, age: 24, clubReputation: 1200, clubStrength: 55 },
      config,
    );
    expect(star.weeklyWage).toBeGreaterThan(squadFiller.weeklyWage);
    expect(star.signingBonus).toBeGreaterThan(0);
  });

  it('assigns squad roles by ability relative to club strength', () => {
    expect(recommendSquadRole(80, 60, 25)).toBe(SquadRole.Key);
    expect(recommendSquadRole(58, 60, 25)).toBe(SquadRole.FirstTeam);
    expect(recommendSquadRole(52, 60, 25)).toBe(SquadRole.Rotation);
    expect(recommendSquadRole(40, 60, 18)).toBe(SquadRole.Prospect);
    expect(recommendSquadRole(40, 60, 28)).toBe(SquadRole.Backup);
  });

  it('detects contracts expiring within the renewal window', () => {
    const now = new Date('2025-01-01T00:00:00Z');
    const soon = new Date('2025-06-01T00:00:00Z');
    const far = new Date('2027-01-01T00:00:00Z');
    expect(weeksUntilExpiry(soon, now)).toBeLessThan(52);
    expect(isExpiringSoon(soon, now, config)).toBe(true);
    expect(isExpiringSoon(far, now, config)).toBe(false);
  });
});

describe('transfer AI', () => {
  const player: TransferPlayer = {
    currentAbility: 72,
    potentialAbility: 82,
    reputation: 2500,
    age: 23,
    marketValue: 8_000_000,
  };
  const clubs: TransferClub[] = [
    {
      clubId: 'rich-fit',
      reputation: 5000,
      strength: 72,
      transferBudget: 40_000_000,
    },
    {
      clubId: 'rich-mismatch',
      reputation: 4800,
      strength: 50,
      transferBudget: 40_000_000,
    },
    {
      clubId: 'broke',
      reputation: 5200,
      strength: 73,
      transferBudget: 1_000_000,
    },
  ];

  it('only offers from clubs that can afford the fee', () => {
    const offers = generateTransferOffers(
      player,
      clubs,
      null,
      config,
      createRandomSource('t1'),
    );
    expect(offers.some((o) => o.clubId === 'broke')).toBe(false);
    for (const offer of offers) {
      expect(offer.fee).toBeLessThanOrEqual(40_000_000);
      expect(offer.fee).toBeGreaterThan(0);
    }
  });

  it('excludes the current club and caps the number of offers', () => {
    const many: TransferClub[] = Array.from({ length: 10 }, (_, i) => ({
      clubId: `club-${i}`,
      reputation: 4500,
      strength: 71,
      transferBudget: 50_000_000,
    }));
    const offers = generateTransferOffers(
      player,
      many,
      'club-0',
      config,
      createRandomSource('t2'),
    );
    expect(offers.length).toBeLessThanOrEqual(config.transfer.maxOffers);
    expect(offers.some((o) => o.clubId === 'club-0')).toBe(false);
  });

  it('is deterministic for the same seed', () => {
    const a = generateTransferOffers(
      player,
      clubs,
      null,
      config,
      createRandomSource('seed'),
    );
    const b = generateTransferOffers(
      player,
      clubs,
      null,
      config,
      createRandomSource('seed'),
    );
    expect(a).toEqual(b);
  });
});

describe('selection AI (starting)', () => {
  const rng = createRandomSource('sel');

  it('starts a clearly stronger player and benches a weaker one', () => {
    const strong = computeStartingScore(
      {
        currentAbility: 85,
        form: 70,
        condition: 95,
        coachRelationship: 40,
        contractImportance: 90,
      },
      config,
      rng,
    );
    const competitors = [40, 45, 50].map((ability) =>
      computeStartingScore(
        {
          currentAbility: ability,
          form: 45,
          condition: 90,
          coachRelationship: 0,
          contractImportance: 40,
        },
        config,
        rng,
      ),
    );
    expect(decideSelection(strong, competitors, 1, 1).starter).toBe(true);

    const weak = computeStartingScore(
      {
        currentAbility: 35,
        form: 40,
        condition: 80,
        coachRelationship: -20,
        contractImportance: 25,
      },
      config,
      rng,
    );
    const strongCompetitors = [80, 82, 84].map((ability) =>
      computeStartingScore(
        {
          currentAbility: ability,
          form: 65,
          condition: 95,
          coachRelationship: 30,
          contractImportance: 85,
        },
        config,
        rng,
      ),
    );
    const decision = decideSelection(weak, strongCompetitors, 1, 1);
    expect(decision.starter).toBe(false);
    expect(decision.expectedMinutes).toBe(0);
  });
});

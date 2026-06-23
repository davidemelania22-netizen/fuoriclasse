import type { CareerConfig } from '@football-life/shared';

/** Default, validated career / contract / transfer parameters. */
export const DEFAULT_CAREER_CONFIG: CareerConfig = {
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

import type { ProgressionConfig } from '@football-life/shared';

/** Default, validated growth / training / recovery / decay parameters. */
export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  growthWeights: {
    trainingQuality: 0.22,
    staffQuality: 0.12,
    professionalism: 0.18,
    determination: 0.12,
    potentialResidual: 0.2,
    motivation: 0.08,
    usefulMinutes: 0.08,
  },
  growthScale: 0.004,
  ageGrowthBands: [
    { maxAge: 16, multiplier: 1.35 },
    { maxAge: 19, multiplier: 1.2 },
    { maxAge: 22, multiplier: 1.05 },
    { maxAge: 26, multiplier: 0.65 },
    { maxAge: 29, multiplier: 0.3 },
    { maxAge: 200, multiplier: 0.1 },
  ],
  intensity: {
    REST: { growthMultiplier: 0.2, fatigue: 0 },
    LIGHT: { growthMultiplier: 0.7, fatigue: 5 },
    NORMAL: { growthMultiplier: 1.0, fatigue: 10 },
    INTENSE: { growthMultiplier: 1.25, fatigue: 18 },
  },
  recovery: {
    // Deliberately below a matchday's cost: a week must not be able to wipe
    // out ninety minutes, or fatigue never carries into the next game and
    // condition is 100 every Sunday — which is exactly what used to happen.
    base: 8,
    physicalRecoveryFactor: 0.12,
    medicalFactor: 0.1,
    agePenaltyStart: 30,
    agePenaltyPerYear: 0.6,
    sheddingRate: 0.25,
  },
  decay: {
    startAge: 30,
    basePerYear: 1.4,
    attributeMultipliers: {
      acceleration: 1.0,
      pace: 1.0,
      agility: 0.8,
      stamina: 0.7,
      jumping: 0.6,
      balance: 0.5,
      strength: 0.4,
      coordination: 0.4,
      physicalRecovery: 0.9,
    },
    defaultMultiplier: 0.1,
    mentalGrowthPerYear: 0.5,
    mentalGrowthStartAge: 24,
  },
  defaultClubQuality: {
    training: 45,
    staff: 45,
    medical: 45,
  },
};

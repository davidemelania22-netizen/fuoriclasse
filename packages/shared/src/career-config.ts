import { z } from 'zod';

const ageCoefficientSchema = z.object({
  maxAge: z.number().int(),
  coefficient: z.number().min(0),
});

export const careerConfigSchema = z.object({
  marketValue: z.object({
    baseScale: z.number().positive(),
    abilityFloor: z.number(),
    abilityExponent: z.number().positive(),
    smoothing: z.number().min(0).max(1),
    potentialWeight: z.number().min(0),
    ageCoefficients: z.array(ageCoefficientSchema).min(1),
    leagueReferenceReputation: z.number().positive(),
  }),
  wage: z.object({
    base: z.number().min(0),
    scale: z.number().positive(),
    abilityFloor: z.number(),
    abilityExponent: z.number().positive(),
    clubReferenceReputation: z.number().positive(),
    roleMultipliers: z.record(z.string(), z.number()),
  }),
  contract: z.object({
    defaultYears: z.number().int().positive(),
    signingBonusWeeks: z.number().min(0),
    appearanceBonusFactor: z.number().min(0),
    goalBonusFactor: z.number().min(0),
    renewalExpiryWeeks: z.number().int().positive(),
  }),
  transfer: z.object({
    interestWeights: z.object({
      roleNeed: z.number(),
      quality: z.number(),
      tacticalFit: z.number(),
      valueForMoney: z.number(),
      reputation: z.number(),
      potential: z.number(),
      agentNetwork: z.number(),
      noise: z.number(),
    }),
    minInterest: z.number(),
    maxOffers: z.number().int().positive(),
    feeNoise: z.number().min(0),
    defaultRoleNeed: z.number(),
    defaultTacticalFit: z.number(),
    agentNetwork: z.number(),
  }),
  selection: z.object({
    weights: z.object({
      ability: z.number(),
      form: z.number(),
      condition: z.number(),
      tacticalFit: z.number(),
      coachRelationship: z.number(),
      contractImportance: z.number(),
      noise: z.number(),
    }),
    defaultTacticalFit: z.number(),
  }),
});

export type CareerConfig = z.infer<typeof careerConfigSchema>;

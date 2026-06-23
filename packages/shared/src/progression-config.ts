import { z } from 'zod';

export const TrainingIntensity = {
  Rest: 'REST',
  Light: 'LIGHT',
  Normal: 'NORMAL',
  Intense: 'INTENSE',
} as const;
export type TrainingIntensity =
  (typeof TrainingIntensity)[keyof typeof TrainingIntensity];

const ageBandSchema = z.object({
  /** Applies to players whose age is <= maxAge (bands evaluated in order). */
  maxAge: z.number().int(),
  multiplier: z.number().min(0),
});

const intensityEntrySchema = z.object({
  growthMultiplier: z.number().min(0),
  /** Weekly fatigue load added by this intensity (can be negative for rest). */
  fatigue: z.number(),
});

export const progressionConfigSchema = z.object({
  growthWeights: z.object({
    trainingQuality: z.number(),
    staffQuality: z.number(),
    professionalism: z.number(),
    determination: z.number(),
    potentialResidual: z.number(),
    motivation: z.number(),
    usefulMinutes: z.number(),
  }),
  growthScale: z.number().positive(),
  ageGrowthBands: z.array(ageBandSchema).min(1),
  intensity: z.record(z.string(), intensityEntrySchema),
  recovery: z.object({
    base: z.number(),
    physicalRecoveryFactor: z.number(),
    medicalFactor: z.number(),
    agePenaltyStart: z.number().int(),
    agePenaltyPerYear: z.number(),
  }),
  decay: z.object({
    startAge: z.number().int(),
    basePerYear: z.number(),
    attributeMultipliers: z.record(z.string(), z.number()),
    defaultMultiplier: z.number(),
    mentalGrowthPerYear: z.number(),
    mentalGrowthStartAge: z.number().int(),
  }),
  defaultClubQuality: z.object({
    training: z.number(),
    staff: z.number(),
    medical: z.number(),
  }),
});

export type ProgressionConfig = z.infer<typeof progressionConfigSchema>;

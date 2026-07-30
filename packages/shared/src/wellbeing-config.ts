import { z } from 'zod';

const severityBandSchema = z.object({
  severity: z.number().int().min(1),
  weight: z.number().min(0),
  minWeeks: z.number().int().min(1),
  maxWeeks: z.number().int().min(1),
});

export const wellbeingConfigSchema = z.object({
  injury: z.object({
    riskWeights: z.object({
      proneness: z.number(),
      fatigue: z.number(),
      recentLoad: z.number(),
      age: z.number(),
      history: z.number(),
      intensity: z.number(),
      pitch: z.number(),
      medicalInverse: z.number(),
      noise: z.number(),
    }),
    weeklyBaseProbability: z.number().min(0),
    maxWeeklyProbability: z.number().min(0).max(1),
    pitchQuality: z.number(),
    intensityRisk: z.record(z.string(), z.number()),
    severityBands: z.array(severityBandSchema).min(1),
    recurrenceBase: z.number().min(0),
    attributeImpactPerSeverity: z.number().min(0),
    recurrenceWindowWeeks: z.number().int().min(0),
    rushDurationFactor: z.number().min(0).max(1),
    rushRecurrencePenalty: z.number().min(0),
  }),
  morale: z.object({
    baseline: z.number(),
    regression: z.number().min(0).max(1),
    injuryPenalty: z.number().min(0),
    stressThreshold: z.number(),
    highStressPenalty: z.number().min(0),
  }),
  stress: z.object({
    baseline: z.number(),
    decay: z.number().min(0),
    injuryStress: z.number().min(0),
    intensityStress: z.record(z.string(), z.number()),
  }),
  mentalHealth: z.object({
    stressInfluence: z.number().min(0).max(1),
    recovery: z.number().min(0).max(1),
  }),
  relationship: z.object({
    positiveInteractionGain: z.number(),
    conflictGain: z.number(),
    decay: z.number().min(0),
    supportMoraleFactor: z.number(),
  }),
});

export type WellbeingConfig = z.infer<typeof wellbeingConfigSchema>;

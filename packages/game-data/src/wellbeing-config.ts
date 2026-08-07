import type { WellbeingConfig } from '@football-life/shared';

/** Catalogo infortuni license-free (etichette; la gravità è estratta per evento). */
export const INJURY_TYPES = [
  { key: 'hamstring', name: 'Stiramento al flessore', bodyArea: 'coscia' },
  {
    key: 'ankle-sprain',
    name: 'Distorsione alla caviglia',
    bodyArea: 'caviglia',
  },
  {
    key: 'knee-ligament',
    name: 'Lesione ai legamenti del ginocchio',
    bodyArea: 'ginocchio',
  },
  {
    key: 'calf-strain',
    name: 'Stiramento al polpaccio',
    bodyArea: 'polpaccio',
  },
  { key: 'groin', name: 'Stiramento all’inguine', bodyArea: 'inguine' },
  { key: 'bruise', name: 'Contusione profonda', bodyArea: 'gamba' },
  { key: 'concussion', name: 'Commozione cerebrale', bodyArea: 'testa' },
  { key: 'shoulder', name: 'Infortunio alla spalla', bodyArea: 'spalla' },
  { key: 'foot-fracture', name: 'Frattura al piede', bodyArea: 'piede' },
  { key: 'back-strain', name: 'Stiramento alla schiena', bodyArea: 'schiena' },
] as const;

export type InjuryTypeKey = (typeof INJURY_TYPES)[number]['key'];

/** Default, validated injury / morale / stress / relationship parameters. */
export const DEFAULT_WELLBEING_CONFIG: WellbeingConfig = {
  injury: {
    riskWeights: {
      proneness: 0.22,
      fatigue: 0.2,
      recentLoad: 0.15,
      age: 0.1,
      history: 0.12,
      intensity: 0.08,
      pitch: 0.05,
      medicalInverse: 0.04,
      noise: 0.04,
    },
    weeklyBaseProbability: 0.045,
    maxWeeklyProbability: 0.12,
    pitchQuality: 70,
    intensityRisk: { REST: 10, LIGHT: 30, NORMAL: 50, INTENSE: 80 },
    severityBands: [
      { severity: 1, weight: 46, minWeeks: 1, maxWeeks: 2 },
      { severity: 2, weight: 30, minWeeks: 2, maxWeeks: 4 },
      { severity: 3, weight: 15, minWeeks: 4, maxWeeks: 8 },
      { severity: 4, weight: 7, minWeeks: 8, maxWeeks: 16 },
      { severity: 5, weight: 2, minWeeks: 16, maxWeeks: 32 },
    ],
    recurrenceBase: 0.08,
    attributeImpactPerSeverity: 0.4,
    recurrenceWindowWeeks: 6,
    rushDurationFactor: 0.55,
    rushRecurrencePenalty: 0.18,
  },
  morale: {
    baseline: 60,
    // Strong enough that a spell out of the side is a slump, not a one-way
    // trip to zero: an unhappy reserve settles around 30, and recovers.
    regression: 0.12,
    injuryPenalty: 5,
    stressThreshold: 70,
    highStressPenalty: 3,
  },
  stress: {
    baseline: 20,
    decay: 3,
    injuryStress: 4,
    intensityStress: { REST: -2, LIGHT: 0, NORMAL: 1, INTENSE: 4 },
    // Training flat out settles around 80: above the threshold, so it costs
    // morale for as long as you keep it up, but it stops there instead of
    // pinning at a hundred forever.
    sheddingRate: 0.0125,
  },
  mentalHealth: {
    stressInfluence: 0.6,
    recovery: 0.2,
  },
  relationship: {
    positiveInteractionGain: 8,
    conflictGain: 12,
    decay: 1,
    supportMoraleFactor: 0.05,
  },
};

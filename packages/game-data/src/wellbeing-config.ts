import type { WellbeingConfig } from '@football-life/shared';

/** License-free injury catalogue (labels only; severity is rolled per event). */
export const INJURY_TYPES = [
  { key: 'hamstring', name: 'Hamstring strain', bodyArea: 'thigh' },
  { key: 'ankle-sprain', name: 'Ankle sprain', bodyArea: 'ankle' },
  { key: 'knee-ligament', name: 'Knee ligament', bodyArea: 'knee' },
  { key: 'calf-strain', name: 'Calf strain', bodyArea: 'calf' },
  { key: 'groin', name: 'Groin strain', bodyArea: 'groin' },
  { key: 'bruise', name: 'Deep bruise', bodyArea: 'leg' },
  { key: 'concussion', name: 'Concussion', bodyArea: 'head' },
  { key: 'shoulder', name: 'Shoulder injury', bodyArea: 'shoulder' },
  { key: 'foot-fracture', name: 'Foot fracture', bodyArea: 'foot' },
  { key: 'back-strain', name: 'Back strain', bodyArea: 'back' },
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
  },
  morale: {
    baseline: 60,
    regression: 0.06,
    injuryPenalty: 5,
    stressThreshold: 70,
    highStressPenalty: 3,
  },
  stress: {
    baseline: 20,
    decay: 3,
    injuryStress: 4,
    intensityStress: { REST: -2, LIGHT: 0, NORMAL: 1, INTENSE: 4 },
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

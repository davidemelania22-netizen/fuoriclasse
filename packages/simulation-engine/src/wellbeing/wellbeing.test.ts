import { describe, expect, it } from 'vitest';
import { TrainingIntensity, type WellbeingConfig } from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import {
  applyTreatmentChoice,
  computeInjuryRisk,
  injuryProbability,
  recoverInjuryWeek,
  rollInjury,
  rollRelapseInjury,
  type InjuryRiskInput,
} from './injury-system';
import {
  updateMentalHealth,
  updateMorale,
  updateStress,
} from './morale-system';
import {
  applyRelationshipInteraction,
  relationshipMoraleModifier,
  type RelationshipState,
} from './relationship-system';

const config: WellbeingConfig = {
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
  mentalHealth: { stressInfluence: 0.6, recovery: 0.2 },
  relationship: {
    positiveInteractionGain: 8,
    conflictGain: 12,
    decay: 1,
    supportMoraleFactor: 0.05,
  },
};

const injuryTypes = ['hamstring', 'ankle-sprain', 'knee-ligament'];

const midRisk: InjuryRiskInput = {
  injuryProneness: 40,
  fatigue: 40,
  recentLoad: 40,
  age: 25,
  injuryHistoryCount: 0,
  intensity: TrainingIntensity.Normal,
  medicalQuality: 50,
};

describe('injury system', () => {
  it('keeps weekly injury frequency in a realistic band', () => {
    const rng = createRandomSource('injury-freq');
    let injuries = 0;
    const weeks = 20000;
    for (let i = 0; i < weeks; i += 1) {
      if (rollInjury(midRisk, injuryTypes, config, rng)) injuries += 1;
    }
    const rate = injuries / weeks;
    expect(rate).toBeGreaterThan(0.005);
    expect(rate).toBeLessThan(0.04);
  });

  it('raises risk with fatigue and intense training', () => {
    const calm = computeInjuryRisk(
      { ...midRisk, fatigue: 10, intensity: TrainingIntensity.Rest },
      config,
      0,
    );
    const heavy = computeInjuryRisk(
      { ...midRisk, fatigue: 95, intensity: TrainingIntensity.Intense },
      config,
      0,
    );
    expect(heavy).toBeGreaterThan(calm);
    expect(injuryProbability(heavy, config)).toBeGreaterThan(
      injuryProbability(calm, config),
    );
  });

  it('mostly produces minor injuries', () => {
    const rng = createRandomSource('severity');
    const severities: number[] = [];
    while (severities.length < 1500) {
      const injury = rollInjury(
        { ...midRisk, injuryProneness: 90, fatigue: 95 },
        injuryTypes,
        config,
        rng,
      );
      if (injury) severities.push(injury.severity);
    }
    const minor = severities.filter((s) => s <= 2).length / severities.length;
    expect(minor).toBeGreaterThan(0.6);
  });

  it('recovers an injury after exactly its duration', () => {
    let remaining = 4;
    const healedAt: number[] = [];
    for (let week = 1; week <= 4; week += 1) {
      const step = recoverInjuryWeek(remaining);
      remaining = step.weeksRemaining;
      if (step.healed) healedAt.push(week);
    }
    expect(healedAt).toEqual([4]);
  });

  it('is deterministic for the same seed', () => {
    const a = rollInjury(midRisk, injuryTypes, config, createRandomSource('x'));
    const b = rollInjury(midRisk, injuryTypes, config, createRandomSource('x'));
    expect(a).toEqual(b);
  });
});

describe('injury treatment choice', () => {
  it('leaves duration and recurrence risk untouched on REST', () => {
    const effect = applyTreatmentChoice(
      { weeksRemaining: 6, recurrenceRisk: 0.1 },
      'REST',
      config,
    );
    expect(effect).toEqual({ weeksRemaining: 6, recurrenceRisk: 0.1 });
  });

  it('shortens duration but raises recurrence risk on RUSH', () => {
    const effect = applyTreatmentChoice(
      { weeksRemaining: 10, recurrenceRisk: 0.1 },
      'RUSH',
      config,
    );
    expect(effect.weeksRemaining).toBeLessThan(10);
    expect(effect.weeksRemaining).toBeGreaterThanOrEqual(1);
    expect(effect.recurrenceRisk).toBeCloseTo(0.28);
  });

  it('never rushes an injury down to zero weeks', () => {
    const effect = applyTreatmentChoice(
      { weeksRemaining: 1, recurrenceRisk: 0.1 },
      'RUSH',
      config,
    );
    expect(effect.weeksRemaining).toBeGreaterThanOrEqual(1);
  });

  it('never makes recovery longer, even when almost already healed', () => {
    const effect = applyTreatmentChoice(
      { weeksRemaining: 0, recurrenceRisk: 0.1 },
      'RUSH',
      config,
    );
    expect(effect.weeksRemaining).toBeLessThanOrEqual(0);
  });
});

describe('injury relapse', () => {
  it('never relapses outside the vulnerability window', () => {
    const rng = createRandomSource('relapse-window');
    const result = rollRelapseInjury(
      { typeKey: 'hamstring', recurrenceRisk: 1, weeksSinceHealed: 7 },
      config,
      rng,
    );
    expect(result).toBeNull();
  });

  it('relapses with high frequency at high recurrence risk inside the window', () => {
    const rng = createRandomSource('relapse-frequency');
    let relapses = 0;
    const attempts = 2000;
    for (let i = 0; i < attempts; i += 1) {
      const result = rollRelapseInjury(
        { typeKey: 'hamstring', recurrenceRisk: 0.9, weeksSinceHealed: 1 },
        config,
        rng,
      );
      if (result) relapses += 1;
    }
    expect(relapses / attempts).toBeGreaterThan(0.7);
  });

  it('reuses the same injury type on relapse', () => {
    const rng = createRandomSource('relapse-type');
    let found = false;
    for (let i = 0; i < 200 && !found; i += 1) {
      const result = rollRelapseInjury(
        { typeKey: 'knee-ligament', recurrenceRisk: 0.9, weeksSinceHealed: 1 },
        config,
        rng,
      );
      if (result) {
        expect(result.typeKey).toBe('knee-ligament');
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});

describe('morale, stress and mental health', () => {
  it('lowers morale when injured or highly stressed, clamped to [0, 100]', () => {
    const healthy = updateMorale(
      { morale: 60, injured: false, stress: 20 },
      config,
    );
    const injured = updateMorale(
      { morale: 60, injured: true, stress: 85 },
      config,
    );
    expect(injured).toBeLessThan(healthy);
    expect(
      updateMorale({ morale: 0, injured: true, stress: 90 }, config),
    ).toBeGreaterThanOrEqual(0);
    expect(
      updateMorale({ morale: 100, injured: false, stress: 0 }, config),
    ).toBeLessThanOrEqual(100);
  });

  it('drifts morale toward the baseline', () => {
    const low = updateMorale(
      { morale: 20, injured: false, stress: 20 },
      config,
    );
    const high = updateMorale(
      { morale: 95, injured: false, stress: 20 },
      config,
    );
    expect(low).toBeGreaterThan(20);
    expect(high).toBeLessThan(95);
  });

  it('raises stress with intensity and injury, lowers it at rest', () => {
    const intense = updateStress(
      { stress: 30, injured: false, intensity: TrainingIntensity.Intense },
      config,
    );
    const resting = updateStress(
      { stress: 30, injured: false, intensity: TrainingIntensity.Rest },
      config,
    );
    const injuredStress = updateStress(
      { stress: 30, injured: true, intensity: TrainingIntensity.Normal },
      config,
    );
    expect(intense).toBeGreaterThan(resting);
    expect(injuredStress).toBeGreaterThan(
      updateStress(
        { stress: 30, injured: false, intensity: TrainingIntensity.Normal },
        config,
      ),
    );
    expect(
      updateStress(
        { stress: 100, injured: true, intensity: TrainingIntensity.Intense },
        config,
      ),
    ).toBeLessThanOrEqual(100);
  });

  it('drives mental health down under sustained stress', () => {
    const stressed = updateMentalHealth(80, 90, config);
    const calm = updateMentalHealth(80, 10, config);
    expect(stressed).toBeLessThan(calm);
  });
});

describe('relationship system', () => {
  it('improves a relationship on positive interaction', () => {
    const base: RelationshipState = {
      affinity: 40,
      trust: 40,
      conflict: 20,
      influence: 30,
    };
    const after = applyRelationshipInteraction(base, 'POSITIVE', config);
    expect(after.affinity).toBeGreaterThan(base.affinity);
    expect(after.trust).toBeGreaterThan(base.trust);
    expect(after.conflict).toBeLessThanOrEqual(base.conflict);
  });

  it('damages a relationship on conflict, clamped to bounds', () => {
    const base: RelationshipState = {
      affinity: -98,
      trust: 5,
      conflict: 95,
      influence: 30,
    };
    const after = applyRelationshipInteraction(base, 'CONFLICT', config);
    expect(after.affinity).toBeGreaterThanOrEqual(-100);
    expect(after.conflict).toBeLessThanOrEqual(100);
    expect(after.trust).toBeGreaterThanOrEqual(0);
  });

  it('translates strong relationships into a morale boost', () => {
    const good = relationshipMoraleModifier(
      [{ affinity: 80, trust: 70, conflict: 5, influence: 50 }],
      config,
    );
    const bad = relationshipMoraleModifier(
      [{ affinity: -60, trust: 20, conflict: 70, influence: 50 }],
      config,
    );
    expect(good).toBeGreaterThan(0);
    expect(bad).toBeLessThan(0);
  });
});

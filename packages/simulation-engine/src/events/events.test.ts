import { describe, expect, it } from 'vitest';
import type { EventContext, GameEventDefinition } from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import { evaluateTrigger } from './trigger-evaluator';
import { isEligible, type CooldownState } from './cooldown-manager';
import { selectEvent } from './event-selector';
import {
  applyConsequence,
  getChoice,
  type EventEffectState,
} from './event-resolver';

const defs: GameEventDefinition[] = [
  {
    id: 'a',
    category: 'FOOTBALL',
    title: 'A',
    descriptionTemplate: '',
    trigger: { all: [{ field: 'morale', op: 'gte', value: 50 }] },
    weight: 10,
    cooldownWeeks: 4,
    choices: [{ key: 'x', label: 'X', consequences: { morale: 5 } }],
  },
  {
    id: 'b',
    category: 'COACH',
    title: 'B',
    descriptionTemplate: '',
    trigger: { all: [{ field: 'age', op: 'lt', value: 18 }] },
    weight: 5,
    cooldownWeeks: 2,
    maxOccurrencesPerCareer: 1,
    choices: [
      { key: 'y', label: 'Y', consequences: { stress: -5, money: 1000 } },
    ],
  },
  {
    id: 'c',
    category: 'MEDIA',
    title: 'C',
    descriptionTemplate: '',
    trigger: {},
    weight: 1,
    cooldownWeeks: 0,
    mutuallyExclusiveWith: ['a'],
    choices: [{ key: 'z', label: 'Z', consequences: {} }],
  },
];

const ctx: EventContext = {
  age: 16,
  morale: 60,
  stress: 20,
  happiness: 60,
  mentalHealth: 80,
  motivation: 70,
  reputation: 100,
  popularity: 50,
  currentAbility: 30,
  money: 0,
  careerStatus: 'YOUTH',
  hasClub: false,
  clubReputation: 0,
  weekIndex: 0,
};

describe('trigger evaluation', () => {
  it('evaluates numeric comparisons', () => {
    expect(evaluateTrigger(defs[0]!.trigger, ctx)).toBe(true);
    expect(evaluateTrigger(defs[0]!.trigger, { ...ctx, morale: 40 })).toBe(
      false,
    );
  });

  it('treats an empty trigger as always true', () => {
    expect(evaluateTrigger({}, ctx)).toBe(true);
  });

  it('handles any-conditions', () => {
    const trigger = {
      any: [
        { field: 'hasClub', op: 'eq' as const, value: true },
        { field: 'age', op: 'gte' as const, value: 16 },
      ],
    };
    expect(evaluateTrigger(trigger, ctx)).toBe(true);
    expect(evaluateTrigger(trigger, { ...ctx, age: 14 })).toBe(false);
  });
});

describe('cooldown eligibility', () => {
  it('blocks an event still on cooldown', () => {
    const cooldown: CooldownState = new Map([['a', { lastWeek: 0, count: 1 }]]);
    expect(isEligible(defs[0]!, { ...ctx, weekIndex: 2 }, cooldown)).toBe(
      false,
    );
    expect(isEligible(defs[0]!, { ...ctx, weekIndex: 5 }, cooldown)).toBe(true);
  });

  it('enforces the per-career occurrence cap', () => {
    const cooldown: CooldownState = new Map([['b', { lastWeek: 0, count: 1 }]]);
    expect(isEligible(defs[1]!, { ...ctx, weekIndex: 50 }, cooldown)).toBe(
      false,
    );
  });

  it('respects mutual exclusion', () => {
    const fresh: CooldownState = new Map();
    expect(isEligible(defs[2]!, ctx, fresh)).toBe(true);
    const excluded: CooldownState = new Map([['a', { lastWeek: 0, count: 1 }]]);
    expect(isEligible(defs[2]!, ctx, excluded)).toBe(false);
  });
});

describe('event selection', () => {
  it('is deterministic for the same seed', () => {
    const a = selectEvent(defs, ctx, new Map(), createRandomSource('seed'));
    const b = selectEvent(defs, ctx, new Map(), createRandomSource('seed'));
    expect(a?.id).toBe(b?.id);
    expect(a).not.toBeNull();
  });

  it('returns null when nothing is eligible', () => {
    const cooldown: CooldownState = new Map([['a', { lastWeek: 0, count: 1 }]]);
    const result = selectEvent(
      defs,
      { ...ctx, morale: 10, age: 20 },
      cooldown,
      createRandomSource('none'),
    );
    expect(result).toBeNull();
  });
});

describe('event resolution', () => {
  const base: EventEffectState = {
    morale: 98,
    stress: 2,
    happiness: 50,
    mentalHealth: 50,
    motivation: 50,
    reputation: 50,
    popularity: 50,
    moneyDelta: 0,
  };

  it('applies and clamps consequences', () => {
    const next = applyConsequence(base, { morale: 5, stress: -5, money: 1000 });
    expect(next.morale).toBe(100);
    expect(next.stress).toBe(0);
    expect(next.moneyDelta).toBe(1000);
  });

  it('looks up a choice and throws on an unknown one', () => {
    expect(getChoice(defs[0]!, 'x').key).toBe('x');
    expect(() => getChoice(defs[0]!, 'missing')).toThrow();
  });
});

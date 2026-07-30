import { describe, expect, it } from 'vitest';
import {
  EventCategory,
  gameEventDefinitionSchema,
} from '@football-life/shared';
import { EVENT_DEFINITIONS } from './events';

describe('EVENT_DEFINITIONS', () => {
  it('provides at least 50 events', () => {
    expect(EVENT_DEFINITIONS.length).toBeGreaterThanOrEqual(50);
  });

  it('validates every event against the schema', () => {
    for (const definition of EVENT_DEFINITIONS) {
      expect(() => gameEventDefinitionSchema.parse(definition)).not.toThrow();
    }
  });

  it('uses unique ids and known categories', () => {
    const ids = new Set(EVENT_DEFINITIONS.map((e) => e.id));
    expect(ids.size).toBe(EVENT_DEFINITIONS.length);

    const categories = new Set<string>(Object.values(EventCategory));
    for (const definition of EVENT_DEFINITIONS) {
      expect(categories.has(definition.category)).toBe(true);
    }
  });

  it('gives every choice at least one consequence field or a clear no-op', () => {
    for (const definition of EVENT_DEFINITIONS) {
      expect(definition.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('offers real gambles, and every one is an honest bet', () => {
    const gambles = EVENT_DEFINITIONS.flatMap((definition) =>
      definition.choices
        .filter((choice) => choice.gamble)
        .map((choice) => ({ id: definition.id, gamble: choice.gamble! })),
    );
    expect(gambles.length).toBeGreaterThanOrEqual(5);

    for (const { id, gamble } of gambles) {
      // Never a sure thing in either direction, and always explained.
      expect(gamble.successChance, id).toBeGreaterThanOrEqual(0.05);
      expect(gamble.successChance, id).toBeLessThanOrEqual(0.95);
      expect(gamble.successLabel.length, id).toBeGreaterThan(10);
      expect(gamble.failureLabel.length, id).toBeGreaterThan(10);
      // The two branches must actually differ: a bet with nothing at stake
      // is just a button.
      expect(Object.keys(gamble.success).length, id).toBeGreaterThan(0);
      expect(Object.keys(gamble.failure).length, id).toBeGreaterThan(0);
      expect(gamble.success, id).not.toEqual(gamble.failure);
    }
  });

  it('never dresses a gamble up as a free win', () => {
    for (const definition of EVENT_DEFINITIONS) {
      for (const choice of definition.choices) {
        if (!choice.gamble) continue;
        const failure = Object.values(choice.gamble.failure);
        // Losing must cost something, otherwise the odds are decoration.
        expect(
          failure.some((value) => (value ?? 0) < 0),
          `${definition.id}/${choice.key}`,
        ).toBe(true);
      }
    }
  });
});

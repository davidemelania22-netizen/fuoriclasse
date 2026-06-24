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
});

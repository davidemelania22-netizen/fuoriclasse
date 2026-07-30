import { describe, expect, it } from 'vitest';
import { shopItemSchema } from '@football-life/shared';
import { SHOP_ITEMS } from './shop';

const CATEGORIES = [
  'EQUIPMENT',
  'WELLNESS',
  'TRAINING',
  'MEDIA',
  'HOME',
  'FAMILY',
  'LIFESTYLE',
  'GADGET',
];

describe('SHOP_ITEMS', () => {
  it('validates every item against the schema', () => {
    for (const item of SHOP_ITEMS) {
      expect(() => shopItemSchema.parse(item)).not.toThrow();
    }
  });

  it('uses unique keys', () => {
    const keys = new Set(SHOP_ITEMS.map((i) => i.key));
    expect(keys.size).toBe(SHOP_ITEMS.length);
  });

  it('fills every category with something to buy', () => {
    for (const category of CATEGORIES) {
      const items = SHOP_ITEMS.filter((item) => item.category === category);
      expect(items.length, category).toBeGreaterThanOrEqual(3);
    }
    // No item sits in a category the shop does not know how to label.
    for (const item of SHOP_ITEMS) {
      expect(CATEGORIES, item.key).toContain(item.category);
    }
  });

  it('gives every item at least one effect worth paying for', () => {
    for (const item of SHOP_ITEMS) {
      const values = Object.values(item.effects).filter(
        (value): value is number => value !== undefined && value !== 0,
      );
      expect(values.length, item.key).toBeGreaterThan(0);
      // Something has to improve: an item that is all downside is a trap.
      const helps = values.some((value) => value > 0);
      expect(helps, item.key).toBe(true);
    }
  });

  it('keeps keys usable as filenames, since they name the artwork', () => {
    for (const item of SHOP_ITEMS) {
      expect(item.key, item.key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('spans a real price ladder, from pocket money to superstar', () => {
    const prices = SHOP_ITEMS.map((item) => item.price);
    // The €25k starting wallet must afford something on day one…
    expect(Math.min(...prices)).toBeLessThanOrEqual(2_000);
    // …and something must stay out of reach for a long time.
    expect(Math.max(...prices)).toBeGreaterThanOrEqual(200_000);
  });
});

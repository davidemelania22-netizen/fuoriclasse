// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SHOP_ITEMS } from '@football-life/game-data';
import { ShopArt } from './ShopArt';
import { CATEGORY_TINT, SHOP_GLYPHS } from './glyphs';

afterEach(cleanup);

describe('shop artwork', () => {
  it('has a drawing for every item in the catalogue', () => {
    const missing = SHOP_ITEMS.filter((item) => !SHOP_GLYPHS[item.key]);
    expect(missing.map((item) => item.key)).toEqual([]);
  });

  it('has no drawing left over for an item that no longer exists', () => {
    const keys = new Set(SHOP_ITEMS.map((item) => item.key));
    const orphans = Object.keys(SHOP_GLYPHS).filter((key) => !keys.has(key));
    expect(orphans).toEqual([]);
  });

  it('tints every category the catalogue actually uses', () => {
    for (const item of SHOP_ITEMS) {
      expect(CATEGORY_TINT[item.category], item.category).toBeTruthy();
    }
  });

  it('renders a labelled image so the shop stays readable to screen readers', () => {
    render(
      <ShopArt itemKey="custom-boots" category="EQUIPMENT" name="Scarpini" />,
    );
    expect(screen.getByRole('img', { name: 'Scarpini' })).toBeInTheDocument();
  });

  it('falls back to an initial instead of a hole for an unknown item', () => {
    render(<ShopArt itemKey="does-not-exist" category="NOPE" name="Zebra" />);
    const art = screen.getByRole('img', { name: 'Zebra' });
    expect(art).toBeInTheDocument();
    expect(art).toHaveTextContent('Z');
  });
});

import { CATEGORY_TINT, SHOP_GLYPHS } from './glyphs';

/**
 * Real photos for shop items, when they exist: any file dropped into
 * `src/assets/shop/` named after the item key (custom-boots.png, …) replaces
 * the drawn illustration with no code change. Collected at build time, so
 * there are no 404s for the items that have no photo.
 */
const customArt = import.meta.glob<string>(
  '../../assets/shop/*.{png,jpg,jpeg,webp}',
  { eager: true, query: '?url', import: 'default' },
);

const CUSTOM_BY_KEY = new Map<string, string>(
  Object.entries(customArt).map(([path, url]) => [
    path.replace(/^.*\/([^/]+)\.[^.]+$/, '$1'),
    url,
  ]),
);

/** True when this item is showing a supplied photo rather than a drawing. */
export const hasCustomArt = (itemKey: string): boolean =>
  CUSTOM_BY_KEY.has(itemKey);

interface ShopArtProps {
  itemKey: string;
  category: string;
  name: string;
}

export function ShopArt({ itemKey, category, name }: ShopArtProps) {
  const photo = CUSTOM_BY_KEY.get(itemKey);
  if (photo) {
    return <img className="shop-art" src={photo} alt={name} loading="lazy" />;
  }

  const glyph = SHOP_GLYPHS[itemKey];
  const tint = CATEGORY_TINT[category] ?? '#1d2740';
  return (
    <svg
      className="shop-art"
      viewBox="0 0 64 64"
      role="img"
      aria-label={name}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="12" fill={tint} />
      {glyph ?? (
        // No drawing for this key yet: a neutral placeholder rather than a hole.
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="#8fa0bd"
        >
          {name.slice(0, 1).toUpperCase()}
        </text>
      )}
    </svg>
  );
}

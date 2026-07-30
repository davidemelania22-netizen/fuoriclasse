import type { ReactNode } from 'react';

/**
 * Hand-drawn flat illustrations, one per shop item key, on a 64x64 grid.
 * Deliberately plain geometry: they have to read at 72px on a card, and they
 * are drawn as code so nothing external has to ship or load.
 *
 * Palette shared with the app: gold accent, blue, green, and two neutrals.
 */
export const GOLD = '#eab130';
export const BLUE = '#60a5fa';
export const GREEN = '#4ade80';
export const RED = '#f87171';
export const LIGHT = '#dbe3f0';
export const MID = '#8fa0bd';
export const DARK = '#26314a';

/** Per-category background tint, so a category reads as a family at a glance. */
export const CATEGORY_TINT: Record<string, string> = {
  EQUIPMENT: '#1d2740',
  WELLNESS: '#16302c',
  TRAINING: '#152a3f',
  MEDIA: '#2c2038',
  HOME: '#1e2a34',
  FAMILY: '#33241c',
  LIFESTYLE: '#332a16',
  GADGET: '#20283a',
};

// A few repeated primitives keep the glyphs consistent.
const Boot = ({ x = 0, y = 0, scale = 1, fill = GOLD }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path
      d="M10 30 h18 l10 8 h8 a4 4 0 0 1 4 4 v4 H10 z"
      fill={fill}
    />
    <rect x="12" y="47" width="34" height="3" rx="1.5" fill={DARK} />
    <circle cx="18" cy="52" r="2" fill={MID} />
    <circle cx="28" cy="52" r="2" fill={MID} />
    <circle cx="38" cy="52" r="2" fill={MID} />
  </g>
);

const House = ({ fill = LIGHT }: { fill?: string }) => (
  <>
    <path d="M32 14 L54 30 H10 z" fill={fill} />
    <rect x="16" y="30" width="32" height="20" fill={fill} opacity="0.75" />
  </>
);

const Heart = ({ x = 0, y = 0, s = 1, fill = RED }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M12 5 c-2.4 -2.6 -6.4 -2.6 -8.6 0 c-2.2 2.6 -1.8 6.4 0.8 8.6 L12 21 l7.8 -7.4 c2.6 -2.2 3 -6 0.8 -8.6 c-2.2 -2.6 -6.2 -2.6 -8.6 0 z"
    fill={fill}
  />
);

/** Every glyph is drawn inside a 64x64 box, background already painted. */
export const SHOP_GLYPHS: Record<string, ReactNode> = {
  // --------------------------------------------------------------- EQUIPMENT
  'shin-guards': (
    <>
      {/* A pair of tapered pads, straps across, as they come in the box. */}
      <path d="M14 12 h12 a4 4 0 0 1 4 4 v22 a10 10 0 0 1 -20 0 V16 a4 4 0 0 1 4 -4 z" fill={LIGHT} />
      <path d="M38 12 h12 a4 4 0 0 1 4 4 v22 a10 10 0 0 1 -20 0 V16 a4 4 0 0 1 4 -4 z" fill={LIGHT} />
      <path d="M20 14 v28 M44 14 v28" stroke={MID} strokeWidth="2" />
      <rect x="6" y="22" width="24" height="4" rx="2" fill={GOLD} />
      <rect x="34" y="22" width="24" height="4" rx="2" fill={GOLD} />
      <path d="M18 50 h28" stroke={MID} strokeWidth="3" opacity="0.5" />
    </>
  ),
  'compression-kit': (
    <>
      <path d="M24 12 h16 l10 8 -6 6 -2 -2 v28 H22 V24 l-2 2 -6 -6 z" fill={BLUE} />
      <path d="M26 30 h12 M26 38 h12 M26 46 h12" stroke={LIGHT} strokeWidth="1.6" opacity="0.7" />
    </>
  ),
  'custom-boots': (
    <>
      <Boot />
      <path d="M14 34 l14 -6 M16 40 l12 -5" stroke={DARK} strokeWidth="2" />
    </>
  ),
  'altitude-mask': (
    <>
      <path d="M18 20 h28 a8 8 0 0 1 8 8 v6 a10 10 0 0 1 -10 10 H20 a10 10 0 0 1 -10 -10 v-6 a8 8 0 0 1 8 -8 z" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <circle cx="32" cy="34" r="7" fill={MID} />
      <circle cx="32" cy="34" r="3" fill={GOLD} />
      <path d="M10 26 h-4 M58 26 h-4" stroke={LIGHT} strokeWidth="3" />
    </>
  ),
  'recovery-tech': (
    <>
      {/* A foam roller: the ridged cylinder is unmistakable recovery kit. */}
      <rect x="10" y="24" width="44" height="18" rx="9" fill={BLUE} />
      <ellipse cx="12" cy="33" rx="5" ry="9" fill={LIGHT} />
      <ellipse cx="52" cy="33" rx="5" ry="9" fill={LIGHT} opacity="0.55" />
      <path d="M22 26 v14 M30 26 v14 M38 26 v14 M46 26 v14" stroke={DARK} strokeWidth="2.4" opacity="0.8" />
      <path d="M14 50 h36" stroke={MID} strokeWidth="3" opacity="0.5" />
      <path d="M22 16 c0 -5 -4 -5 -3 -9 M32 14 c0 -5 -4 -5 -3 -9" stroke={GOLD} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
  'boot-collection': (
    <>
      {/* Three pairs on a rack, side by side so they stay countable. */}
      <Boot x={-2} y={-6} scale={0.42} fill={MID} />
      <Boot x={17} y={-6} scale={0.42} fill={BLUE} />
      <Boot x={36} y={-6} scale={0.42} fill={GOLD} />
      <path d="M6 34 h52" stroke={LIGHT} strokeWidth="3" />
      <Boot x={7} y={16} scale={0.42} fill={GOLD} />
      <Boot x={26} y={16} scale={0.42} fill={LIGHT} />
      <path d="M6 56 h52" stroke={LIGHT} strokeWidth="3" />
    </>
  ),

  // ---------------------------------------------------------------- WELLNESS
  nutritionist: (
    <>
      <circle cx="32" cy="32" r="20" fill={LIGHT} />
      <path d="M32 12 a20 20 0 0 1 20 20 h-20 z" fill={GREEN} />
      <path d="M32 32 h-20 a20 20 0 0 1 8 -16 z" fill={RED} opacity="0.85" />
      <circle cx="32" cy="32" r="4" fill={MID} />
    </>
  ),
  'sleep-clinic': (
    <>
      <path d="M40 12 a20 20 0 1 0 12 30 A22 22 0 0 1 40 12 z" fill={GOLD} />
      <text x="12" y="24" fontSize="12" fontWeight="700" fill={LIGHT}>
        z
      </text>
      <text x="20" y="16" fontSize="9" fontWeight="700" fill={MID}>
        z
      </text>
    </>
  ),
  'physio-session': (
    <>
      <rect x="8" y="34" width="48" height="8" rx="3" fill={LIGHT} />
      <path d="M14 42 v10 M50 42 v10" stroke={MID} strokeWidth="3" />
      <path d="M16 34 c8 -12 26 -14 34 -2" stroke={BLUE} strokeWidth="4" fill="none" />
      <circle cx="22" cy="24" r="5" fill={GOLD} />
    </>
  ),
  cryotherapy: (
    <>
      <path
        d="M32 8 v48 M12 20 l40 24 M52 20 l-40 24"
        stroke={BLUE}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M32 16 l-5 -5 M32 16 l5 -5 M32 48 l-5 5 M32 48 l5 5"
        stroke={LIGHT}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
  'yoga-retreat': (
    <>
      <circle cx="32" cy="18" r="7" fill={GOLD} />
      <path d="M32 27 v10" stroke={GOLD} strokeWidth="4" />
      <path d="M14 48 c6 -12 36 -12 36 0 z" fill={GREEN} />
      <path d="M18 38 l14 6 14 -6" stroke={GOLD} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  'mental-coach': (
    <>
      <path d="M20 46 v-6 a14 14 0 1 1 24 -10 v4 a12 12 0 0 1 -12 12 z" fill={LIGHT} />
      <path d="M22 46 h20 v6 H22 z" fill={MID} />
      <path d="M32 20 v8 M28 24 h8" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'massage-therapist': (
    <>
      <rect x="8" y="36" width="48" height="10" rx="4" fill={LIGHT} />
      <path d="M16 46 v8 M48 46 v8" stroke={MID} strokeWidth="3" />
      <path d="M20 34 c0 -8 6 -12 12 -12 s12 4 12 12" fill={GOLD} opacity="0.5" />
      <path d="M24 30 v-8 a3 3 0 0 1 6 0 v8 M34 30 v-10 a3 3 0 0 1 6 0 v10" fill={GOLD} />
    </>
  ),

  // ---------------------------------------------------------------- TRAINING
  'language-tutor': (
    <>
      <path d="M8 14 h28 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 H20 l-8 8 v-8 H8 a4 4 0 0 1 -4 -4 V18 a4 4 0 0 1 4 -4 z" fill={BLUE} transform="translate(4 0)" />
      <text x="16" y="32" fontSize="16" fontWeight="800" fill={DARK}>
        A
      </text>
      <path d="M36 30 h20 a4 4 0 0 1 4 4 v10 a4 4 0 0 1 -4 4 h-8 l-6 6 v-6 h-6 a4 4 0 0 1 -4 -4 V34 a4 4 0 0 1 4 -4 z" fill={GOLD} />
      <text x="42" y="45" fontSize="12" fontWeight="800" fill={DARK}>
        B
      </text>
    </>
  ),
  'personal-trainer': (
    <>
      <circle cx="26" cy="30" r="16" fill={LIGHT} />
      <circle cx="26" cy="30" r="12" fill={DARK} />
      <path d="M26 30 v-8 M26 30 l6 4" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="22" y="10" width="8" height="5" rx="2" fill={MID} />
      <path d="M44 24 h6 v18 h-6 z" fill={GOLD} />
      <path d="M46 30 h10" stroke={GOLD} strokeWidth="4" />
    </>
  ),
  'video-analyst': (
    <>
      <rect x="8" y="14" width="48" height="30" rx="3" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <path d="M26 24 l12 5 -12 5 z" fill={GOLD} />
      <circle cx="16" cy="38" r="2" fill={GREEN} />
      <circle cx="24" cy="38" r="2" fill={GREEN} />
      <circle cx="46" cy="20" r="2" fill={RED} />
      <path d="M24 44 h16 v6 H24 z" fill={MID} />
    </>
  ),
  'set-piece-coach': (
    <>
      <path d="M12 46 h40" stroke={GREEN} strokeWidth="3" />
      <circle cx="18" cy="42" r="6" fill={LIGHT} />
      <path d="M18 36 l3 4 -3 4 -3 -4 z" fill={DARK} />
      <path d="M22 38 C30 18 44 16 52 22" stroke={GOLD} strokeWidth="2.5" strokeDasharray="4 3" fill="none" />
      <path d="M44 14 h14 v14 h-14 z" fill="none" stroke={LIGHT} strokeWidth="2.5" />
    </>
  ),
  'private-pitch': (
    <>
      <rect x="8" y="18" width="48" height="30" rx="2" fill={GREEN} opacity="0.75" />
      <path d="M32 18 v30" stroke={LIGHT} strokeWidth="2" />
      <circle cx="32" cy="33" r="6" fill="none" stroke={LIGHT} strokeWidth="2" />
      <path d="M8 26 h6 v14 H8 M56 26 h-6 v14 h6" fill="none" stroke={LIGHT} strokeWidth="2" />
      {/* Floodlight in the corner: a mast with a lamp head, angled inwards. */}
      <path d="M50 18 V8" stroke={MID} strokeWidth="3" />
      <path d="M44 4 h14 l-2 6 h-10 z" fill={GOLD} />
      <path d="M46 12 l-4 4 M52 12 l2 4" stroke={GOLD} strokeWidth="1.6" opacity="0.8" />
    </>
  ),

  // ------------------------------------------------------------------- MEDIA
  photoshoot: (
    <>
      <rect x="8" y="20" width="48" height="30" rx="4" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <path d="M24 20 l4 -6 h8 l4 6 z" fill={LIGHT} />
      <circle cx="32" cy="36" r="10" fill={MID} />
      <circle cx="32" cy="36" r="5" fill={GOLD} />
      <circle cx="48" cy="27" r="2" fill={RED} />
    </>
  ),
  'fan-club': (
    <>
      {/* A little crowd with arms up, behind a scarf held high. */}
      <circle cx="16" cy="20" r="6" fill={LIGHT} />
      <circle cx="32" cy="15" r="7" fill={MID} />
      <circle cx="48" cy="20" r="6" fill={LIGHT} />
      <path d="M8 40 v-8 a8 8 0 0 1 16 0 v8 z" fill={LIGHT} opacity="0.8" />
      <path d="M23 40 v-9 a9 9 0 0 1 18 0 v9 z" fill={MID} />
      <path d="M40 40 v-8 a8 8 0 0 1 16 0 v8 z" fill={LIGHT} opacity="0.8" />
      <rect x="8" y="42" width="48" height="9" rx="2" fill={GOLD} />
      <path d="M8 46 h48" stroke={DARK} strokeWidth="2" />
    </>
  ),
  'social-manager': (
    <>
      <rect x="20" y="8" width="24" height="48" rx="5" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <rect x="24" y="14" width="16" height="30" rx="2" fill={MID} />
      <Heart x={21} y={19} s={0.85} fill={RED} />
      <circle cx="32" cy="50" r="2.5" fill={LIGHT} />
    </>
  ),
  'pr-agency': (
    <>
      <path d="M10 28 l24 -12 v32 L10 36 z" fill={GOLD} />
      <path d="M6 28 h4 v8 H6 a4 4 0 0 1 0 -8 z" fill={MID} />
      <path d="M40 22 a14 14 0 0 1 0 20" stroke={LIGHT} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M46 16 a22 22 0 0 1 0 32" stroke={MID} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  documentary: (
    <>
      <rect x="8" y="26" width="48" height="26" rx="3" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <path d="M8 18 l46 -6 2 8 -46 6 z" fill={LIGHT} />
      <path d="M18 14 l-3 8 M28 12 l-3 8 M38 10 l-3 8 M48 8 l-3 8" stroke={DARK} strokeWidth="2.5" />
      <path d="M26 34 l12 5 -12 5 z" fill={GOLD} />
    </>
  ),

  // -------------------------------------------------------------------- HOME
  'home-gym': (
    <>
      <rect x="26" y="29" width="12" height="6" fill={LIGHT} />
      <rect x="14" y="22" width="8" height="20" rx="2" fill={GOLD} />
      <rect x="42" y="22" width="8" height="20" rx="2" fill={GOLD} />
      <rect x="8" y="26" width="6" height="12" rx="2" fill={MID} />
      <rect x="50" y="26" width="6" height="12" rx="2" fill={MID} />
    </>
  ),
  'sauna-pool': (
    <>
      <path d="M8 38 c6 -4 10 4 16 0 s10 4 16 0 s10 4 16 0" stroke={BLUE} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M8 48 c6 -4 10 4 16 0 s10 4 16 0 s10 4 16 0" stroke={BLUE} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M24 26 c0 -6 -6 -6 -4 -12 M32 24 c0 -8 -6 -8 -4 -14 M40 26 c0 -6 -6 -6 -4 -12" stroke={LIGHT} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  'city-apartment': (
    <>
      <rect x="18" y="8" width="28" height="48" rx="2" fill={LIGHT} />
      <g fill={DARK}>
        <rect x="23" y="14" width="7" height="7" />
        <rect x="34" y="14" width="7" height="7" />
        <rect x="23" y="26" width="7" height="7" />
        <rect x="34" y="26" width="7" height="7" />
        <rect x="23" y="38" width="7" height="7" />
      </g>
      <rect x="34" y="38" width="7" height="7" fill={GOLD} />
      <rect x="28" y="48" width="8" height="8" fill={MID} />
    </>
  ),
  mansion: (
    <>
      <House fill={LIGHT} />
      <rect x="10" y="30" width="44" height="4" fill={MID} />
      <g fill={MID}>
        <rect x="19" y="34" width="4" height="16" />
        <rect x="29" y="34" width="4" height="16" />
        <rect x="39" y="34" width="4" height="16" />
      </g>
      <path d="M6 52 c8 -3 16 3 24 0 s16 3 28 0 v6 H6 z" fill={BLUE} />
    </>
  ),

  // ------------------------------------------------------------------ FAMILY
  'family-holiday': (
    <>
      <circle cx="50" cy="14" r="7" fill={GOLD} />
      <circle cx="20" cy="24" r="6" fill={LIGHT} />
      <path d="M12 52 v-14 a8 8 0 0 1 16 0 v14 z" fill={LIGHT} />
      <circle cx="38" cy="26" r="5" fill={MID} />
      <path d="M31 52 v-12 a7 7 0 0 1 14 0 v12 z" fill={MID} />
      <circle cx="52" cy="34" r="4" fill={GOLD} />
      <path d="M47 52 v-9 a5 5 0 0 1 10 0 v9 z" fill={GOLD} />
    </>
  ),
  'mum-car': (
    <>
      {/* A family car with a gift bow on the roof and a ribbon down the side. */}
      <path d="M12 38 l6 -12 h28 l6 12 z" fill={LIGHT} />
      <path d="M21 28 h9 v8 H16 z M34 28 h10 l4 8 H34 z" fill={BLUE} opacity="0.7" />
      <rect x="8" y="38" width="48" height="9" rx="4" fill={LIGHT} />
      <circle cx="19" cy="49" r="5" fill={DARK} />
      <circle cx="45" cy="49" r="5" fill={DARK} />
      <path d="M32 26 v21" stroke={RED} strokeWidth="4" />
      <circle cx="32" cy="20" r="4" fill={RED} />
      <path d="M28 20 c-8 -8 -12 2 -2 4 z M36 20 c8 -8 12 2 2 4 z" fill={RED} />
    </>
  ),
  'parents-house': (
    <>
      <House fill={LIGHT} />
      <Heart x={24} y={30} s={0.75} fill={RED} />
      <rect x="10" y="50" width="44" height="4" fill={MID} />
    </>
  ),

  // --------------------------------------------------------------- LIFESTYLE
  'short-holiday': (
    <>
      <circle cx="46" cy="16" r="8" fill={GOLD} />
      <path d="M22 50 V28" stroke={MID} strokeWidth="4" />
      <path d="M22 28 c-10 -6 -16 0 -18 4 c8 -2 12 0 18 -4 z" fill={GREEN} />
      <path d="M22 28 c10 -6 16 0 18 4 c-8 -2 -12 0 -18 -4 z" fill={GREEN} />
      <path d="M22 28 c-2 -10 4 -14 8 -16 c-4 6 -4 10 -8 16 z" fill={GREEN} />
      <path d="M6 52 h52" stroke={GOLD} strokeWidth="4" />
    </>
  ),
  'charity-event': (
    <>
      {/* Two open hands holding a heart up. */}
      <Heart x={20} y={8} s={1} fill={RED} />
      <path d="M6 52 v-12 a4 4 0 0 1 8 0 v4 l4 -10 a4 4 0 0 1 8 3 l-4 15 z" fill={LIGHT} />
      <path d="M58 52 v-12 a4 4 0 0 0 -8 0 v4 l-4 -10 a4 4 0 0 0 -8 3 l4 15 z" fill={LIGHT} />
      <path d="M22 52 h20" stroke={MID} strokeWidth="3" opacity="0.6" />
    </>
  ),
  'personal-chef': (
    <>
      <path d="M18 34 a10 10 0 0 1 4 -19 a10 10 0 0 1 20 0 a10 10 0 0 1 4 19 z" fill={LIGHT} />
      <rect x="18" y="34" width="28" height="8" rx="2" fill={MID} />
      <path d="M22 46 h20" stroke={GOLD} strokeWidth="3" />
      <path d="M24 52 h16" stroke={GOLD} strokeWidth="3" opacity="0.6" />
    </>
  ),
  'luxury-watch': (
    <>
      <rect x="24" y="6" width="16" height="14" rx="4" fill={MID} />
      <rect x="24" y="44" width="16" height="14" rx="4" fill={MID} />
      <circle cx="32" cy="32" r="16" fill={GOLD} />
      <circle cx="32" cy="32" r="12" fill={DARK} />
      <path d="M32 32 V24 M32 32 l6 4" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  'sports-car': (
    <>
      <path d="M8 38 l8 -10 h20 l12 10 z" fill={RED} />
      <path d="M18 30 h14 l7 8 H16 z" fill={LIGHT} opacity="0.5" />
      <rect x="4" y="38" width="56" height="7" rx="3.5" fill={RED} />
      <circle cx="18" cy="47" r="6" fill={DARK} />
      <circle cx="46" cy="47" r="6" fill={DARK} />
      <circle cx="18" cy="47" r="2" fill={MID} />
      <circle cx="46" cy="47" r="2" fill={MID} />
    </>
  ),
  foundation: (
    <>
      <path d="M32 10 L56 24 H8 z" fill={LIGHT} />
      <g fill={MID}>
        <rect x="14" y="26" width="5" height="20" />
        <rect x="25" y="26" width="5" height="20" />
        <rect x="36" y="26" width="5" height="20" />
        <rect x="47" y="26" width="5" height="20" />
      </g>
      <rect x="8" y="46" width="48" height="5" fill={LIGHT} />
      <Heart x={26} y={28} s={0.5} fill={RED} />
    </>
  ),
  'private-jet': (
    <>
      <path d="M6 34 h30 l10 -14 h6 l-4 14 h10 l-4 6 h-6 l4 12 h-6 l-10 -12 H6 z" fill={LIGHT} />
      <path d="M20 40 l-8 10 h6 l6 -10 z" fill={MID} />
      <circle cx="14" cy="34" r="2" fill={GOLD} />
      <circle cx="22" cy="34" r="2" fill={GOLD} />
    </>
  ),

  // ------------------------------------------------------------------ GADGET
  'noise-headphones': (
    <>
      <path d="M14 36 v-4 a18 18 0 0 1 36 0 v4" stroke={LIGHT} strokeWidth="4" fill="none" />
      <rect x="8" y="34" width="10" height="18" rx="4" fill={GOLD} />
      <rect x="46" y="34" width="10" height="18" rx="4" fill={GOLD} />
      <path d="M4 24 c4 4 4 8 0 12 M60 24 c-4 4 -4 8 0 12" stroke={MID} strokeWidth="2.5" fill="none" />
    </>
  ),
  'game-console': (
    <>
      <path d="M14 26 h36 a12 12 0 0 1 8 14 a8 8 0 0 1 -14 4 h-24 a8 8 0 0 1 -14 -4 a12 12 0 0 1 8 -14 z" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <path d="M20 34 v8 M16 38 h8" stroke={LIGHT} strokeWidth="3" strokeLinecap="round" />
      <circle cx="44" cy="35" r="3" fill={GOLD} />
      <circle cx="50" cy="41" r="3" fill={GREEN} />
    </>
  ),
  'training-watch': (
    <>
      <rect x="24" y="6" width="16" height="12" rx="4" fill={MID} />
      <rect x="24" y="46" width="16" height="12" rx="4" fill={MID} />
      <rect x="16" y="18" width="32" height="28" rx="7" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <path d="M20 32 h6 l3 -6 4 12 3 -6 h6" stroke={GREEN} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  'vr-reaction-trainer': (
    <>
      <path d="M10 22 h44 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 H40 l-8 -6 -8 6 H10 a6 6 0 0 1 -6 -6 V28 a6 6 0 0 1 6 -6 z" fill={DARK} stroke={LIGHT} strokeWidth="2" />
      <circle cx="20" cy="33" r="6" fill={BLUE} />
      <circle cx="44" cy="33" r="6" fill={BLUE} />
      <path d="M4 26 l-2 -6 M60 26 l2 -6" stroke={MID} strokeWidth="3" />
    </>
  ),
};

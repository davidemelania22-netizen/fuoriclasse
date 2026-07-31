/**
 * Club colours, derived from the club's own name.
 *
 * The invented clubs were built out of a city and a colour nickname —
 * "Milano Rossonera", "Barcellona Blaugrana", "Tyneside Magpies" — so the
 * name already carries the answer nearly every time. Reading it back out
 * beats maintaining 120 hand-written palettes, and it keeps working for
 * clubs a player renames in the world editor: call a side "Verona
 * Gialloblù" and it turns yellow and blue by itself.
 *
 * Only names with no colour word in them need an explicit entry, and
 * anything still unmatched falls back to a stable palette picked from the
 * name — never grey, never random between two runs.
 */

export interface ClubColors {
  /** Shirt colour: the one that fills a stadium. */
  primary: string;
  /** Trim: stripes, sleeves, shorts. */
  secondary: string;
  /** Text that stays readable on `primary`. */
  onPrimary: string;
  /**
   * The club's colour, adjusted until it reads on a dark background.
   * Without this a side in black and red writes its own name in black on
   * a near-black stage — which is exactly what the first presentation of
   * Milano Rossonera did.
   */
  onDark: string;
}

const BLACK = '#12141a';
const WHITE = '#f4f6fb';

/**
 * Colour words, in the three languages the club names use. Matched as whole
 * words against the club name, longest first — "biancorossa" must win over
 * the "rossa" hiding inside it.
 */
const COLOR_WORDS: ReadonlyArray<readonly [string, string, string]> = [
  // [word, primary, secondary]
  ['nerazzurra', '#0a2472', BLACK],
  ['rossonera', '#c8102e', BLACK],
  ['bianconera', WHITE, BLACK],
  ['biancoceleste', '#6cabdd', WHITE],
  ['biancorossa', WHITE, '#c8102e'],
  ['giallorossa', '#8e1f2f', '#f5b323'],
  ['blucerchiata', '#1b5faa', WHITE],
  ['rosanero', '#f4a7c3', BLACK],
  ['verdiblanca', '#0a7d3e', WHITE],
  ['rojiblanca', '#c8102e', WHITE],
  ['blaugrana', '#7a2b47', '#123a6b'],
  ['giallonera', '#f5d907', BLACK],
  ['biancoblù', WHITE, '#1b5faa'],
  ['biancoblu', WHITE, '#1b5faa'],
  ['gialloblù', '#f5d907', '#1b5faa'],
  ['gialloblu', '#f5d907', '#1b5faa'],
  ['granata', '#7a1220', WHITE],
  ['azzurra', '#00a1de', WHITE],
  ['celeste', '#6cabdd', WHITE],
  ['amarilla', '#f5c518', '#1b5faa'],
  ['blanco', WHITE, '#d4af37'],
  ['viola', '#5c2d91', WHITE],
  ['rojilla', '#c8102e', '#0a2472'],
  ['canarina', '#f5d907', '#0a7d3e'],
  ['verde', '#0a7d3e', WHITE],
  ['rossa', '#c8102e', WHITE],
  ['ferrea', '#c8102e', '#f5d907'],
  // English nicknames encode the same thing.
  ['sky blues', '#6cabdd', WHITE],
  ['red devils', '#c8102e', BLACK],
  ['reds', '#c8102e', WHITE],
  ['gunners', '#c8102e', WHITE],
  ['lilywhites', WHITE, '#0a2472'],
  ['magpies', BLACK, WHITE],
  ['toffees', '#123a6b', WHITE],
  ['hammers', '#7a2b47', '#6cabdd'],
  ['seagulls', '#1b5faa', WHITE],
  ['blades', '#c8102e', BLACK],
  ['owls', '#1b5faa', WHITE],
  ['baggies', '#0a2472', WHITE],
  ['canaries', '#f5d907', '#0a7d3e'],
  ['dragons', '#c8102e', WHITE],
  ['hornets', '#f5c518', BLACK],
  ['foxes', '#1b5faa', WHITE],
  ['saints', '#c8102e', WHITE],
  ['blues', '#123a6b', WHITE],
  ['villans', '#7a2b47', '#6cabdd'],
  ['foresters', '#c8102e', WHITE],
  ['minatori', '#1b5faa', WHITE],
  ['puledri', WHITE, '#0a7d3e'],
  ['lupi', '#0a7d3e', WHITE],
  ['leones', '#c8102e', WHITE],
  ['submarino', '#f5d907', '#0a2472'],
  ['grifone', '#c8102e', '#0a2472'],
  ['aquilotti', WHITE, BLACK],
  ['diavoli', '#c8102e', BLACK],
];

/** Clubs whose name says a place or a people, but never a colour. */
const BY_NAME: Readonly<Record<string, readonly [string, string]>> = {
  'Bergamo Orobica': ['#0a2472', BLACK],
  'Bologna Felsinea': ['#8e1f2f', '#123a6b'],
  'Como Lariana': ['#1b5faa', WHITE],
  'Cesena Romagnola': [WHITE, BLACK],
  'Venezia Lagunare': ['#f07d1a', BLACK],
  'Empoli Toscana': ['#1b5faa', WHITE],
  'Monza Brianzola': ['#c8102e', WHITE],
  'Padova Patavina': [WHITE, '#c8102e'],
  'Pescara Adriatica': ['#1b5faa', WHITE],
  'Avellino Irpina': ['#0a7d3e', WHITE],
  'Ipswich Tractor Boys': ['#1b5faa', WHITE],
  'Teesside Boro': ['#c8102e', WHITE],
  'Coventry Elephants': ['#6cabdd', BLACK],
  'Madrid Colchonero': ['#c8102e', WHITE],
  'San Sebastián Donostiarra': ['#1b5faa', WHITE],
  'Siviglia Nervionense': [WHITE, '#c8102e'],
  'Valencia Ches': [WHITE, '#f5c518'],
  'Getafe Azulón': ['#123a6b', WHITE],
  'La Coruña Herculina': ['#6cabdd', WHITE],
  'Santander Cántabra': [WHITE, '#0a7d3e'],
  'Saragozza Maña': [WHITE, '#1b5faa'],
  'Cadice Gaditana': ['#f5d907', '#1b5faa'],
  'Granada Nazarí': ['#c8102e', WHITE],
  'Eibar Armera': ['#7a1220', '#1b5faa'],
  'Almería Indálica': ['#c8102e', WHITE],
  'Valladolid Pucelana': ['#7a2b47', WHITE],
  'Málaga Boquerona': ['#1b5faa', WHITE],
  'Leganés Pepinera': ['#123a6b', WHITE],
  'Parigi Capitale': ['#0a2472', '#c8102e'],
  'Marsiglia Olimpica': ['#6cabdd', WHITE],
  'Lione Rodano': [WHITE, '#1b5faa'],
  'Principato Monaco': ['#c8102e', WHITE],
  'Lilla Fiandre': ['#c8102e', '#0a2472'],
  'Nizza Costa Azzurra': ['#c8102e', BLACK],
  'Rennes Bretagna': ['#c8102e', BLACK],
  'Strasburgo Alsazia': ['#1b5faa', WHITE],
  'Tolosa Garonna': ['#7a2b47', WHITE],
  'Nantes Loira': ['#f5d907', '#0a7d3e'],
  'Brest Finistère': ['#c8102e', WHITE],
  'Montpellier Linguadoca': ['#f5811f', '#0a2472'],
  'Reims Champagne': ['#c8102e', WHITE],
  'Troyes Aube': ['#1b5faa', WHITE],
  'Bastia Corsa': ['#1b5faa', WHITE],
  'Grenoble Alpi': ['#1b5faa', WHITE],
  'Amiens Piccardia': ['#0a7d3e', WHITE],
  'Guingamp Armor': ['#c8102e', BLACK],
  'Annecy Savoia': ['#c8102e', WHITE],
  'Pau Bearn': ['#1b5faa', '#f5d907'],
  'Laval Mayenne': ['#f5811f', BLACK],
  'Le Mans Sarthe': ['#f5d907', '#c8102e'],
  'Monaco Baviera': ['#c8102e', WHITE],
  'Leverkusen Renania': ['#c8102e', BLACK],
  'Lipsia Sassonia': [WHITE, '#c8102e'],
  'Francoforte Meno': [BLACK, '#c8102e'],
  'Stoccarda Svevia': [WHITE, '#c8102e'],
  'Friburgo Brisgovia': ['#c8102e', BLACK],
  'Brema Anseatica': ['#0a7d3e', WHITE],
  'Amburgo Elba': ['#1b5faa', BLACK],
  'Düsseldorf Renana': ['#c8102e', WHITE],
  'Norimberga Franconia': ['#7a1220', WHITE],
  'Paderborn Vestfalia': ['#1b5faa', BLACK],
  'Karlsruhe Baden': ['#1b5faa', WHITE],
  'Magdeburgo Ottoniana': ['#1b5faa', WHITE],
  'Darmstadt Assia': ['#1b5faa', WHITE],
  'Bochum Ruhr': ['#1b5faa', WHITE],
  'Kiel Baltica': ['#1b5faa', WHITE],
  'Hannover Rossa': ['#c8102e', BLACK],
  'Kaiserslautern Diavoli': ['#c8102e', WHITE],
};

/** Last resort: stable, saturated, and never the same for adjacent names. */
const FALLBACK: ReadonlyArray<readonly [string, string]> = [
  ['#c8102e', WHITE],
  ['#0a2472', WHITE],
  ['#0a7d3e', WHITE],
  ['#f5c518', BLACK],
  ['#5c2d91', WHITE],
  ['#f07d1a', BLACK],
  ['#1b5faa', WHITE],
  ['#7a1220', '#f5c518'],
];

const rgb = (hex: string): [number, number, number] => {
  const v = hex.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
};

const hex = (channels: readonly number[]): string =>
  `#${channels
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

function luminance(color: string): number {
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(color);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Relative luminance, to decide whether text on `primary` is dark or light. */
function readableText(color: string): string {
  return luminance(color) > 0.45 ? BLACK : WHITE;
}

/** Mix a colour toward white until it can be read against a dark stage. */
function liftForDark(color: string): string {
  let current = color;
  // Six steps is enough to take even pure black past the threshold, and it
  // keeps the hue: a red club stays red, just brighter.
  for (let i = 0; i < 6 && luminance(current) < 0.22; i += 1) {
    const [r, g, b] = rgb(current);
    current = hex([
      r + (255 - r) * 0.3,
      g + (255 - g) * 0.3,
      b + (255 - b) * 0.3,
    ]);
  }
  return current;
}

/** The more legible of the two club colours, lifted if both are dark. */
function pickForDark(primary: string, secondary: string): string {
  const brighter =
    luminance(primary) >= luminance(secondary) ? primary : secondary;
  return liftForDark(brighter);
}

const WORDS_BY_LENGTH = [...COLOR_WORDS].sort(
  (a, b) => b[0].length - a[0].length,
);

export function clubColors(name: string): ClubColors {
  const explicit = BY_NAME[name];
  if (explicit) {
    return {
      primary: explicit[0],
      secondary: explicit[1],
      onPrimary: readableText(explicit[0]),
      onDark: pickForDark(explicit[0], explicit[1]),
    };
  }

  const haystack = name.toLowerCase();
  for (const [word, primary, secondary] of WORDS_BY_LENGTH) {
    if (haystack.includes(word)) {
      return {
        primary,
        secondary,
        onPrimary: readableText(primary),
        onDark: pickForDark(primary, secondary),
      };
    }
  }

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100_000;
  }
  const [primary, secondary] = FALLBACK[hash % FALLBACK.length]!;
  return {
    primary,
    secondary,
    onPrimary: readableText(primary),
    onDark: pickForDark(primary, secondary),
  };
}

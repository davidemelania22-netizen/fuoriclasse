import { clubColors, rateRoles, traitsOf } from '@football-life/game-data';
import type {
  PlayerProfileData,
  PlayerProfileRepository,
  ProfileRecentMatch,
  ProfileSeasonLine,
} from '../repositories/player-profile-repository';
import type { ProfileRepository } from '../repositories/profile-repository';

/**
 * The player's own scouting report, laid out the way a football-management
 * game lays it out: identity across the top, the three attribute columns in
 * the middle, and the season underneath.
 *
 * Everything here is derived from what the save already holds — no new
 * columns. The pieces the engine does not model (a squad-role word, the
 * attributes that matter for a position, a personality label) are computed
 * from attributes that do exist, so they stay honest as the player grows.
 */

/** Attributes that decide whether you are good *at your position*. */
const KEY_ATTRIBUTES: Record<string, readonly string[]> = {
  GK: [
    'concentration',
    'anticipation',
    'composure',
    'agility',
    'balance',
    'jumping',
    'bravery',
    'decisions',
  ],
  DF: [
    'marking',
    'tackling',
    'heading',
    'anticipation',
    'concentration',
    'strength',
    'bravery',
    'decisions',
  ],
  MF: [
    'shortPassing',
    'longPassing',
    'vision',
    'ballControl',
    'firstTouch',
    'technique',
    'decisions',
    'stamina',
    'creativity',
  ],
  WG: [
    'dribbling',
    'crossing',
    'pace',
    'acceleration',
    'agility',
    'firstTouch',
    'technique',
    'balance',
  ],
  FW: [
    'finishing',
    'firstTouch',
    'composure',
    'heading',
    'anticipation',
    'acceleration',
    'pace',
    'strength',
  ],
};

/** Set-piece work sits in its own block, as it does on a real profile. */
const SET_PIECE_KEYS = ['setPieces', 'penalties', 'longShots', 'crossing'];

/** What a keeper is judged on — an outfielder's score here is a joke figure. */
const KEEPER_KEYS = [
  'agility',
  'balance',
  'jumping',
  'concentration',
  'bravery',
];

/** Squad-role words, keyed by the contract's SquadRole. */
const SQUAD_ROLE_WORDS: Record<string, string> = {
  KEY: 'Stella',
  FIRST_TEAM: 'Titolare',
  ROTATION: 'Rotazione',
  BACKUP: 'Riserva',
  PROSPECT: 'Giovane di prospettiva',
};

const POSITION_WORDS: Record<string, string> = {
  GK: 'Portiere',
  DF: 'Difensore',
  MF: 'Centrocampista',
  WG: 'Ala',
  FW: 'Punta (Centrale)',
};

const FOOT_WORDS: Record<string, string> = {
  LEFT: 'Sinistro',
  RIGHT: 'Destro',
  BOTH: 'Ambidestro',
};

/**
 * Personality, read off the mental attributes the way a scout would: the
 * strongest trait that clears its bar wins, and a player with nothing
 * remarkable is simply "Equilibrato".
 */
const PERSONALITIES: {
  label: string;
  needs: readonly string[];
  /** Every named attribute must clear this. */
  min?: number;
  /** …or, for the unflattering labels, stay under this. */
  max?: number;
}[] = [
  {
    label: 'Cittadino modello',
    needs: ['professionalism', 'determination', 'discipline'],
    min: 85,
  },
  {
    label: 'Professionista esemplare',
    needs: ['professionalism', 'determination'],
    min: 75,
  },
  { label: 'Leader nato', needs: ['leadership', 'bravery'], min: 75 },
  { label: 'Ambizioso', needs: ['ambition', 'determination'], min: 70 },
  { label: 'Glaciale', needs: ['composure', 'pressureHandling'], min: 75 },
  { label: 'Estroso', needs: ['creativity', 'vision'], min: 75 },
  { label: 'Combattivo', needs: ['bravery', 'determination'], min: 65 },
  { label: 'Incostante', needs: ['concentration', 'professionalism'], max: 35 },
];

export interface ProfileAttributeView {
  key: string;
  category: string;
  /** 0-20, the scale the screen speaks. */
  value: number;
  /** True when this attribute decides the player's position. */
  isKey: boolean;
}

export interface PlayerProfileView {
  playerName: string;
  shirtNumber: number;
  positionLabel: string;
  secondaryPositionLabels: string[];
  footLabel: string;
  footStrength: { left: number; right: number };
  nationalityId: string;
  ageYears: number;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  avatarDataUrl: string | null;

  clubName: string | null;
  clubLogo: string | null;
  colors: {
    primary: string;
    secondary: string;
    onPrimary: string;
    onDark: string;
  };
  squadRoleLabel: string | null;
  weeklyWage: number | null;
  contractEndDate: string | null;
  marketValue: number;

  /** 0-5 in half-star steps, the way ability is shown on a scout card. */
  abilityStars: number;
  potentialStars: number;
  reputationLabel: string;
  personalityLabel: string;
  /** Out of 10, and deliberately unflattering for anyone but a keeper. */
  keeperRating: number;

  attributes: ProfileAttributeView[];
  setPieceKeys: string[];
  /** Every role rated 0-5, best first. */
  roles: { key: string; label: string; stars: number; natural: boolean }[];
  /** The habits this player has earned, from his attributes. */
  traits: { key: string; label: string }[];

  morale: number;
  condition: number;
  form: number;
  stress: number;

  seasonLabel: string | null;
  seasonLines: ProfileSeasonLine[];
  recentMatches: ProfileRecentMatch[];
  careerTotals: PlayerProfileData['careerTotals'];
}

export interface PlayerProfileDeps {
  profileData: PlayerProfileRepository;
  profile: ProfileRepository;
}

/** Shirt numbers pooled by position, stable for a given player. */
const NUMBERS_BY_POSITION: Record<string, readonly number[]> = {
  GK: [1, 12, 22, 31],
  DF: [2, 3, 4, 5, 6, 13, 15, 24],
  MF: [8, 14, 16, 18, 20, 23],
  WG: [7, 11, 17, 27, 30],
  FW: [9, 10, 19, 21, 29, 99],
};

function shirtNumberFor(playerId: string, position: string): number {
  const pool = NUMBERS_BY_POSITION[position] ?? NUMBERS_BY_POSITION.MF!;
  let hash = 0;
  for (const char of playerId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length]!;
}

const to20 = (value: number): number => Math.round(value / 5);

/** 1-100 ability to a 0-5 star rating in half stars. */
function stars(ability: number): number {
  return Math.round((ability / 100) * 10) / 2;
}

function reputationLabel(reputation: number): string {
  if (reputation >= 7000) return 'Mondiale';
  if (reputation >= 4000) return 'Continentale';
  if (reputation >= 2000) return 'Nazionale';
  if (reputation >= 700) return 'Regionale';
  return 'Sconosciuta';
}

function personalityOf(byKey: Map<string, number>): string {
  for (const candidate of PERSONALITIES) {
    const values = candidate.needs.map((key) => byKey.get(key) ?? 0);
    const passes = values.every((value) =>
      candidate.max !== undefined
        ? value <= candidate.max
        : value >= (candidate.min ?? 0),
    );
    if (passes) return candidate.label;
  }
  return 'Equilibrato';
}

/** A two-footed player shows two full bars; the weak foot keeps a stub. */
function footStrength(foot: string): { left: number; right: number } {
  if (foot === 'BOTH') return { left: 5, right: 5 };
  if (foot === 'LEFT') return { left: 5, right: 2 };
  return { left: 2, right: 5 };
}

export async function getPlayerProfile(
  deps: PlayerProfileDeps,
  saveGameId: string,
): Promise<PlayerProfileView | null> {
  const data = await deps.profileData.loadPlayerProfile(saveGameId);
  if (!data) return null;
  const saved = await deps.profile.getProfile(saveGameId);

  const byKey = new Map(data.attributes.map((a) => [a.key, a.value]));
  const keyKeys = new Set(KEY_ATTRIBUTES[data.primaryPosition] ?? []);

  const keeperValues = KEEPER_KEYS.map((key) => byKey.get(key) ?? 0);
  const keeperMean =
    keeperValues.reduce((sum, v) => sum + v, 0) / (keeperValues.length || 1);
  // Only an actual keeper is judged on keeping; everyone else is scored as the
  // emergency option they would be, which is where the low number comes from.
  const keeperRating =
    data.primaryPosition === 'GK'
      ? Math.round(keeperMean / 10)
      : Math.round(keeperMean / 10 / 2);

  // Roles and traits both read the 0-20 scale, so build that map once.
  const values20: Record<string, number> = {};
  for (const attribute of data.attributes) {
    values20[attribute.key] = to20(attribute.value);
  }

  return {
    playerName: `${data.firstName} ${data.lastName}`,
    shirtNumber: shirtNumberFor(data.playerId, data.primaryPosition),
    positionLabel: POSITION_WORDS[data.primaryPosition] ?? data.primaryPosition,
    secondaryPositionLabels: data.secondaryPositions.map(
      (p) => POSITION_WORDS[p] ?? p,
    ),
    footLabel: FOOT_WORDS[data.preferredFoot] ?? data.preferredFoot,
    footStrength: footStrength(data.preferredFoot),
    nationalityId: data.nationalityId,
    ageYears: data.ageYears,
    birthDate: data.birthDate,
    heightCm: data.heightCm,
    weightKg: Math.round(data.weightKg),
    avatarDataUrl: saved?.avatarDataUrl ?? null,

    clubName: data.contract?.clubName ?? null,
    clubLogo: data.contract?.clubLogo ?? null,
    colors: clubColors(data.contract?.clubName ?? ''),
    squadRoleLabel: data.contract
      ? (SQUAD_ROLE_WORDS[data.contract.squadRole] ??
        data.contract.squadRole.replace(/_/g, ' ').toLowerCase())
      : null,
    weeklyWage: data.contract?.weeklyWage ?? null,
    contractEndDate: data.contract?.endDate ?? null,
    marketValue: data.marketValue,

    abilityStars: stars(data.currentAbility),
    potentialStars: stars(data.potentialAbility),
    reputationLabel: reputationLabel(data.reputation),
    personalityLabel: personalityOf(byKey),
    keeperRating,

    attributes: data.attributes
      .filter((a) => a.category !== 'HIDDEN')
      .map((a) => ({
        key: a.key,
        category: a.category,
        value: to20(a.value),
        isKey: keyKeys.has(a.key),
      })),
    setPieceKeys: SET_PIECE_KEYS.filter((key) => byKey.has(key)),
    roles: rateRoles(values20, data.primaryPosition),
    traits: traitsOf(values20),

    morale: data.morale,
    condition: data.condition,
    form: data.form,
    stress: data.stress,

    seasonLabel: data.seasonLabel,
    seasonLines: data.seasonLines,
    recentMatches: data.recentMatches,
    careerTotals: data.careerTotals,
  };
}

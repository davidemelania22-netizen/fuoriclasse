/**
 * Roles and traits, read off the attributes a player already has.
 *
 * Neither is stored. A role rating is a weighted mean of the attributes that
 * role lives on, and a trait shows up when the attributes behind it clear
 * their bar. That means both work on careers that started before this
 * existed, and both move as the player grows — the striker who learns to
 * finish becomes a better "Attaccante d'area" without anything being written
 * anywhere.
 *
 * Everything here speaks the 0-20 scale the screen speaks, not the 1-100 the
 * database stores. Callers convert first.
 */

export interface PlayerRole {
  key: string;
  label: string;
  /** Positions this role is natural for. */
  positions: readonly string[];
  /** Attribute keys and how much each matters. Weights need not sum to 1. */
  weights: Readonly<Record<string, number>>;
}

export const PLAYER_ROLES: readonly PlayerRole[] = [
  // Portiere ---------------------------------------------------------------
  {
    key: 'GK_CLASSIC',
    label: 'Portiere classico',
    positions: ['GK'],
    weights: {
      agility: 3,
      balance: 2,
      jumping: 2,
      concentration: 3,
      bravery: 2,
      anticipation: 2,
    },
  },
  {
    key: 'GK_SWEEPER',
    label: 'Portiere libero',
    positions: ['GK'],
    weights: {
      anticipation: 3,
      decisions: 3,
      pace: 2,
      shortPassing: 2,
      composure: 2,
      bravery: 2,
    },
  },

  // Difesa -----------------------------------------------------------------
  {
    key: 'DF_CENTRAL',
    label: 'Difensore centrale',
    positions: ['DF'],
    weights: {
      marking: 3,
      tackling: 3,
      heading: 3,
      strength: 2,
      concentration: 2,
      anticipation: 2,
      bravery: 1,
    },
  },
  {
    key: 'DF_BALL_PLAYING',
    label: 'Difensore d’impostazione',
    positions: ['DF'],
    weights: {
      shortPassing: 3,
      longPassing: 3,
      composure: 3,
      marking: 2,
      firstTouch: 2,
      decisions: 2,
      vision: 1,
    },
  },
  {
    key: 'DF_FULLBACK',
    label: 'Terzino',
    positions: ['DF'],
    weights: {
      tackling: 3,
      marking: 2,
      pace: 3,
      stamina: 3,
      crossing: 2,
      anticipation: 1,
    },
  },
  {
    key: 'DF_WINGBACK',
    label: 'Terzino fluidificante',
    positions: ['DF', 'WG'],
    weights: {
      stamina: 3,
      pace: 3,
      crossing: 3,
      dribbling: 2,
      tackling: 2,
      acceleration: 2,
    },
  },

  // Centrocampo ------------------------------------------------------------
  {
    key: 'MF_ANCHOR',
    label: 'Mediano',
    positions: ['MF'],
    weights: {
      tackling: 3,
      marking: 3,
      anticipation: 3,
      concentration: 2,
      strength: 2,
      shortPassing: 2,
    },
  },
  {
    key: 'MF_DEEP_PLAYMAKER',
    label: 'Regista',
    positions: ['MF'],
    weights: {
      longPassing: 3,
      shortPassing: 3,
      vision: 3,
      composure: 3,
      technique: 2,
      decisions: 2,
    },
  },
  {
    key: 'MF_BOX_TO_BOX',
    label: 'Mezzala',
    positions: ['MF'],
    weights: {
      stamina: 3,
      shortPassing: 2,
      tackling: 2,
      longShots: 2,
      determination: 2,
      ballControl: 2,
      acceleration: 2,
    },
  },
  {
    key: 'MF_ATTACKING',
    label: 'Trequartista',
    positions: ['MF', 'WG'],
    weights: {
      creativity: 3,
      vision: 3,
      technique: 3,
      firstTouch: 3,
      dribbling: 2,
      longShots: 2,
    },
  },

  // Esterni ----------------------------------------------------------------
  {
    key: 'WG_CLASSIC',
    label: 'Ala classica',
    positions: ['WG'],
    weights: {
      crossing: 3,
      dribbling: 3,
      pace: 3,
      acceleration: 3,
      agility: 2,
      firstTouch: 1,
    },
  },
  {
    key: 'WG_INVERTED',
    label: 'Ala rientrante',
    positions: ['WG'],
    weights: {
      dribbling: 3,
      finishing: 3,
      longShots: 3,
      technique: 2,
      acceleration: 2,
      balance: 2,
    },
  },
  {
    key: 'WG_WIDE_PLAYMAKER',
    label: 'Esterno di manovra',
    positions: ['WG', 'MF'],
    weights: {
      vision: 3,
      shortPassing: 3,
      technique: 3,
      creativity: 2,
      firstTouch: 2,
      dribbling: 2,
    },
  },

  // Attacco ----------------------------------------------------------------
  {
    key: 'FW_POACHER',
    label: 'Attaccante d’area',
    positions: ['FW'],
    weights: {
      finishing: 4,
      anticipation: 3,
      composure: 3,
      firstTouch: 2,
      heading: 2,
      acceleration: 1,
    },
  },
  {
    key: 'FW_TARGET',
    label: 'Centravanti',
    positions: ['FW'],
    weights: {
      heading: 4,
      strength: 4,
      jumping: 3,
      bravery: 2,
      firstTouch: 2,
      finishing: 2,
    },
  },
  {
    key: 'FW_FALSE_NINE',
    label: 'Falso nove',
    positions: ['FW'],
    weights: {
      vision: 3,
      shortPassing: 3,
      firstTouch: 3,
      technique: 3,
      creativity: 2,
      dribbling: 2,
      finishing: 2,
    },
  },
  {
    key: 'FW_COMPLETE',
    label: 'Attaccante di movimento',
    positions: ['FW'],
    weights: {
      finishing: 3,
      dribbling: 3,
      pace: 3,
      acceleration: 3,
      firstTouch: 2,
      composure: 2,
      technique: 2,
    },
  },
  {
    key: 'FW_ADVANCED_PLAYMAKER',
    label: 'Fulcro del gioco',
    positions: ['FW', 'MF'],
    weights: {
      creativity: 4,
      vision: 3,
      technique: 3,
      shortPassing: 3,
      composure: 2,
      firstTouch: 2,
    },
  },
];

/** How much a role loses when it is not natural for the player's position. */
const OUT_OF_POSITION_PENALTY = 0.65;

export interface RoleRating {
  key: string;
  label: string;
  /** 0-5 in half steps. */
  stars: number;
  /** True when the role suits the position the player actually plays. */
  natural: boolean;
}

/**
 * Rate every role, best first. `values` maps attribute keys to 0-20.
 *
 * A rating is the weighted mean of the role's attributes, so a player good at
 * exactly the things a role needs tops out at five stars — and one who is good
 * at everything else does not.
 */
export function rateRoles(
  values: Readonly<Record<string, number>>,
  position: string,
): RoleRating[] {
  return PLAYER_ROLES.map((role) => {
    let total = 0;
    let weight = 0;
    for (const [key, w] of Object.entries(role.weights)) {
      total += (values[key] ?? 0) * w;
      weight += w;
    }
    const mean = weight > 0 ? total / weight : 0;
    const natural = role.positions.includes(position);
    // 0-20 to 0-5, halved when the player would be learning the role from
    // scratch in a position he does not play.
    const scaled = (mean / 4) * (natural ? 1 : OUT_OF_POSITION_PENALTY);
    return {
      key: role.key,
      label: role.label,
      stars: Math.round(Math.min(5, Math.max(0, scaled)) * 2) / 2,
      natural,
    };
  }).sort((a, b) => b.stars - a.stars || a.label.localeCompare(b.label, 'it'));
}

export interface PlayerTrait {
  key: string;
  label: string;
  /** Every attribute here must reach its threshold, on the 0-20 scale. */
  needs: Readonly<Record<string, number>>;
}

/**
 * The habits a player picks up: things a commentator would say about him.
 * A trait is earned, not assigned — it appears the season the attributes
 * behind it get there, and it goes away if he declines.
 */
export const PLAYER_TRAITS: readonly PlayerTrait[] = [
  {
    key: 'RUNS_CHANNELS',
    label: 'Si muove negli spazi',
    needs: { anticipation: 14, acceleration: 13 },
  },
  { key: 'LONG_SHOTS', label: 'Tira dalla distanza', needs: { longShots: 15 } },
  {
    key: 'SHOOTS_POWER',
    label: 'Tira con potenza',
    needs: { longShots: 13, strength: 14 },
  },
  {
    key: 'BEATS_MAN',
    label: 'Salta l’uomo',
    needs: { dribbling: 15, agility: 13 },
  },
  {
    key: 'PLACES_SHOTS',
    label: 'Cerca l’angolino',
    needs: { finishing: 15, composure: 13 },
  },
  {
    key: 'ONE_TOUCH',
    label: 'Gioca di prima',
    needs: { firstTouch: 15, shortPassing: 14 },
  },
  {
    key: 'KILLER_BALL',
    label: 'Cerca il passaggio filtrante',
    needs: { vision: 15, longPassing: 13 },
  },
  {
    key: 'SWITCHES_PLAY',
    label: 'Cambia gioco',
    needs: { longPassing: 15, vision: 13 },
  },
  {
    key: 'TRIES_TRICKS',
    label: 'Prova la giocata',
    needs: { creativity: 15, technique: 14 },
  },
  {
    key: 'DICTATES_TEMPO',
    label: 'Detta i tempi',
    needs: { composure: 14, decisions: 14, shortPassing: 14 },
  },
  {
    key: 'ARRIVES_LATE',
    label: 'Si inserisce da dietro',
    needs: { stamina: 14, anticipation: 13, longShots: 12 },
  },
  {
    key: 'STAYS_UP',
    label: 'Rimane avanti',
    needs: { strength: 14, heading: 14 },
  },
  {
    key: 'GETS_FORWARD',
    label: 'Si spinge in avanti',
    needs: { stamina: 15, pace: 13 },
  },
  {
    key: 'DIVES_IN',
    label: 'Va in scivolata',
    needs: { tackling: 15, bravery: 14 },
  },
  {
    key: 'MARKS_TIGHT',
    label: 'Marca stretto',
    needs: { marking: 15, concentration: 13 },
  },
  {
    key: 'WINS_HEADERS',
    label: 'Domina di testa',
    needs: { heading: 15, jumping: 14 },
  },
  {
    key: 'NEVER_GIVES_UP',
    label: 'Non molla mai',
    needs: { determination: 16 },
  },
  {
    key: 'BIG_GAMES',
    label: 'Si esalta nelle grandi partite',
    needs: { pressureHandling: 15, composure: 14 },
  },
  {
    key: 'LEADS',
    label: 'Trascina la squadra',
    needs: { leadership: 15, determination: 13 },
  },
  {
    key: 'TAKES_PENALTIES',
    label: 'Si prende i rigori',
    needs: { penalties: 15, composure: 13 },
  },
  {
    key: 'TAKES_SET_PIECES',
    label: 'Batte i calci piazzati',
    needs: { setPieces: 15 },
  },
  {
    key: 'TAKES_CORNERS',
    label: 'Batte i corner',
    needs: { crossing: 15, setPieces: 13 },
  },
  {
    key: 'CONSISTENT',
    label: 'Non sbaglia una partita',
    needs: { concentration: 15, professionalism: 15 },
  },
  {
    key: 'IRON_MAN',
    label: 'Non si ferma mai',
    needs: { injuryResistance: 15, physicalRecovery: 14 },
  },
];

/** The traits this player has earned, in catalogue order. */
export function traitsOf(
  values: Readonly<Record<string, number>>,
): { key: string; label: string }[] {
  return PLAYER_TRAITS.filter((trait) =>
    Object.entries(trait.needs).every(
      ([key, min]) => (values[key] ?? 0) >= min,
    ),
  ).map((trait) => ({ key: trait.key, label: trait.label }));
}

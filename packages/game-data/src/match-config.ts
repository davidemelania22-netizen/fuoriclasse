import type { MatchConfig } from '@football-life/shared';

/** Default, validated match-engine balance parameters. */
export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  baseGoals: 1.35,
  homeAdvantage: 6,
  strengthSpread: 30,
  minXg: 0.2,
  maxXg: 4.5,
  assistProbability: 0.72,
  formation: { GK: 1, DF: 4, MF: 3, WG: 2, FW: 1 },
  departmentWeights: { attack: 0.6, midfield: 0.4, defense: 0.6 },
  selectionWeights: {
    ability: 0.62,
    form: 0.2,
    condition: 0.13,
    randomness: 0.05,
  },
  individual: {
    chanceExponent: 2.4,
    chanceReference: 60,
    starWeight: 0.3,
    starShare: 0.3,
    ratingPerAbility: 1 / 26,
  },
  rating: {
    base: 6.1,
    noise: 0.5,
    winBonus: 0.4,
    drawBonus: 0.0,
    lossPenalty: -0.4,
    goalBonus: 0.85,
    assistBonus: 0.45,
    concededPenalty: 0.22,
    min: 3,
    max: 10,
  },
  cards: {
    baseYellow: 0.14,
    baseRed: 0.012,
    disciplineFactor: 0.8,
  },
};

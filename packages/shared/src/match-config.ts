import { z } from 'zod';

const formationSchema = z.object({
  GK: z.number().int().min(1).max(1),
  DF: z.number().int().min(0),
  MF: z.number().int().min(0),
  WG: z.number().int().min(0),
  FW: z.number().int().min(0),
});

export const matchConfigSchema = z.object({
  /** Average goals a team is expected to score in a neutral, even match. */
  baseGoals: z.number().positive(),
  /** Home edge in rating points added to the home side's balance. */
  homeAdvantage: z.number(),
  /** Rating-point gap that doubles a team's expected goals. */
  strengthSpread: z.number().positive(),
  minXg: z.number().min(0),
  maxXg: z.number().positive(),
  /** Probability a goal has a (distinct) assisting team-mate. */
  assistProbability: z.number().min(0).max(1),
  formation: formationSchema,
  departmentWeights: z.object({
    attack: z.number(),
    midfield: z.number(),
    defense: z.number(),
  }),
  selectionWeights: z.object({
    ability: z.number(),
    form: z.number(),
    condition: z.number(),
    randomness: z.number(),
  }),
  /** How decisive individual quality is, rather than the squad average. */
  individual: z.object({
    /**
     * Exponent on a player's ability when picking who scores or assists.
     * 1 is linear (a 100 is twice a 50); above 1 a great player takes a
     * disproportionate share of his team's chances, as they do in reality.
     */
    chanceExponent: z.number().positive(),
    /** Ability that maps to weight 1 before the exponent is applied. */
    chanceReference: z.number().positive(),
    /**
     * How much of a team's strength comes from its best players rather than
     * from the flat average of the eleven. 0 = pure mean.
     */
    starWeight: z.number().min(0).max(1),
    /**
     * What fraction of a group counts as "the best" for starWeight. A share
     * rather than a count, so a three-man attack and a five-man defence are
     * lifted alike — a fixed count silently strengthened only the defence.
     */
    starShare: z.number().min(0).max(1),
    /**
     * Rating points gained per point of ability above the team average.
     * Larger values make a standout player's mark visibly higher.
     */
    ratingPerAbility: z.number().positive(),
  }),
  rating: z.object({
    base: z.number(),
    noise: z.number().min(0),
    winBonus: z.number(),
    drawBonus: z.number(),
    lossPenalty: z.number(),
    goalBonus: z.number(),
    assistBonus: z.number(),
    concededPenalty: z.number(),
    min: z.number(),
    max: z.number(),
  }),
  cards: z.object({
    baseYellow: z.number().min(0),
    baseRed: z.number().min(0),
    disciplineFactor: z.number(),
  }),
});

export type Formation = z.infer<typeof formationSchema>;
export type MatchConfig = z.infer<typeof matchConfigSchema>;

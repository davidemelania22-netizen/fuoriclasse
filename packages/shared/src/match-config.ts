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

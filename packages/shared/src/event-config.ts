import { z } from 'zod';

export const eventConditionSchema = z.object({
  field: z.string(),
  op: z.enum(['lt', 'lte', 'gt', 'gte', 'eq', 'neq']),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

export const eventTriggerSchema = z.object({
  all: z.array(eventConditionSchema).optional(),
  any: z.array(eventConditionSchema).optional(),
});

export const eventConsequenceSchema = z.object({
  morale: z.number().optional(),
  stress: z.number().optional(),
  happiness: z.number().optional(),
  mentalHealth: z.number().optional(),
  motivation: z.number().optional(),
  reputation: z.number().optional(),
  popularity: z.number().optional(),
  money: z.number().optional(),
});

/**
 * A choice that is a real gamble: the odds are declared up front so the player
 * bets with open eyes. `consequences` on the choice still apply whatever
 * happens (the price of trying); the branch below is what luck decides.
 */
export const eventGambleSchema = z.object({
  /** Probability the bet pays off, 0.05-0.95 — never a certainty either way. */
  successChance: z.number().min(0.05).max(0.95),
  successLabel: z.string(),
  failureLabel: z.string(),
  success: eventConsequenceSchema,
  failure: eventConsequenceSchema,
});

export const eventChoiceSchema = z.object({
  key: z.string(),
  label: z.string(),
  consequences: eventConsequenceSchema,
  gamble: eventGambleSchema.optional(),
});

export const gameEventDefinitionSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  descriptionTemplate: z.string(),
  trigger: eventTriggerSchema,
  weight: z.number().positive(),
  cooldownWeeks: z.number().int().min(0),
  maxOccurrencesPerCareer: z.number().int().positive().optional(),
  mutuallyExclusiveWith: z.array(z.string()).optional(),
  choices: z.array(eventChoiceSchema).min(1),
});

export type EventCondition = z.infer<typeof eventConditionSchema>;
export type EventTrigger = z.infer<typeof eventTriggerSchema>;
export type EventConsequence = z.infer<typeof eventConsequenceSchema>;
export type EventGamble = z.infer<typeof eventGambleSchema>;
export type EventChoice = z.infer<typeof eventChoiceSchema>;
export type GameEventDefinition = z.infer<typeof gameEventDefinitionSchema>;

/**
 * The slice of game state evaluated by event triggers and interpolated into
 * event text. Numeric/boolean/string fields can all be matched by conditions;
 * string fields (clubName, leagueName, firstName, …) double as template vars.
 */
export interface EventContext {
  age: number;
  morale: number;
  stress: number;
  happiness: number;
  mentalHealth: number;
  motivation: number;
  reputation: number;
  popularity: number;
  currentAbility: number;
  money: number;
  careerStatus: string;
  hasClub: boolean;
  clubReputation: number;
  weekIndex: number;
  // --- dynamic situation (added in "Eventi vivi") ---
  form: number;
  condition: number;
  fatigue: number;
  isInjured: boolean;
  /** PRESEASON | WINTER_WINDOW | RUN_IN | SEASON */
  seasonPhase: string;
  marketValue: number;
  /** Active-contract squad role, or '' when none. */
  squadRole: string;
  /** Whole years left on the active contract, or 0. */
  contractYearsLeft: number;
  /** Chosen off-pitch lifestyle key, or '' when none (gates media events). */
  lifestyle: string;
  // --- narrative vars (also usable in triggers) ---
  clubName: string;
  leagueName: string;
  firstName: string;
}

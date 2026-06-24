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

export const eventChoiceSchema = z.object({
  key: z.string(),
  label: z.string(),
  consequences: eventConsequenceSchema,
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
export type EventChoice = z.infer<typeof eventChoiceSchema>;
export type GameEventDefinition = z.infer<typeof gameEventDefinitionSchema>;

/** The slice of game state evaluated by event triggers. */
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
}

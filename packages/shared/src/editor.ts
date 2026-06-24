import { z } from 'zod';

/** A single attribute edit. */
export const attributeEditSchema = z.object({
  key: z.string().min(1),
  value: z.number(),
});

/** Partial edit of the protagonist; every field is optional. */
export const playerEditInputSchema = z.object({
  currentAbility: z.number().optional(),
  potentialAbility: z.number().optional(),
  condition: z.number().optional(),
  fatigue: z.number().optional(),
  morale: z.number().optional(),
  form: z.number().optional(),
  stress: z.number().optional(),
  motivation: z.number().optional(),
  reputation: z.number().optional(),
  popularity: z.number().optional(),
  marketValue: z.number().optional(),
  careerStatus: z
    .enum(['YOUTH', 'ACTIVE', 'INJURED', 'RETIRED', 'UNEMPLOYED'])
    .optional(),
  attributes: z.array(attributeEditSchema).optional(),
});

export type PlayerEditInput = z.infer<typeof playerEditInputSchema>;

/** Full editable snapshot of the protagonist returned by the editor API. */
export interface EditableAttribute {
  key: string;
  value: number;
  category: string;
}

export interface EditablePlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  currentAbility: number;
  potentialAbility: number;
  condition: number;
  fatigue: number;
  morale: number;
  form: number;
  stress: number;
  motivation: number;
  reputation: number;
  popularity: number;
  marketValue: number;
  careerStatus: string;
  attributes: EditableAttribute[];
}

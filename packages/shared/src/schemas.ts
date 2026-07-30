import { z } from 'zod';
import { COUNTRY_CODES, PlayerPosition, PreferredFoot } from './enums';
import { QUICK_START_KEYS } from './quick-start';

const enumValues = <T extends string>(obj: Record<string, T>): [T, ...T[]] =>
  Object.values(obj) as [T, ...T[]];

export const newGamePlayerInputSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  lastName: z.string().trim().min(1).max(40),
  nationalityId: z.enum(COUNTRY_CODES),
  primaryPosition: z.enum(enumValues(PlayerPosition)),
  preferredFoot: z.enum(enumValues(PreferredFoot)),
});

export const newGameInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  seed: z.string().trim().min(1).max(120).optional(),
  player: newGamePlayerInputSchema,
  quickStart: z.enum(QUICK_START_KEYS).optional(),
});

export type NewGamePlayerInput = z.infer<typeof newGamePlayerInputSchema>;
export type NewGameInput = z.infer<typeof newGameInputSchema>;

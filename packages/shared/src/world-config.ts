import { z } from 'zod';

/** Per-country pools of invented, license-free names used by the generator. */
export const namePoolSchema = z.object({
  firstNames: z.array(z.string().min(1)).min(1),
  lastNames: z.array(z.string().min(1)).min(1),
  cities: z.array(z.string().min(1)).min(1),
  /** Club names guaranteed to appear in the country's top division, in order. */
  featuredClubs: z.array(z.string().min(1)).optional(),
  /** Club names guaranteed in the second division, in order. */
  secondDivisionClubs: z.array(z.string().min(1)).optional(),
});

/** Fully configurable, validated parameters for procedural world generation. */
export const worldGenerationConfigSchema = z.object({
  /** ISO date (YYYY-MM-DD) on which the first season starts. */
  seasonStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seasonLengthDays: z.number().int().positive(),
  clubsPerTopDivision: z.number().int().min(2),
  clubsPerSecondDivision: z.number().int().min(0),
  rosterSize: z.number().int().min(11),
  age: z.object({
    min: z.number().int().min(15),
    max: z.number().int().max(45),
    mean: z.number(),
    spread: z.number().positive(),
  }),
  ability: z.object({
    topDivisionMean: z.number(),
    divisionStep: z.number(),
    spread: z.number().positive(),
    min: z.number(),
    max: z.number(),
  }),
  reputation: z.object({
    topDivision: z.number().int(),
    secondDivision: z.number().int(),
    youth: z.number().int(),
  }),
  namePools: z.record(z.string(), namePoolSchema),
});

export type NamePool = z.infer<typeof namePoolSchema>;
export type WorldGenerationConfig = z.infer<typeof worldGenerationConfigSchema>;

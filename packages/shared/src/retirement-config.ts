import { z } from 'zod';

export const retirementConfigSchema = z.object({
  minRetirementAge: z.number().int(),
  forcedRetirementAge: z.number().int(),
  /** Ability drop from peak that makes retirement markedly more likely. */
  abilityDeclineThreshold: z.number(),
  /** Added retirement probability for each year past the minimum age. */
  baseChancePerYearOver: z.number().min(0),
  /** Extra probability when decline exceeds the threshold. */
  declineChanceBonus: z.number().min(0),
});

export type RetirementConfig = z.infer<typeof retirementConfigSchema>;

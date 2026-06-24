import type { RetirementConfig } from '@football-life/shared';

/** Default, validated retirement parameters. */
export const DEFAULT_RETIREMENT_CONFIG: RetirementConfig = {
  minRetirementAge: 31,
  forcedRetirementAge: 42,
  abilityDeclineThreshold: 12,
  baseChancePerYearOver: 0.12,
  declineChanceBonus: 0.2,
};

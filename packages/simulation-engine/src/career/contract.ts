import { SquadRole, type CareerConfig } from '@football-life/shared';

const WEEK_MS = 7 * 86_400_000;

export interface ContractTermsInput {
  currentAbility: number;
  age: number;
  clubReputation: number;
  clubStrength: number;
}

export interface ContractTerms {
  weeklyWage: number;
  signingBonus: number;
  appearanceBonus: number;
  goalBonus: number;
  years: number;
  squadRole: SquadRole;
}

export function recommendSquadRole(
  currentAbility: number,
  clubStrength: number,
  age: number,
): SquadRole {
  const diff = currentAbility - clubStrength;
  if (diff >= 6) return SquadRole.Key;
  if (diff >= -3) return SquadRole.FirstTeam;
  if (diff >= -10) return SquadRole.Rotation;
  return age <= 20 ? SquadRole.Prospect : SquadRole.Backup;
}

export function recommendContractTerms(
  input: ContractTermsInput,
  config: CareerConfig,
): ContractTerms {
  const w = config.wage;
  const role = recommendSquadRole(
    input.currentAbility,
    input.clubStrength,
    input.age,
  );
  const roleMultiplier = w.roleMultipliers[role] ?? 1;
  const clubRepFactor =
    0.6 + 0.4 * (input.clubReputation / w.clubReferenceReputation);
  const weeklyWage = Math.round(
    w.base +
      Math.max(0, input.currentAbility - w.abilityFloor) ** w.abilityExponent *
        w.scale *
        clubRepFactor *
        roleMultiplier,
  );

  return {
    weeklyWage,
    signingBonus: Math.round(weeklyWage * config.contract.signingBonusWeeks),
    appearanceBonus: Math.round(
      weeklyWage * config.contract.appearanceBonusFactor,
    ),
    goalBonus: Math.round(weeklyWage * config.contract.goalBonusFactor),
    years: config.contract.defaultYears,
    squadRole: role,
  };
}

export function weeksUntilExpiry(endDate: Date, currentDate: Date): number {
  return Math.floor((endDate.getTime() - currentDate.getTime()) / WEEK_MS);
}

export function isExpiringSoon(
  endDate: Date,
  currentDate: Date,
  config: CareerConfig,
): boolean {
  const weeks = weeksUntilExpiry(endDate, currentDate);
  return weeks <= config.contract.renewalExpiryWeeks;
}

/** Map a squad role to a 0-100 "contract importance" used by selection. */
export function squadRoleImportance(role: SquadRole): number {
  switch (role) {
    case SquadRole.Key:
      return 95;
    case SquadRole.FirstTeam:
      return 78;
    case SquadRole.Rotation:
      return 55;
    case SquadRole.Backup:
      return 35;
    case SquadRole.Prospect:
      return 25;
    default:
      return 50;
  }
}

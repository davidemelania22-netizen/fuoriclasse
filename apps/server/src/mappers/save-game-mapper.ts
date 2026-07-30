import type { Person, Player, SaveGame } from '@prisma/client';
import type {
  CareerStatus,
  PlayerPosition,
  PlayerSummary,
  PreferredFoot,
  SaveGameSummary,
} from '@football-life/shared';

export function toSaveGameSummary(save: SaveGame): SaveGameSummary {
  return {
    id: save.id,
    name: save.name,
    seed: save.seed,
    currentDate: save.currentDate.toISOString(),
    playerPersonId: save.playerPersonId,
    simulationVersion: save.simulationVersion,
    isCompleted: save.isCompleted,
    createdAt: save.createdAt.toISOString(),
    updatedAt: save.updatedAt.toISOString(),
    lastPlayedAt: save.lastPlayedAt.toISOString(),
  };
}

function ageInYears(birthDate: Date, at: Date): number {
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = at.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && at.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export function toPlayerSummary(
  player: Player,
  person: Person,
  at: Date,
  clubName: string | null = null,
): PlayerSummary {
  return {
    id: player.id,
    personId: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    birthDate: person.birthDate.toISOString(),
    ageYears: ageInYears(person.birthDate, at),
    nationalityId: person.nationalityId,
    primaryPosition: player.primaryPosition as PlayerPosition,
    preferredFoot: player.preferredFoot as PreferredFoot,
    careerStatus: player.careerStatus as CareerStatus,
    currentAbility: player.currentAbility,
    potentialAbility: player.potentialAbility,
    clubId: player.clubId,
    clubName,
    condition: player.condition,
    fatigue: player.fatigue,
    morale: player.morale,
    form: player.form,
    stress: player.stress,
    marketValue: player.marketValue,
  };
}

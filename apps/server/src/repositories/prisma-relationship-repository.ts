import type { Prisma, PrismaClient } from '@prisma/client';
import { PersonType, RelationshipStatus } from '@football-life/shared';
import type { RelationshipState } from '@football-life/simulation-engine';
import type {
  CreateFamilyMemberInput,
  RelationshipRepository,
  RelationshipSnapshot,
} from './relationship-repository';

const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export class PrismaRelationshipRepository implements RelationshipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getProtagonistPersonId(saveGameId: string): Promise<string | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    return save?.playerPersonId ?? null;
  }

  async createFamilyMember(
    input: CreateFamilyMemberInput,
  ): Promise<string | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: input.saveGameId },
    });
    if (!save || !save.playerPersonId) return null;

    const protagonist = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
    });
    if (!protagonist) return null;

    return this.prisma.$transaction(async (tx) => {
      const familyMember = await tx.person.create({
        data: {
          saveGameId: input.saveGameId,
          firstName: input.firstName,
          lastName: input.lastName,
          birthDate: new Date(
            Date.UTC(save.currentDate.getUTCFullYear() - 40, 0, 1),
          ),
          nationalityId: protagonist.nationalityId,
          personType: PersonType.Family,
          personalityProfile: j({}),
        },
      });

      const relationship = await tx.relationship.create({
        data: {
          saveGameId: input.saveGameId,
          sourcePersonId: save.playerPersonId!,
          targetPersonId: familyMember.id,
          relationshipType: input.relationshipType,
          affinity: input.initial.affinity,
          trust: input.initial.trust,
          conflict: input.initial.conflict,
          influence: input.initial.influence,
          status: RelationshipStatus.Active,
          startedAt: save.currentDate,
        },
      });
      return relationship.id;
    });
  }

  async getRelationship(
    relationshipId: string,
  ): Promise<RelationshipSnapshot | null> {
    const relationship = await this.prisma.relationship.findUnique({
      where: { id: relationshipId },
    });
    if (!relationship) return null;
    return {
      id: relationship.id,
      affinity: relationship.affinity,
      trust: relationship.trust,
      conflict: relationship.conflict,
      influence: relationship.influence,
    };
  }

  async updateRelationship(
    relationshipId: string,
    state: RelationshipState,
  ): Promise<void> {
    await this.prisma.relationship.update({
      where: { id: relationshipId },
      data: {
        affinity: Math.round(state.affinity),
        trust: Math.round(state.trust),
        conflict: Math.round(state.conflict),
        influence: Math.round(state.influence),
      },
    });
  }
}

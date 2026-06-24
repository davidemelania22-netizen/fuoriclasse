import type { WellbeingConfig } from '@football-life/shared';
import {
  applyRelationshipInteraction,
  type RelationshipInteraction,
} from '@football-life/simulation-engine';
import type {
  RelationshipRepository,
  RelationshipSnapshot,
} from '../repositories/relationship-repository';

export interface RelationshipDeps {
  repository: RelationshipRepository;
  config: WellbeingConfig;
}

export async function createFamilyRelationship(
  deps: RelationshipDeps,
  input: {
    saveGameId: string;
    firstName: string;
    lastName: string;
    relationshipType: string;
  },
): Promise<string | null> {
  return deps.repository.createFamilyMember({
    saveGameId: input.saveGameId,
    firstName: input.firstName,
    lastName: input.lastName,
    relationshipType: input.relationshipType,
    initial: { affinity: 50, trust: 50, conflict: 5, influence: 40 },
  });
}

export async function recordRelationshipInteraction(
  deps: RelationshipDeps,
  input: { relationshipId: string; interaction: RelationshipInteraction },
): Promise<RelationshipSnapshot | null> {
  const relationship = await deps.repository.getRelationship(
    input.relationshipId,
  );
  if (!relationship) return null;

  const next = applyRelationshipInteraction(
    {
      affinity: relationship.affinity,
      trust: relationship.trust,
      conflict: relationship.conflict,
      influence: relationship.influence,
    },
    input.interaction,
    deps.config,
  );
  await deps.repository.updateRelationship(input.relationshipId, next);

  return { id: relationship.id, ...next };
}

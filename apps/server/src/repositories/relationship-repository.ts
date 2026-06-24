import type { RelationshipState } from '@football-life/simulation-engine';

export interface RelationshipSnapshot extends RelationshipState {
  id: string;
}

export interface CreateFamilyMemberInput {
  saveGameId: string;
  firstName: string;
  lastName: string;
  relationshipType: string;
  initial: RelationshipState;
}

export interface RelationshipRepository {
  getProtagonistPersonId(saveGameId: string): Promise<string | null>;
  createFamilyMember(input: CreateFamilyMemberInput): Promise<string | null>;
  getRelationship(relationshipId: string): Promise<RelationshipSnapshot | null>;
  updateRelationship(
    relationshipId: string,
    state: RelationshipState,
  ): Promise<void>;
}

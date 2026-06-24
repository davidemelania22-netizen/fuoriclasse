import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NewGameInput } from '@football-life/shared';
import { DEFAULT_WELLBEING_CONFIG } from '@football-life/game-data';
import { PrismaRelationshipRepository } from '../repositories/prisma-relationship-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import {
  createFamilyRelationship,
  recordRelationshipInteraction,
} from './relationships';

const newGame: NewGameInput = {
  name: 'Relationship Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('relationships', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('creates a family relationship and updates it on interaction', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaRelationshipRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const relationshipId = await createFamilyRelationship(
      { repository: repo, config: DEFAULT_WELLBEING_CONFIG },
      {
        saveGameId: game.save.id,
        firstName: 'Papa',
        lastName: 'Player',
        relationshipType: 'FAMILY',
      },
    );
    expect(relationshipId).not.toBeNull();

    const positive = await recordRelationshipInteraction(
      { repository: repo, config: DEFAULT_WELLBEING_CONFIG },
      { relationshipId: relationshipId!, interaction: 'POSITIVE' },
    );
    expect(positive!.affinity).toBeGreaterThan(50);

    const persisted = await db.prisma.relationship.findUnique({
      where: { id: relationshipId! },
    });
    expect(persisted?.affinity).toBe(positive!.affinity);

    const conflict = await recordRelationshipInteraction(
      { repository: repo, config: DEFAULT_WELLBEING_CONFIG },
      { relationshipId: relationshipId!, interaction: 'CONFLICT' },
    );
    expect(conflict!.conflict).toBeGreaterThan(5);
  });
});

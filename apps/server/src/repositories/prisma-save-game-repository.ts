import type { Prisma, PrismaClient } from '@prisma/client';
import type { LoadedGame, SaveGameSummary } from '@football-life/shared';
import {
  toPlayerSummary,
  toSaveGameSummary,
} from '../mappers/save-game-mapper';
import type {
  NewGamePersistenceInput,
  SaveGameRepository,
} from './save-game-repository';

const asJson = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export class PrismaSaveGameRepository implements SaveGameRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async persistNewGame(input: NewGamePersistenceInput): Promise<LoadedGame> {
    const { save, person, player, attributes } = input;

    return this.prisma.$transaction(async (tx) => {
      const createdSave = await tx.saveGame.create({
        data: {
          name: save.name,
          seed: save.seed,
          currentDate: save.currentDate,
          simulationVersion: save.simulationVersion,
          lastPlayedAt: save.lastPlayedAt,
        },
      });

      const createdPerson = await tx.person.create({
        data: {
          saveGameId: createdSave.id,
          firstName: person.firstName,
          lastName: person.lastName,
          birthDate: person.birthDate,
          nationalityId: person.nationalityId,
          secondaryNationalityId: person.secondaryNationalityId ?? null,
          personType: person.personType,
          personalityProfile: asJson(person.personalityProfile),
        },
      });

      const createdPlayer = await tx.player.create({
        data: {
          personId: createdPerson.id,
          saveGameId: createdSave.id,
          primaryPosition: player.primaryPosition,
          secondaryPositions: asJson(player.secondaryPositions),
          preferredFoot: player.preferredFoot,
          heightCm: player.heightCm,
          weightKg: player.weightKg,
          currentAbility: player.currentAbility,
          potentialAbility: player.potentialAbility,
          reputation: player.reputation,
          popularity: player.popularity,
          marketValue: player.marketValue,
          condition: player.condition,
          fatigue: player.fatigue,
          morale: player.morale,
          form: player.form,
          confidence: player.confidence,
          motivation: player.motivation,
          stress: player.stress,
          happiness: player.happiness,
          mentalHealth: player.mentalHealth,
          careerStatus: player.careerStatus,
          attributes: {
            create: attributes.map((attribute) => ({
              attributeKey: attribute.attributeKey,
              value: attribute.value,
              category: attribute.category,
            })),
          },
        },
      });

      const updatedSave = await tx.saveGame.update({
        where: { id: createdSave.id },
        data: { playerPersonId: createdPerson.id },
      });

      return {
        save: toSaveGameSummary(updatedSave),
        player: toPlayerSummary(
          createdPlayer,
          createdPerson,
          updatedSave.currentDate,
        ),
      };
    });
  }

  async loadGame(saveGameId: string): Promise<LoadedGame | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save || !save.playerPersonId) {
      return null;
    }

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: true },
    });
    if (!person || !person.player) {
      return null;
    }

    return {
      save: toSaveGameSummary(save),
      player: toPlayerSummary(person.player, person, save.currentDate),
    };
  }

  async listSaves(): Promise<SaveGameSummary[]> {
    const saves = await this.prisma.saveGame.findMany({
      orderBy: { lastPlayedAt: 'desc' },
    });
    return saves.map(toSaveGameSummary);
  }

  async deleteSave(saveGameId: string): Promise<void> {
    await this.prisma.saveGame.delete({ where: { id: saveGameId } });
  }
}

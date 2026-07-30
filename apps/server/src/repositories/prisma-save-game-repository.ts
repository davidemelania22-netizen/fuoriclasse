import type { Prisma, PrismaClient } from '@prisma/client';
import {
  FinancialTransactionType,
  type LoadedGame,
  type SaveGameSummary,
} from '@football-life/shared';
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
    const { save, person, player, attributes, startingBalance } = input;

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

      if (startingBalance !== 0) {
        await tx.financialTransaction.create({
          data: {
            saveGameId: createdSave.id,
            playerId: createdPlayer.id,
            occurredAt: createdSave.currentDate,
            type: FinancialTransactionType.Bonus,
            amount: Math.round(startingBalance),
            description: 'Indennità iniziale',
            referenceType: 'System',
          },
        });
      }

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
    if (!save || save.isDeleted || !save.playerPersonId) {
      return null;
    }

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    if (!person || !person.player) {
      return null;
    }

    return {
      save: toSaveGameSummary(save),
      player: toPlayerSummary(
        person.player,
        person,
        save.currentDate,
        person.player.club?.name ?? null,
      ),
    };
  }

  async listSaves(): Promise<SaveGameSummary[]> {
    const saves = await this.prisma.saveGame.findMany({
      where: { isDeleted: false },
      orderBy: { lastPlayedAt: 'desc' },
    });
    return saves.map(toSaveGameSummary);
  }

  /**
   * Soft-deletes: the save disappears from every list instantly. The heavy
   * row cleanup (a career can span ~100k interleaved rows — minutes of page
   * churn on a big SQLite file) is done later by {@link purgeDeletedSaves}.
   */
  async deleteSave(saveGameId: string): Promise<boolean> {
    // Guard against the catastrophic Prisma footgun: an undefined/empty id in
    // a `where` is silently DROPPED by Prisma, turning this updateMany into
    // "soft-delete EVERY save". Never allow a non-specific delete through.
    if (typeof saveGameId !== 'string' || saveGameId.length === 0) {
      throw new Error('deleteSave requires a specific save id');
    }
    const result = await this.prisma.saveGame.updateMany({
      where: { id: saveGameId, isDeleted: false },
      data: { isDeleted: true },
    });
    return result.count > 0;
  }

  /**
   * Hard-deletes every soft-deleted save's rows, leaves-first so no FK
   * cascade ever fires. Each statement commits on its own, letting the WAL
   * checkpoint between steps. Safe to re-run; meant to be fired in the
   * background (never awaited by a request handler).
   */
  async purgeDeletedSaves(): Promise<number> {
    const deleted = await this.prisma.saveGame.findMany({
      where: { isDeleted: true },
      select: { id: true },
    });

    for (const { id } of deleted) {
      const where = { saveGameId: id };
      await this.prisma.matchAppearance.deleteMany({
        where: { fixture: { saveGameId: id } },
      });
      await this.prisma.playerAttribute.deleteMany({
        where: { player: { saveGameId: id } },
      });
      await this.prisma.playerSeasonStats.deleteMany({
        where: { player: { saveGameId: id } },
      });
      await this.prisma.standing.deleteMany({
        where: { season: { saveGameId: id } },
      });
      await this.prisma.injury.deleteMany({ where });
      await this.prisma.contract.deleteMany({ where });
      await this.prisma.transferOffer.deleteMany({ where });
      await this.prisma.financialTransaction.deleteMany({ where });
      await this.prisma.decisionLog.deleteMany({ where });
      await this.prisma.simulationLog.deleteMany({ where });
      await this.prisma.fixture.deleteMany({ where });
      await this.prisma.season.deleteMany({ where });
      await this.prisma.gameEvent.deleteMany({ where });
      await this.prisma.eventCooldown.deleteMany({ where });
      await this.prisma.relationship.deleteMany({ where });
      await this.prisma.newsItem.deleteMany({ where });
      await this.prisma.honour.deleteMany({ where });
      await this.prisma.player.deleteMany({ where });
      await this.prisma.club.deleteMany({ where });
      await this.prisma.person.deleteMany({ where });
      await this.prisma.competition.deleteMany({ where });
      await this.prisma.saveGame.delete({ where: { id } });
    }
    return deleted.length;
  }
}

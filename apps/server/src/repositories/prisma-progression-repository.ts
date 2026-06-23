import type { PrismaClient } from '@prisma/client';
import type { AttributeCategory } from '@football-life/shared';
import type { AttributeValue } from '@football-life/simulation-engine';
import type {
  ProgressionRepository,
  ProtagonistSnapshot,
  WeeklyUpdate,
} from './progression-repository';

export class PrismaProgressionRepository implements ProgressionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadProtagonist(
    saveGameId: string,
  ): Promise<ProtagonistSnapshot | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save || !save.playerPersonId) {
      return null;
    }

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: {
        player: { include: { attributes: true, club: true } },
      },
    });
    if (!person || !person.player) {
      return null;
    }

    const player = person.player;
    const attributes: AttributeValue[] = player.attributes.map((attribute) => ({
      key: attribute.attributeKey,
      value: attribute.value,
      category: attribute.category as AttributeCategory,
    }));

    return {
      saveGameId,
      playerId: player.id,
      currentDate: save.currentDate,
      birthDate: person.birthDate,
      currentAbility: player.currentAbility,
      potentialAbility: player.potentialAbility,
      condition: player.condition,
      fatigue: player.fatigue,
      morale: player.morale,
      motivation: player.motivation,
      attributes,
      club: player.club
        ? {
            trainingQuality: player.club.trainingQuality,
            staffQuality: player.club.academyQuality,
            medicalQuality: player.club.medicalQuality,
          }
        : null,
    };
  }

  async applyWeeklyUpdate(update: WeeklyUpdate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.player.update({
        where: { id: update.playerId },
        data: {
          currentAbility: update.currentAbility,
          condition: update.condition,
          fatigue: update.fatigue,
          motivation: update.motivation,
        },
      });

      for (const attribute of update.attributeValues) {
        await tx.playerAttribute.update({
          where: {
            playerId_attributeKey: {
              playerId: update.playerId,
              attributeKey: attribute.key,
            },
          },
          data: { value: attribute.value },
        });
      }

      await tx.saveGame.update({
        where: { id: update.saveGameId },
        data: {
          currentDate: update.newCurrentDate,
          lastPlayedAt: new Date(),
        },
      });
    });
  }
}

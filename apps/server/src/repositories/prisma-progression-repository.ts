import type { PrismaClient } from '@prisma/client';
import { InjuryStatus, type AttributeCategory } from '@football-life/shared';
import type { AttributeValue } from '@football-life/simulation-engine';
import type {
  InjuryTreatmentUpdate,
  ProgressionRepository,
  ProtagonistSnapshot,
  WeeklyUpdate,
} from './progression-repository';

const ACTIVE_INJURY_STATUSES = [InjuryStatus.Active, InjuryStatus.Recovering];
const WEEK_MS = 7 * 86_400_000;

function attributeValue(
  attributes: readonly { key: string; value: number }[],
  key: string,
  fallback: number,
): number {
  return attributes.find((a) => a.key === key)?.value ?? fallback;
}

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

    const injuryHistoryCount = await this.prisma.injury.count({
      where: { playerId: player.id },
    });
    const active = await this.prisma.injury.findFirst({
      where: { playerId: player.id, status: { in: ACTIVE_INJURY_STATUSES } },
      orderBy: { expectedEndAt: 'desc' },
    });
    const weeksRemaining = active
      ? Math.max(
          0,
          Math.ceil(
            (active.expectedEndAt.getTime() - save.currentDate.getTime()) /
              WEEK_MS,
          ),
        )
      : 0;
    const recentHealed = await this.prisma.injury.findFirst({
      where: {
        playerId: player.id,
        status: InjuryStatus.Healed,
        actualEndAt: { not: null },
      },
      orderBy: { actualEndAt: 'desc' },
    });

    // Minutes played in the fortnight before now — the "match fitness" that
    // feeds training growth. A benched player trains without this boost.
    const recentAppearances = await this.prisma.matchAppearance.aggregate({
      where: {
        playerId: player.id,
        fixture: {
          scheduledAt: {
            gt: new Date(save.currentDate.getTime() - 2 * WEEK_MS),
            lte: save.currentDate,
          },
        },
      },
      _sum: { minutesPlayed: true },
    });
    const recentMinutes = recentAppearances._sum.minutesPlayed ?? 0;

    return {
      saveGameId,
      seed: save.seed,
      playerId: player.id,
      currentDate: save.currentDate,
      birthDate: person.birthDate,
      currentAbility: player.currentAbility,
      potentialAbility: player.potentialAbility,
      condition: player.condition,
      fatigue: player.fatigue,
      morale: player.morale,
      motivation: player.motivation,
      stress: player.stress,
      mentalHealth: player.mentalHealth,
      careerStatus: player.careerStatus,
      injuryProneness: attributeValue(attributes, 'injuryProneness', 30),
      injuryHistoryCount,
      recentMinutes,
      activeInjury: active
        ? {
            id: active.id,
            typeKey: active.injuryTypeKey,
            weeksRemaining,
            severity: active.severity,
            recurrenceRisk: active.recurrenceRisk,
            treatmentChoice: active.treatmentChoice,
          }
        : null,
      recentlyHealedInjury:
        recentHealed && recentHealed.actualEndAt
          ? {
              typeKey: recentHealed.injuryTypeKey,
              actualEndAt: recentHealed.actualEndAt,
              recurrenceRisk: recentHealed.recurrenceRisk,
            }
          : null,
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
          morale: update.morale,
          stress: update.stress,
          mentalHealth: update.mentalHealth,
          careerStatus: update.careerStatus,
          retirementDate: update.retirementDate,
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

      for (const injury of update.injuriesToCreate) {
        await tx.injury.create({
          data: {
            saveGameId: update.saveGameId,
            playerId: update.playerId,
            injuryTypeKey: injury.typeKey,
            startedAt: injury.startedAt,
            expectedEndAt: injury.expectedEndAt,
            actualEndAt: injury.actualEndAt,
            severity: injury.severity,
            recurrenceRisk: injury.recurrenceRisk,
            status: injury.status,
          },
        });
      }

      for (const healed of update.healedInjuryIds) {
        await tx.injury.update({
          where: { id: healed.id },
          data: {
            status: InjuryStatus.Healed,
            actualEndAt: healed.actualEndAt,
          },
        });
      }

      await tx.saveGame.update({
        where: { id: update.saveGameId },
        data: {
          currentDate: update.newCurrentDate,
          lastPlayedAt: new Date(),
          ...(update.retired ? { isCompleted: true } : {}),
        },
      });
    });
  }

  async applyInjuryTreatment(update: InjuryTreatmentUpdate): Promise<void> {
    await this.prisma.injury.update({
      where: { id: update.injuryId },
      data: {
        treatmentChoice: update.treatmentChoice,
        expectedEndAt: update.expectedEndAt,
        recurrenceRisk: update.recurrenceRisk,
      },
    });
  }
}

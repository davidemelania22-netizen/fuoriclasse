import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { CareerStatus, PersonType } from '@football-life/shared';
import { chunk } from '@football-life/simulation-engine';
import type {
  AgingPlayer,
  NpcAgingPersistence,
  NpcAgingRepository,
  NpcAgingState,
} from './npc-aging-repository';

const BATCH = 500;
const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export class PrismaNpcAgingRepository implements NpcAgingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadAgingState(saveGameId: string): Promise<NpcAgingState | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save) return null;

    const players = await this.prisma.player.findMany({
      where: {
        saveGameId,
        careerStatus: CareerStatus.Active,
        clubId: { not: null },
        ...(save.playerPersonId
          ? { personId: { not: save.playerPersonId } }
          : {}),
      },
      include: {
        person: { select: { birthDate: true } },
        club: { select: { countryId: true, philosophy: true } },
      },
      orderBy: { id: 'asc' },
    });

    const agingPlayers: AgingPlayer[] = [];
    for (const player of players) {
      if (!player.clubId || !player.club) continue;
      const philosophy = (player.club.philosophy ?? {}) as {
        strength?: number;
      };
      agingPlayers.push({
        id: player.id,
        clubId: player.clubId,
        countryId: player.club.countryId,
        clubStrength: philosophy.strength ?? player.currentAbility,
        birthDate: player.person.birthDate,
        currentAbility: player.currentAbility,
        potentialAbility: player.potentialAbility,
        primaryPosition: player.primaryPosition,
      });
    }

    return {
      saveGameId,
      seed: save.seed,
      currentDate: save.currentDate,
      players: agingPlayers,
    };
  }

  async persistAging(
    saveGameId: string,
    data: NpcAgingPersistence,
  ): Promise<void> {
    const persons: Prisma.PersonCreateManyInput[] = [];
    const players: Prisma.PlayerCreateManyInput[] = [];
    const attributes: Prisma.PlayerAttributeCreateManyInput[] = [];

    for (const youth of data.youth) {
      const personId = randomUUID();
      const playerId = randomUUID();
      const p = youth.player;
      persons.push({
        id: personId,
        saveGameId,
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate,
        nationalityId: p.nationalityId,
        personType: PersonType.Player,
        personalityProfile: j({}),
      });
      players.push({
        id: playerId,
        personId,
        saveGameId,
        clubId: youth.clubId,
        primaryPosition: p.primaryPosition,
        secondaryPositions: j(p.secondaryPositions),
        preferredFoot: p.preferredFoot,
        heightCm: p.heightCm,
        weightKg: p.weightKg,
        currentAbility: p.currentAbility,
        potentialAbility: p.potentialAbility,
        reputation: p.reputation,
        popularity: Math.round(p.currentAbility),
        marketValue: p.marketValue,
        condition: 100,
        fatigue: 0,
        morale: 60,
        form: 50,
        confidence: 50,
        motivation: 65,
        stress: 20,
        happiness: 60,
        mentalHealth: 80,
        careerStatus: CareerStatus.Active,
      });
      for (const attribute of p.attributes) {
        attributes.push({
          playerId,
          attributeKey: attribute.key,
          value: attribute.value,
          category: attribute.category,
        });
      }
    }

    await this.prisma.$transaction(
      async (tx) => {
        for (const update of data.abilityUpdates) {
          await tx.player.update({
            where: { id: update.playerId },
            data: { currentAbility: update.currentAbility },
          });
        }

        if (data.retiredPlayerIds.length > 0) {
          await tx.player.updateMany({
            where: { id: { in: data.retiredPlayerIds } },
            data: { careerStatus: CareerStatus.Retired, clubId: null },
          });
        }

        for (const batch of chunk(persons, BATCH)) {
          await tx.person.createMany({ data: batch });
        }
        for (const batch of chunk(players, BATCH)) {
          await tx.player.createMany({ data: batch });
        }
        for (const batch of chunk(attributes, BATCH)) {
          await tx.playerAttribute.createMany({ data: batch });
        }
      },
      { timeout: 120_000, maxWait: 120_000 },
    );
  }
}

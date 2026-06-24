import type { Prisma, PrismaClient } from '@prisma/client';
import { EventStatus, FinancialTransactionType } from '@football-life/shared';
import {
  calendarAge,
  type CooldownState,
} from '@football-life/simulation-engine';
import { GAME_START_DATE } from '../config';
import type {
  ApplyEventOutcomeInput,
  CreatePendingEventInput,
  EventGenerationContext,
  EventRepository,
  PendingEventRecord,
  PlayerEffectSnapshot,
} from './event-repository';

const WEEK_MS = 7 * 86_400_000;
const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

function weekIndexOf(date: Date): number {
  return Math.floor((date.getTime() - GAME_START_DATE.getTime()) / WEEK_MS);
}

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async loadProtagonist(saveGameId: string) {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save || !save.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    if (!person || !person.player) return null;
    return { save, person, player: person.player };
  }

  async loadEventContext(
    saveGameId: string,
  ): Promise<EventGenerationContext | null> {
    const loaded = await this.loadProtagonist(saveGameId);
    if (!loaded) return null;
    const { save, person, player } = loaded;

    const money = await this.prisma.financialTransaction.aggregate({
      where: { playerId: player.id },
      _sum: { amount: true },
    });

    let clubReputation = 0;
    if (player.club?.competitionId) {
      const competition = await this.prisma.competition.findUnique({
        where: { id: player.club.competitionId },
      });
      clubReputation = competition?.reputation ?? 0;
    }

    return {
      seed: save.seed,
      playerId: player.id,
      currentDate: save.currentDate,
      context: {
        age: calendarAge(person.birthDate, save.currentDate),
        morale: player.morale,
        stress: player.stress,
        happiness: player.happiness,
        mentalHealth: player.mentalHealth,
        motivation: player.motivation,
        reputation: player.reputation,
        popularity: player.popularity,
        currentAbility: player.currentAbility,
        money: money._sum.amount ?? 0,
        careerStatus: player.careerStatus,
        hasClub: player.clubId !== null,
        clubReputation,
        weekIndex: weekIndexOf(save.currentDate),
      },
    };
  }

  async loadCooldowns(saveGameId: string): Promise<CooldownState> {
    const rows = await this.prisma.eventCooldown.findMany({
      where: { saveGameId },
    });
    const state: CooldownState = new Map();
    for (const row of rows) {
      state.set(row.definitionKey, {
        lastWeek: weekIndexOf(row.lastOccurredAt),
        count: row.occurrenceCount,
      });
    }
    return state;
  }

  async loadPlayerEffectState(
    saveGameId: string,
  ): Promise<PlayerEffectSnapshot | null> {
    const loaded = await this.loadProtagonist(saveGameId);
    if (!loaded) return null;
    const { save, player } = loaded;
    return {
      saveGameId,
      playerId: player.id,
      currentDate: save.currentDate,
      morale: player.morale,
      stress: player.stress,
      happiness: player.happiness,
      mentalHealth: player.mentalHealth,
      motivation: player.motivation,
      reputation: player.reputation,
      popularity: player.popularity,
      moneyDelta: 0,
    };
  }

  async createPendingEvent(input: CreatePendingEventInput): Promise<string> {
    const event = await this.prisma.gameEvent.create({
      data: {
        saveGameId: input.saveGameId,
        definitionKey: input.definitionKey,
        category: input.category,
        occurredAt: input.occurredAt,
        title: input.title,
        description: input.description,
        status: EventStatus.Pending,
        subjects: j({}),
        payload: j({ choices: input.choices }),
      },
    });
    return event.id;
  }

  async recordCooldown(
    saveGameId: string,
    definitionId: string,
    occurredAt: Date,
    nextEligibleAt: Date,
  ): Promise<void> {
    await this.prisma.eventCooldown.upsert({
      where: {
        saveGameId_definitionKey: { saveGameId, definitionKey: definitionId },
      },
      update: {
        lastOccurredAt: occurredAt,
        nextEligibleAt,
        occurrenceCount: { increment: 1 },
      },
      create: {
        saveGameId,
        definitionKey: definitionId,
        lastOccurredAt: occurredAt,
        occurrenceCount: 1,
        nextEligibleAt,
      },
    });
  }

  async getPendingEvent(
    gameEventId: string,
  ): Promise<PendingEventRecord | null> {
    const event = await this.prisma.gameEvent.findUnique({
      where: { id: gameEventId },
    });
    if (!event) return null;
    return {
      id: event.id,
      definitionKey: event.definitionKey,
      status: event.status,
    };
  }

  async applyEventOutcome(input: ApplyEventOutcomeInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.player.update({
        where: { id: input.playerId },
        data: {
          morale: input.effect.morale,
          stress: input.effect.stress,
          happiness: input.effect.happiness,
          mentalHealth: input.effect.mentalHealth,
          motivation: input.effect.motivation,
          reputation: Math.round(input.effect.reputation),
          popularity: Math.round(input.effect.popularity),
        },
      });

      if (input.effect.moneyDelta !== 0) {
        await tx.financialTransaction.create({
          data: {
            saveGameId: input.saveGameId,
            playerId: input.playerId,
            occurredAt: input.occurredAt,
            type: FinancialTransactionType.Other,
            amount: Math.round(input.effect.moneyDelta),
            description: input.description,
            referenceType: 'GameEvent',
            referenceId: input.gameEventId,
          },
        });
      }

      await tx.gameEvent.update({
        where: { id: input.gameEventId },
        data: {
          status: EventStatus.Resolved,
          selectedChoiceKey: input.choiceKey,
        },
      });
    });
  }
}

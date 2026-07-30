import type { Prisma, PrismaClient } from '@prisma/client';
import type { InterviewEffect } from '@football-life/shared';
import { GAME_START_DATE } from '../config';
import type {
  InterviewContext,
  InterviewRepository,
  InterviewStats,
} from './interview-repository';

const WEEK_MS = 7 * 86_400_000;
const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const clamp = (v: number, hi: number): number => Math.max(0, Math.min(hi, v));

function weekIndexOf(date: Date): number {
  return Math.floor((date.getTime() - GAME_START_DATE.getTime()) / WEEK_MS);
}

export class PrismaInterviewRepository implements InterviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async load(saveGameId: string) {
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

  async loadContext(saveGameId: string): Promise<InterviewContext | null> {
    const loaded = await this.load(saveGameId);
    if (!loaded) return null;
    const { save, person, player } = loaded;
    const profile = (person.personalityProfile ?? {}) as {
      lastInterviewWeek?: number;
    };
    return {
      firstName: person.firstName,
      clubName: player.club?.name ?? '',
      weekIndex: weekIndexOf(save.currentDate),
      lastInterviewWeek: profile.lastInterviewWeek ?? null,
    };
  }

  private nextStats(
    player: {
      morale: number;
      stress: number;
      happiness: number;
      mentalHealth: number;
      motivation: number;
      popularity: number;
      reputation: number;
    },
    deltas: InterviewEffect,
  ): InterviewStats {
    return {
      morale: clamp(player.morale + (deltas.morale ?? 0), 100),
      stress: clamp(player.stress + (deltas.stress ?? 0), 100),
      happiness: clamp(player.happiness + (deltas.happiness ?? 0), 100),
      mentalHealth: clamp(
        player.mentalHealth + (deltas.mentalHealth ?? 0),
        100,
      ),
      motivation: clamp(player.motivation + (deltas.motivation ?? 0), 100),
      popularity: clamp(player.popularity + (deltas.popularity ?? 0), 10_000),
      reputation: clamp(player.reputation + (deltas.reputation ?? 0), 10_000),
    };
  }

  async applyInterview(
    saveGameId: string,
    deltas: InterviewEffect,
    weekIndex: number,
  ): Promise<InterviewStats | null> {
    const loaded = await this.load(saveGameId);
    if (!loaded) return null;
    const { person, player } = loaded;

    const next = this.nextStats(player, deltas);
    const profile = (person.personalityProfile ?? {}) as Record<
      string,
      unknown
    >;

    await this.prisma.$transaction([
      this.prisma.player.update({
        where: { id: player.id },
        data: next,
      }),
      this.prisma.person.update({
        where: { id: person.id },
        data: {
          personalityProfile: j({ ...profile, lastInterviewWeek: weekIndex }),
        },
      }),
    ]);

    return next;
  }

  async applyStatDeltas(
    saveGameId: string,
    deltas: InterviewEffect,
  ): Promise<InterviewStats | null> {
    const loaded = await this.load(saveGameId);
    if (!loaded) return null;
    const next = this.nextStats(loaded.player, deltas);
    await this.prisma.player.update({
      where: { id: loaded.player.id },
      data: next,
    });
    return next;
  }
}

import type { PrismaClient } from '@prisma/client';
import { calendarAge } from '@football-life/simulation-engine';
import type { ScoutingRepository, ScoutingState } from './scouting-repository';

export class PrismaScoutingRepository implements ScoutingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadScoutingState(saveGameId: string): Promise<ScoutingState | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    const player = person?.player;
    if (!player?.club) return null;

    // Scouts come from clubs above the protagonist's current station.
    const candidates = await this.prisma.club.findMany({
      where: {
        saveGameId,
        competitionId: { not: null },
        id: { not: player.club.id },
        reputation: { gt: player.club.reputation },
      },
      select: {
        id: true,
        name: true,
        reputation: true,
        transferBudget: true,
        philosophy: true,
      },
    });

    return {
      seed: save.seed,
      currentDate: save.currentDate,
      playerId: player.id,
      clubId: player.club.id,
      clubReputation: player.club.reputation,
      player: {
        currentAbility: player.currentAbility,
        age: calendarAge(person!.birthDate, save.currentDate),
        marketValue: player.marketValue,
      },
      candidates: candidates.map((club) => {
        const philosophy = club.philosophy as { strength?: number } | null;
        return {
          id: club.id,
          name: club.name,
          reputation: club.reputation,
          strength: philosophy?.strength ?? club.reputation / 40,
          transferBudget: club.transferBudget,
        };
      }),
    };
  }
}

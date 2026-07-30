import type { PrismaClient } from '@prisma/client';
import { CareerStatus } from '@football-life/shared';
import type { TacticsRepository, TacticsState } from './tactics-repository';

export class PrismaTacticsRepository implements TacticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadTacticsState(saveGameId: string): Promise<TacticsState | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    const protagonist = person?.player;
    if (!protagonist?.club) return null;

    const players = await this.prisma.player.findMany({
      where: { clubId: protagonist.club.id },
      include: { person: { select: { firstName: true, lastName: true } } },
      orderBy: { id: 'asc' },
    });

    const profile = (person?.personalityProfile ?? {}) as Record<
      string,
      unknown
    >;
    const trust = profile.managerTrust;

    return {
      clubName: protagonist.club.name,
      protagonistTrust: typeof trust === 'number' ? trust : null,
      squad: players.map((player) => ({
        playerId: player.id,
        name: `${player.person.firstName} ${player.person.lastName}`,
        position: player.primaryPosition,
        currentAbility: player.currentAbility,
        form: player.form,
        condition: player.condition,
        available:
          player.careerStatus !== CareerStatus.Injured &&
          player.careerStatus !== CareerStatus.Retired,
        isProtagonist: player.id === protagonist.id,
      })),
    };
  }
}

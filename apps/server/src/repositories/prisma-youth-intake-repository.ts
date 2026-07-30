import type { PrismaClient } from '@prisma/client';
import type {
  YouthIntakeRepository,
  YouthIntakeState,
} from './youth-intake-repository';

export class PrismaYouthIntakeRepository implements YouthIntakeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadIntakeState(
    saveGameId: string,
  ): Promise<YouthIntakeState | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save) return null;

    const clubs = await this.prisma.club.findMany({
      where: { saveGameId, competitionId: { not: null } },
      select: {
        id: true,
        name: true,
        countryId: true,
        academyQuality: true,
        philosophy: true,
      },
      orderBy: { id: 'asc' },
    });

    let protagonistClubId: string | null = null;
    let protagonistPosition: string | null = null;
    if (save.playerPersonId) {
      const person = await this.prisma.person.findUnique({
        where: { id: save.playerPersonId },
        include: {
          player: { select: { clubId: true, primaryPosition: true } },
        },
      });
      protagonistClubId = person?.player?.clubId ?? null;
      protagonistPosition = person?.player?.primaryPosition ?? null;
    }

    return {
      seed: save.seed,
      currentDate: save.currentDate,
      protagonistClubId,
      protagonistPosition,
      clubs: clubs.map((club) => {
        const philosophy = club.philosophy as { strength?: number } | null;
        return {
          id: club.id,
          name: club.name,
          countryId: club.countryId,
          academyQuality: club.academyQuality,
          strength: philosophy?.strength ?? 50,
        };
      }),
    };
  }
}

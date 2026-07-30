import type { PrismaClient } from '@prisma/client';
import type {
  ClubEditInput,
  CompetitionEditInput,
  EditableWorld,
  WorldEditorRepository,
} from './world-editor-repository';

export class PrismaWorldEditorRepository implements WorldEditorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadWorld(saveGameId: string): Promise<EditableWorld | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
      select: { id: true },
    });
    if (!save) return null;

    const [clubs, competitions] = await Promise.all([
      this.prisma.club.findMany({
        where: { saveGameId },
        include: { competition: { select: { name: true } } },
        orderBy: [{ countryId: 'asc' }, { reputation: 'desc' }],
      }),
      this.prisma.competition.findMany({
        where: { saveGameId },
        orderBy: [{ countryId: 'asc' }, { tier: 'asc' }],
      }),
    ]);

    return {
      clubs: clubs.map((club) => ({
        clubId: club.id,
        name: club.name,
        shortName: club.shortName,
        logo: club.logo,
        countryId: club.countryId,
        competitionName: club.competition?.name ?? null,
      })),
      competitions: competitions.map((competition) => ({
        competitionId: competition.id,
        name: competition.name,
        logo: competition.logo,
        type: competition.type,
        countryId: competition.countryId,
      })),
    };
  }

  async updateClub(input: ClubEditInput): Promise<boolean> {
    const result = await this.prisma.club.updateMany({
      where: { id: input.clubId, saveGameId: input.saveGameId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.shortName !== undefined
          ? { shortName: input.shortName }
          : {}),
        ...(input.logo !== undefined ? { logo: input.logo } : {}),
      },
    });
    return result.count > 0;
  }

  async updateCompetition(input: CompetitionEditInput): Promise<boolean> {
    const result = await this.prisma.competition.updateMany({
      where: { id: input.competitionId, saveGameId: input.saveGameId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.logo !== undefined ? { logo: input.logo } : {}),
      },
    });
    return result.count > 0;
  }
}

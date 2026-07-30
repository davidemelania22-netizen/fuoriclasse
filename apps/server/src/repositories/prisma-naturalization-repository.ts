import type { PrismaClient } from '@prisma/client';
import { seasonLabelOf } from '../util/season-label';
import type {
  NaturalizationContext,
  NaturalizationRepository,
} from './naturalization-repository';

export class PrismaNaturalizationRepository
  implements NaturalizationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async loadContext(
    saveGameId: string,
  ): Promise<NaturalizationContext | null> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { club: true } } },
    });
    const player = person?.player;
    if (!person || !player) return null;

    const clubCountryId = player.club?.countryId ?? null;

    // Residency is measured in seasons actually PLAYED in that country's
    // competitions, not in years on a contract: you earn the passport on
    // the pitch.
    let seasonsInClubCountry = 0;
    if (clubCountryId) {
      const played = await this.prisma.matchAppearance.findMany({
        where: {
          playerId: player.id,
          fixture: { season: { competition: { countryId: clubCountryId } } },
        },
        select: { fixture: { select: { seasonId: true } } },
        distinct: ['fixtureId'],
      });
      seasonsInClubCountry = new Set(
        played.map((row) => row.fixture.seasonId),
      ).size;
    }

    return {
      personId: person.id,
      playerId: player.id,
      nationalityId: person.nationalityId,
      secondaryNationalityId: person.secondaryNationalityId,
      clubCountryId,
      seasonsInClubCountry,
      seasonLabel: seasonLabelOf(save.currentDate),
    };
  }

  async applyNaturalization(input: {
    personId: string;
    newNationalityId: string;
    previousNationalityId: string;
  }): Promise<void> {
    await this.prisma.person.update({
      where: { id: input.personId },
      data: {
        nationalityId: input.newNationalityId,
        secondaryNationalityId: input.previousNationalityId,
      },
    });
  }
}

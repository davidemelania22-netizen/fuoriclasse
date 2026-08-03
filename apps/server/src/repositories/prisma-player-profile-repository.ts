import type { PrismaClient } from '@prisma/client';
import { calendarAge } from '@football-life/simulation-engine';
import type {
  PlayerProfileData,
  PlayerProfileRepository,
} from './player-profile-repository';

/** How many outings the form bars show, like the five blocks in a scout card. */
const RECENT_MATCHES = 5;

export class PrismaPlayerProfileRepository implements PlayerProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadPlayerProfile(
    saveGameId: string,
  ): Promise<PlayerProfileData | null> {
    if (!saveGameId) return null;
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId) return null;

    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: { include: { attributes: true } } },
    });
    if (!person?.player) return null;
    const player = person.player;

    const contract = await this.prisma.contract.findFirst({
      where: { playerId: player.id, status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
      include: { club: { select: { id: true, name: true, logo: true } } },
    });

    const appearances = await this.prisma.matchAppearance.findMany({
      where: { playerId: player.id },
      include: {
        fixture: {
          include: {
            season: { include: { competition: { select: { name: true } } } },
          },
        },
      },
      orderBy: { fixture: { scheduledAt: 'asc' } },
    });

    // The current season is the latest one the player actually appeared in;
    // a freshly signed player has none yet, and the panel says so.
    const latestStart = appearances.reduce(
      (max, a) => Math.max(max, a.fixture.season.startDate.getTime()),
      -Infinity,
    );
    const current = appearances.filter(
      (a) => a.fixture.season.startDate.getTime() === latestStart,
    );
    const seasonLabel = current[0]?.fixture.season.label ?? null;

    const byCompetition = new Map<
      string,
      {
        appearances: number;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        ratingSum: number;
      }
    >();
    for (const a of current) {
      const key = a.fixture.season.competition.name;
      const row = byCompetition.get(key) ?? {
        appearances: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        ratingSum: 0,
      };
      row.appearances += 1;
      row.goals += a.goals;
      row.assists += a.assists;
      row.yellowCards += a.yellowCards;
      row.redCards += a.redCards;
      row.ratingSum += a.rating;
      byCompetition.set(key, row);
    }

    // Opponent names for the recent-form strip.
    const recent = appearances.slice(-RECENT_MATCHES);
    const opponentIds = new Set<string>();
    for (const a of recent) {
      opponentIds.add(a.fixture.homeClubId);
      opponentIds.add(a.fixture.awayClubId);
    }
    const clubs = await this.prisma.club.findMany({
      where: { id: { in: [...opponentIds] } },
      select: { id: true, name: true },
    });
    const clubNameById = new Map(clubs.map((c) => [c.id, c.name]));

    const clubsPlayedFor = new Set(appearances.map((a) => a.clubId));

    return {
      playerId: player.id,
      firstName: person.firstName,
      lastName: person.lastName,
      birthDate: person.birthDate.toISOString(),
      ageYears: calendarAge(person.birthDate, save.currentDate),
      nationalityId: person.nationalityId,
      primaryPosition: player.primaryPosition,
      secondaryPositions: Array.isArray(player.secondaryPositions)
        ? (player.secondaryPositions as string[])
        : [],
      preferredFoot: player.preferredFoot,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      currentAbility: player.currentAbility,
      potentialAbility: player.potentialAbility,
      reputation: player.reputation,
      popularity: player.popularity,
      marketValue: player.marketValue,
      condition: player.condition,
      fatigue: player.fatigue,
      morale: player.morale,
      form: player.form,
      stress: player.stress,
      careerStatus: player.careerStatus,
      attributes: player.attributes.map((a) => ({
        key: a.attributeKey,
        category: a.category,
        value: a.value,
      })),
      contract: contract
        ? {
            clubId: contract.club.id,
            clubName: contract.club.name,
            clubLogo: contract.club.logo,
            weeklyWage: contract.weeklyWage,
            endDate: contract.endDate.toISOString(),
            squadRole: contract.squadRole,
          }
        : null,
      seasonLabel,
      seasonLines: [...byCompetition.entries()].map(([competitionName, r]) => ({
        competitionName,
        appearances: r.appearances,
        goals: r.goals,
        assists: r.assists,
        yellowCards: r.yellowCards,
        redCards: r.redCards,
        averageRating: r.appearances > 0 ? r.ratingSum / r.appearances : 0,
      })),
      recentMatches: recent.map((a) => {
        const opponentId =
          a.fixture.homeClubId === a.clubId
            ? a.fixture.awayClubId
            : a.fixture.homeClubId;
        return {
          date: a.fixture.scheduledAt.toISOString(),
          opponentName: clubNameById.get(opponentId) ?? 'Sconosciuto',
          competitionName: a.fixture.season.competition.name,
          rating: a.rating,
          goals: a.goals,
          assists: a.assists,
        };
      }),
      careerTotals: {
        appearances: appearances.length,
        goals: appearances.reduce((sum, a) => sum + a.goals, 0),
        assists: appearances.reduce((sum, a) => sum + a.assists, 0),
        clubs: clubsPlayedFor.size,
      },
    };
  }
}

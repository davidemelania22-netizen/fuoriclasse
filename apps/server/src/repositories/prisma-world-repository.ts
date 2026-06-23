import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import {
  CareerStatus,
  FixtureStatus,
  PersonType,
  SeasonStatus,
} from '@football-life/shared';
import { type GeneratedWorld, chunk } from '@football-life/simulation-engine';
import type {
  WorldPersistenceSummary,
  WorldRepository,
} from './world-repository';

const BATCH = 500;
const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export class PrismaWorldRepository implements WorldRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async persistWorld(
    saveGameId: string,
    world: GeneratedWorld,
  ): Promise<WorldPersistenceSummary> {
    const competitionId = new Map<string, string>();
    const clubId = new Map<string, string>();
    const seasonId = new Map<string, string>();

    const competitions: Prisma.CompetitionCreateManyInput[] =
      world.competitions.map((competition) => {
        const id = randomUUID();
        competitionId.set(competition.key, id);
        return {
          id,
          saveGameId,
          name: competition.name,
          countryId: competition.countryId,
          type: competition.type,
          tier: competition.tier,
          reputation: competition.reputation,
          seasonStart: competition.seasonStart,
          seasonEnd: competition.seasonEnd,
          rules: j({}),
        };
      });

    const clubs: Prisma.ClubCreateManyInput[] = world.clubs.map((club) => {
      const id = randomUUID();
      clubId.set(club.key, id);
      return {
        id,
        saveGameId,
        staticClubKey: club.key,
        name: club.name,
        shortName: club.shortName,
        countryId: club.countryId,
        competitionId: competitionId.get(club.competitionKey) ?? null,
        reputation: club.reputation,
        balance: club.balance,
        wageBudget: club.wageBudget,
        transferBudget: club.transferBudget,
        academyQuality: club.academyQuality,
        trainingQuality: club.trainingQuality,
        medicalQuality: club.medicalQuality,
        scoutingQuality: club.scoutingQuality,
        pressureLevel: club.pressureLevel,
        philosophy: j({ strength: club.strength }),
      };
    });

    const persons: Prisma.PersonCreateManyInput[] = [];
    const players: Prisma.PlayerCreateManyInput[] = [];
    const attributes: Prisma.PlayerAttributeCreateManyInput[] = [];

    for (const coach of world.coaches) {
      persons.push({
        id: randomUUID(),
        saveGameId,
        firstName: coach.firstName,
        lastName: coach.lastName,
        birthDate: coach.birthDate,
        nationalityId: coach.nationalityId,
        personType: PersonType.Coach,
        personalityProfile: j({
          archetype: coach.archetype,
          clubKey: coach.clubKey,
          ...coach.personality,
        }),
      });
    }

    for (const player of world.players) {
      const personId = randomUUID();
      const playerId = randomUUID();
      persons.push({
        id: personId,
        saveGameId,
        firstName: player.firstName,
        lastName: player.lastName,
        birthDate: player.birthDate,
        nationalityId: player.nationalityId,
        personType: PersonType.Player,
        personalityProfile: j({}),
      });
      players.push({
        id: playerId,
        personId,
        saveGameId,
        clubId: clubId.get(player.clubKey) ?? null,
        primaryPosition: player.primaryPosition,
        secondaryPositions: j(player.secondaryPositions),
        preferredFoot: player.preferredFoot,
        heightCm: player.heightCm,
        weightKg: player.weightKg,
        currentAbility: player.currentAbility,
        potentialAbility: player.potentialAbility,
        reputation: player.reputation,
        popularity: Math.round(player.currentAbility),
        marketValue: player.marketValue,
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
      for (const attribute of player.attributes) {
        attributes.push({
          playerId,
          attributeKey: attribute.key,
          value: attribute.value,
          category: attribute.category,
        });
      }
    }

    const seasons: Prisma.SeasonCreateManyInput[] = world.seasons.map(
      (season) => {
        const id = randomUUID();
        seasonId.set(season.key, id);
        return {
          id,
          saveGameId,
          competitionId: competitionId.get(season.competitionKey)!,
          label: season.label,
          startDate: season.startDate,
          endDate: season.endDate,
          status: SeasonStatus.Scheduled,
        };
      },
    );

    const fixtures: Prisma.FixtureCreateManyInput[] = world.fixtures.map(
      (fixture) => ({
        saveGameId,
        seasonId: seasonId.get(fixture.seasonKey)!,
        homeClubId: clubId.get(fixture.homeClubKey)!,
        awayClubId: clubId.get(fixture.awayClubKey)!,
        scheduledAt: fixture.scheduledAt,
        status: FixtureStatus.Scheduled,
        importance: fixture.importance,
      }),
    );

    const standings: Prisma.StandingCreateManyInput[] = [];
    for (const season of world.seasons) {
      const resolvedSeasonId = seasonId.get(season.key)!;
      for (const club of world.clubs) {
        if (club.competitionKey === season.competitionKey) {
          standings.push({
            seasonId: resolvedSeasonId,
            clubId: clubId.get(club.key)!,
          });
        }
      }
    }

    await this.prisma.$transaction(
      async (tx) => {
        await tx.competition.createMany({ data: competitions });
        await tx.club.createMany({ data: clubs });
        for (const batch of chunk(persons, BATCH)) {
          await tx.person.createMany({ data: batch });
        }
        for (const batch of chunk(players, BATCH)) {
          await tx.player.createMany({ data: batch });
        }
        for (const batch of chunk(attributes, BATCH)) {
          await tx.playerAttribute.createMany({ data: batch });
        }
        await tx.season.createMany({ data: seasons });
        for (const batch of chunk(fixtures, BATCH)) {
          await tx.fixture.createMany({ data: batch });
        }
        for (const batch of chunk(standings, BATCH)) {
          await tx.standing.createMany({ data: batch });
        }
      },
      { timeout: 120_000, maxWait: 120_000 },
    );

    return {
      competitions: world.competitions.length,
      clubs: world.clubs.length,
      coaches: world.coaches.length,
      players: world.players.length,
      seasons: world.seasons.length,
      fixtures: world.fixtures.length,
      standings: standings.length,
    };
  }
}

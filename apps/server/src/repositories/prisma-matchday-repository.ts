import type { Prisma, PrismaClient } from '@prisma/client';
import {
  CareerStatus,
  FixtureStatus,
  type PlayerPosition,
} from '@football-life/shared';
import {
  biasesFor,
  chunk,
  DEFAULT_INSTRUCTIONS,
  selectionBiasFromTrust,
  type InstructionBiases,
  type MatchPlayer,
  type TacticalInstructions,
} from '@football-life/simulation-engine';
import type {
  MatchdayRepository,
  MatchdayResultsPersistence,
  MatchdayRoundData,
} from './matchday-repository';

const BATCH = 500;
const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

function attributeValue(
  attributes: readonly { attributeKey: string; value: number }[],
  key: string,
  fallback: number,
): number {
  return attributes.find((a) => a.attributeKey === key)?.value ?? fallback;
}

export class PrismaMatchdayRepository implements MatchdayRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async resolveProtagonist(saveGameId: string): Promise<{
    clubId: string | null;
    playerId: string | null;
    trust: number | null;
    biases: InstructionBiases;
  }> {
    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    if (!save?.playerPersonId)
      return {
        clubId: null,
        playerId: null,
        trust: null,
        biases: biasesFor(DEFAULT_INSTRUCTIONS),
      };
    const person = await this.prisma.person.findUnique({
      where: { id: save.playerPersonId },
      include: { player: true },
    });
    const profile = (person?.personalityProfile ?? {}) as Record<
      string,
      unknown
    >;
    const trust = profile.managerTrust;
    const instructions =
      (profile.tacticalInstructions as TacticalInstructions | undefined) ??
      DEFAULT_INSTRUCTIONS;
    return {
      clubId: person?.player?.clubId ?? null,
      playerId: person?.player?.id ?? null,
      trust: typeof trust === 'number' ? trust : null,
      biases: biasesFor(instructions),
    };
  }

  async findDueMatchdayDates(
    saveGameId: string,
    from: Date,
    to: Date,
  ): Promise<Date[]> {
    const fixtures = await this.prisma.fixture.findMany({
      where: {
        saveGameId,
        status: FixtureStatus.Scheduled,
        scheduledAt: { gt: from, lte: to },
      },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true },
      distinct: ['scheduledAt'],
    });
    return fixtures.map((f) => f.scheduledAt);
  }

  async loadAllMatchdayRounds(
    saveGameId: string,
    date: Date,
  ): Promise<MatchdayRoundData[]> {
    const {
      clubId: protagonistClubId,
      playerId: protagonistPlayerId,
      trust: protagonistTrust,
      biases: protagonistBiases,
    } = await this.resolveProtagonist(saveGameId);

    const fixtures = await this.prisma.fixture.findMany({
      where: {
        saveGameId,
        status: FixtureStatus.Scheduled,
        scheduledAt: date,
      },
      include: {
        season: { include: { competition: { select: { name: true } } } },
      },
    });
    if (fixtures.length === 0) return [];

    // All clubs playing anywhere in the world today, loaded once.
    const clubIds = [
      ...new Set(fixtures.flatMap((f) => [f.homeClubId, f.awayClubId])),
    ];
    const clubs = await this.prisma.club.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, name: true },
    });
    const clubNames = new Map(clubs.map((c) => [c.id, c.name]));

    const players = await this.prisma.player.findMany({
      where: { clubId: { in: clubIds } },
      include: {
        person: { select: { firstName: true, lastName: true } },
        attributes: {
          where: { attributeKey: { in: ['finishing', 'discipline'] } },
        },
      },
    });
    const squads = new Map<string, MatchPlayer[]>();
    const playerNames = new Map<string, string>();
    for (const clubId of clubIds) squads.set(clubId, []);
    for (const player of players) {
      if (!player.clubId) continue;
      playerNames.set(
        player.id,
        `${player.person.firstName} ${player.person.lastName}`,
      );
      const isProtagonist = player.id === protagonistPlayerId;
      squads.get(player.clubId)?.push({
        id: player.id,
        position: player.primaryPosition as PlayerPosition,
        currentAbility: player.currentAbility,
        form: player.form,
        condition: player.condition,
        morale: player.morale,
        discipline: attributeValue(player.attributes, 'discipline', 50),
        finishing: attributeValue(player.attributes, 'finishing', 50),
        // Injured/retired players stay in the squad for idle form drift but are
        // never fielded.
        available:
          player.careerStatus !== CareerStatus.Injured &&
          player.careerStatus !== CareerStatus.Retired,
        // Manager trust nudges the protagonist's spot in the pecking order;
        // their tactical instructions shape how the match involves them.
        ...(isProtagonist && protagonistTrust !== null
          ? { selectionBias: selectionBiasFromTrust(protagonistTrust) }
          : {}),
        ...(isProtagonist ? protagonistBiases : {}),
      });
    }

    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    const seed = save?.seed ?? 'matchday';

    // Group the day's fixtures by season — one MatchdayRoundData per league.
    const bySeason = new Map<string, typeof fixtures>();
    for (const fixture of fixtures) {
      const list = bySeason.get(fixture.seasonId) ?? [];
      list.push(fixture);
      bySeason.set(fixture.seasonId, list);
    }

    const rounds: MatchdayRoundData[] = [];
    for (const [seasonId, seasonFixtures] of bySeason) {
      const standingRows = await this.prisma.standing.findMany({
        where: { seasonId },
      });
      const standings = standingRows.map((s) => ({
        clubId: s.clubId,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        points: s.points,
      }));
      const remainingAfterThisRound = await this.prisma.fixture.count({
        where: {
          seasonId,
          status: FixtureStatus.Scheduled,
          scheduledAt: { gt: date },
        },
      });

      rounds.push({
        seasonId,
        competitionName: seasonFixtures[0]!.season.competition.name,
        seed,
        fixtures: seasonFixtures.map((f) => ({
          id: f.id,
          homeClubId: f.homeClubId,
          awayClubId: f.awayClubId,
        })),
        squads,
        clubNames,
        playerNames,
        standings,
        protagonistClubId,
        protagonistPlayerId,
        remainingAfterThisRound,
      });
    }

    return rounds;
  }

  async persistMatchdayResults(
    data: MatchdayResultsPersistence,
  ): Promise<void> {
    const appearanceRows: Prisma.MatchAppearanceCreateManyInput[] =
      data.appearances.map((appearance) => ({
        fixtureId: appearance.fixtureId,
        playerId: appearance.playerId,
        clubId: appearance.clubId,
        started: appearance.started,
        minutesPlayed: appearance.minutesPlayed,
        position: appearance.position,
        rating: appearance.rating,
        goals: appearance.goals,
        assists: appearance.assists,
        yellowCards: appearance.yellowCards,
        redCards: appearance.redCards,
        statistics: j({}),
      }));

    await this.prisma.$transaction(async (tx) => {
      for (const fixture of data.fixtures) {
        await tx.fixture.update({
          where: { id: fixture.fixtureId },
          data: {
            homeScore: fixture.homeGoals,
            awayScore: fixture.awayGoals,
            status: FixtureStatus.Played,
            simulationData: j({
              homeXg: fixture.homeXg,
              awayXg: fixture.awayXg,
              ...(fixture.simulationData as object),
            }),
          },
        });
      }

      for (const batch of chunk(appearanceRows, BATCH)) {
        await tx.matchAppearance.createMany({ data: batch });
      }

      for (const row of data.standings) {
        await tx.standing.upsert({
          where: {
            seasonId_clubId: { seasonId: data.seasonId, clubId: row.clubId },
          },
          create: { seasonId: data.seasonId, ...row },
          update: {
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            points: row.points,
          },
        });
      }

      for (const update of data.formUpdates) {
        await tx.player.update({
          where: { id: update.playerId },
          data: { form: update.form },
        });
      }

      if (data.completeSeason) {
        await tx.season.update({
          where: { id: data.seasonId },
          data: { status: 'COMPLETED' },
        });
      }
    });
  }
}

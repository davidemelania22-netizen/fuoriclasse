import type { Prisma, PrismaClient } from '@prisma/client';
import {
  CompetitionType,
  SeasonStatus,
  type PlayerPosition,
} from '@football-life/shared';
import type { MatchPlayer } from '@football-life/simulation-engine';
import type {
  ContinentalField,
  ContinentalRepository,
  ContinentalSummary,
} from './continental-repository';
import type { RecordHonourInput } from './cup-repository';
import { seasonLabelOf } from '../util/season-label';

const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

function attributeValue(
  attributes: readonly { attributeKey: string; value: number }[],
  key: string,
  fallback: number,
): number {
  return attributes.find((a) => a.attributeKey === key)?.value ?? fallback;
}

export class PrismaContinentalRepository implements ContinentalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(saveGameId: string): Promise<ContinentalSummary | null> {
    const comp = await this.prisma.competition.findFirst({
      where: { saveGameId, type: CompetitionType.Continental },
    });
    if (!comp) return null;

    const holder = await this.prisma.honour.findFirst({
      where: { saveGameId, type: 'CONTINENTAL_CUP', competitionId: comp.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      competitionId: comp.id,
      name: comp.name,
      holderClubName: holder?.clubName ?? null,
      holderSeasonLabel: holder?.seasonLabel ?? null,
    };
  }

  async loadField(
    saveGameId: string,
    qualifiersPerCountry: number,
  ): Promise<ContinentalField | null> {
    const comp = await this.prisma.competition.findFirst({
      where: { saveGameId, type: CompetitionType.Continental },
    });
    if (!comp) return null;

    const topLeagues = await this.prisma.competition.findMany({
      where: { saveGameId, type: CompetitionType.League, tier: 1 },
      select: { id: true },
    });

    const qualifiedByLeague = await Promise.all(
      topLeagues.map((league) =>
        this.qualifiersFor(league.id, qualifiersPerCountry),
      ),
    );
    const entrantIds = qualifiedByLeague.flat();
    if (entrantIds.length === 0) return null;

    const clubs = await this.prisma.club.findMany({
      where: { id: { in: entrantIds } },
      orderBy: { reputation: 'desc' },
      select: { id: true, name: true },
    });
    const entrants = clubs.map((c) => c.id);
    const clubNames = new Map(clubs.map((c) => [c.id, c.name]));

    const players = await this.prisma.player.findMany({
      where: { clubId: { in: entrants } },
      include: {
        attributes: {
          where: { attributeKey: { in: ['finishing', 'discipline'] } },
        },
      },
    });
    const squads = new Map<string, MatchPlayer[]>();
    for (const id of entrants) squads.set(id, []);
    for (const player of players) {
      if (!player.clubId) continue;
      squads.get(player.clubId)?.push({
        id: player.id,
        position: player.primaryPosition as PlayerPosition,
        currentAbility: player.currentAbility,
        form: player.form,
        condition: player.condition,
        morale: player.morale,
        discipline: attributeValue(player.attributes, 'discipline', 50),
        finishing: attributeValue(player.attributes, 'finishing', 50),
      });
    }

    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    let protagonistClubId: string | null = null;
    if (save?.playerPersonId) {
      const person = await this.prisma.person.findUnique({
        where: { id: save.playerPersonId },
        include: { player: true },
      });
      protagonistClubId = person?.player?.clubId ?? null;
    }

    return {
      competitionId: comp.id,
      competitionName: comp.name,
      seed: save?.seed ?? 'continental',
      seasonLabel: seasonLabelOf(save?.currentDate ?? new Date()),
      entrants,
      clubNames,
      squads,
      protagonistClubId,
    };
  }

  /** Top clubs from a country's tier-1 league: by the last completed season's
   * standings when one exists, otherwise by reputation (first-ever season). */
  private async qualifiersFor(
    leagueCompetitionId: string,
    count: number,
  ): Promise<string[]> {
    const lastCompleted = await this.prisma.season.findFirst({
      where: { competitionId: leagueCompetitionId, status: SeasonStatus.Completed },
      orderBy: { endDate: 'desc' },
    });

    if (lastCompleted) {
      const standings = await this.prisma.standing.findMany({
        where: { seasonId: lastCompleted.id },
        orderBy: [{ points: 'desc' }],
        take: count,
      });
      if (standings.length > 0) {
        const ranked = [...standings].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst);
        });
        return ranked.map((s) => s.clubId);
      }
    }

    const clubs = await this.prisma.club.findMany({
      where: { competitionId: leagueCompetitionId },
      orderBy: { reputation: 'desc' },
      take: count,
      select: { id: true },
    });
    return clubs.map((c) => c.id);
  }

  async recordHonour(input: RecordHonourInput): Promise<void> {
    const existing = await this.prisma.honour.findFirst({
      where: {
        saveGameId: input.saveGameId,
        type: input.type,
        competitionId: input.competitionId ?? null,
        seasonLabel: input.seasonLabel,
      },
    });
    if (existing) return;
    const data: Prisma.HonourUncheckedCreateInput = {
      saveGameId: input.saveGameId,
      seasonLabel: input.seasonLabel,
      type: input.type,
      competitionId: input.competitionId ?? null,
      competitionName: input.competitionName ?? null,
      clubId: input.clubId ?? null,
      clubName: input.clubName ?? null,
      playerId: input.playerId ?? null,
      playerName: input.playerName ?? null,
    };
    if (input.detail !== undefined) data.detail = j(input.detail);
    await this.prisma.honour.create({ data });
  }
}

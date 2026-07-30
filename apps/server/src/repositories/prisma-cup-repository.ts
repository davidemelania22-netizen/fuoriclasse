import type { Prisma, PrismaClient } from '@prisma/client';
import {
  CompetitionType,
  type PlayerPosition,
} from '@football-life/shared';
import type { MatchPlayer } from '@football-life/simulation-engine';
import type {
  CupField,
  CupRepository,
  CupSummary,
  HonourRecord,
  RecordHonourInput,
} from './cup-repository';
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

export class PrismaCupRepository implements CupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listCups(saveGameId: string): Promise<CupSummary[]> {
    const cups = await this.prisma.competition.findMany({
      where: { saveGameId, type: CompetitionType.Cup },
      orderBy: { reputation: 'desc' },
    });
    return cups.map((c) => ({
      competitionId: c.id,
      name: c.name,
      countryId: c.countryId,
    }));
  }

  async loadCupField(competitionId: string): Promise<CupField | null> {
    const cup = await this.prisma.competition.findUnique({
      where: { id: competitionId },
    });
    if (!cup || cup.type !== CompetitionType.Cup) return null;

    const leagueComps = await this.prisma.competition.findMany({
      where: {
        saveGameId: cup.saveGameId,
        countryId: cup.countryId,
        type: CompetitionType.League,
      },
      select: { id: true },
    });
    const leagueIds = leagueComps.map((c) => c.id);

    const clubs = await this.prisma.club.findMany({
      where: { competitionId: { in: leagueIds } },
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
      where: { id: cup.saveGameId },
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
      competitionId: cup.id,
      competitionName: cup.name,
      countryId: cup.countryId,
      seed: save?.seed ?? 'cup',
      seasonLabel: seasonLabelOf(save?.currentDate ?? new Date()),
      entrants,
      clubNames,
      squads,
      protagonistClubId,
    };
  }

  async recordHonour(input: RecordHonourInput): Promise<void> {
    // One trophy per competition per season — never duplicate on re-resolution.
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

  async listHonours(saveGameId: string): Promise<HonourRecord[]> {
    const rows = await this.prisma.honour.findMany({
      where: { saveGameId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((h) => ({
      id: h.id,
      seasonLabel: h.seasonLabel,
      type: h.type,
      competitionId: h.competitionId,
      competitionName: h.competitionName,
      clubId: h.clubId,
      clubName: h.clubName,
      playerId: h.playerId,
      playerName: h.playerName,
      createdAt: h.createdAt.toISOString(),
    }));
  }
}

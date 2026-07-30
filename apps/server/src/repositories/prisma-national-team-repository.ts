import type { Prisma, PrismaClient } from '@prisma/client';
import {
  CompetitionType,
  PersonType,
  type PlayerPosition,
} from '@football-life/shared';
import { COUNTRIES } from '@football-life/game-data';
import {
  buildSquadPositions,
  mean,
  type MatchPlayer,
} from '@football-life/simulation-engine';
import type {
  NationalTeamField,
  NationalTeamRepository,
  NationalTeamSummary,
} from './national-team-repository';
import type { RecordHonourInput } from './cup-repository';
import { seasonLabelOf } from '../util/season-label';

const j = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;
const MIN_SQUAD_SIZE = 11;

function attributeValue(
  attributes: readonly { attributeKey: string; value: number }[],
  key: string,
  fallback: number,
): number {
  return attributes.find((a) => a.attributeKey === key)?.value ?? fallback;
}

/** Call-up strength: mostly current ability, with recent form as a tiebreaker. */
function callUpScore(player: { currentAbility: number; form: number }): number {
  return player.currentAbility * 0.8 + player.form * 0.2;
}

export class PrismaNationalTeamRepository implements NationalTeamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSummary(saveGameId: string): Promise<NationalTeamSummary | null> {
    const comp = await this.prisma.competition.findFirst({
      where: { saveGameId, type: CompetitionType.International },
    });
    if (!comp) return null;

    const holder = await this.prisma.honour.findFirst({
      where: { saveGameId, type: 'INTERNATIONAL', competitionId: comp.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      competitionId: comp.id,
      name: comp.name,
      holderCountryName: holder?.clubName ?? null,
      holderSeasonLabel: holder?.seasonLabel ?? null,
    };
  }

  async loadField(
    saveGameId: string,
    squadSize: number,
    options?: { excludeProtagonist?: boolean },
  ): Promise<NationalTeamField | null> {
    const comp = await this.prisma.competition.findFirst({
      where: { saveGameId, type: CompetitionType.International },
    });
    if (!comp) return null;

    const nationalities = await this.prisma.person.findMany({
      where: { saveGameId, personType: PersonType.Player },
      distinct: ['nationalityId'],
      select: { nationalityId: true },
    });

    const save = await this.prisma.saveGame.findUnique({
      where: { id: saveGameId },
    });
    let protagonistPlayerId: string | null = null;
    if (save?.playerPersonId) {
      const person = await this.prisma.person.findUnique({
        where: { id: save.playerPersonId },
        include: { player: true },
      });
      protagonistPlayerId = person?.player?.id ?? null;
    }

    const quota = new Map<PlayerPosition, number>();
    for (const position of buildSquadPositions(squadSize)) {
      quota.set(position, (quota.get(position) ?? 0) + 1);
    }

    const squads = new Map<string, MatchPlayer[]>();
    let protagonistCountryId: string | null = null;

    for (const { nationalityId } of nationalities) {
      const players = await this.prisma.player.findMany({
        where: { saveGameId, person: { nationalityId } },
        include: {
          attributes: {
            where: { attributeKey: { in: ['finishing', 'discipline'] } },
          },
        },
      });
      if (players.length < MIN_SQUAD_SIZE) continue;

      const scored = players
        // A declined call-up: the CT builds the squad without the protagonist.
        .filter(
          (p) => !(options?.excludeProtagonist && p.id === protagonistPlayerId),
        )
        .map((p) => ({ player: p, score: callUpScore(p) }))
        .sort((a, b) => b.score - a.score);

      const chosenIds = new Set<string>();
      for (const [position, count] of quota) {
        const candidates = scored.filter(
          (s) =>
            !chosenIds.has(s.player.id) &&
            s.player.primaryPosition === position,
        );
        for (let i = 0; i < count && i < candidates.length; i += 1) {
          chosenIds.add(candidates[i]!.player.id);
        }
      }
      if (chosenIds.size < squadSize) {
        const leftover = scored.filter((s) => !chosenIds.has(s.player.id));
        for (
          let i = 0;
          i < leftover.length && chosenIds.size < squadSize;
          i += 1
        ) {
          chosenIds.add(leftover[i]!.player.id);
        }
      }

      const squad: MatchPlayer[] = [];
      for (const { player } of scored) {
        if (!chosenIds.has(player.id)) continue;
        squad.push({
          id: player.id,
          position: player.primaryPosition as PlayerPosition,
          currentAbility: player.currentAbility,
          form: player.form,
          condition: player.condition,
          morale: player.morale,
          discipline: attributeValue(player.attributes, 'discipline', 50),
          finishing: attributeValue(player.attributes, 'finishing', 50),
        });
        if (protagonistPlayerId === player.id) {
          protagonistCountryId = nationalityId;
        }
      }
      squads.set(nationalityId, squad);
    }

    const entrants = [...squads.keys()].sort((a, b) => {
      const strengthOf = (id: string): number =>
        mean(squads.get(id)!.map((p) => p.currentAbility));
      return strengthOf(b) - strengthOf(a);
    });
    if (entrants.length === 0) return null;

    // Sourced from game-data (the same reference list the world generator
    // uses for country names), not the static `Country` table, which is only
    // upserted by the seed script and can drift out of sync with it.
    const countryNames = new Map(
      COUNTRIES.filter((c) => entrants.includes(c.id)).map((c) => [
        c.id,
        c.name,
      ]),
    );

    return {
      competitionId: comp.id,
      competitionName: comp.name,
      seed: save?.seed ?? 'national-team',
      seasonLabel: seasonLabelOf(save?.currentDate ?? new Date()),
      entrants,
      countryNames,
      squads,
      protagonistCountryId,
    };
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

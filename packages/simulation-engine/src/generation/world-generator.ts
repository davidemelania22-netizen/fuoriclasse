import {
  CompetitionType,
  type CountryRecord,
  type WorldGenerationConfig,
} from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import type {
  GeneratedClub,
  GeneratedCoach,
  GeneratedCompetition,
  GeneratedFixture,
  GeneratedPlayer,
  GeneratedSeason,
  GeneratedWorld,
} from '../domain/world';
import { buildSquadPositions, generatePlayer } from './player-generator';
import { generateClub, generateCoach } from './club-generator';
import { generateDoubleRoundRobin } from './schedule-generator';

export interface WorldGenerationInput {
  seed: string;
  countries: readonly CountryRecord[];
  config: WorldGenerationConfig;
}

const DAY_MS = 86_400_000;

interface DivisionSpec {
  tier: number;
  clubCount: number;
  abilityMean: number;
  reputation: number;
  label: string;
}

/**
 * Deterministically generate a full world (competitions, clubs, rosters,
 * coaches, seasons and fixtures) from a seed and configuration. The same input
 * always produces the same output.
 */
export function generateWorld(input: WorldGenerationInput): GeneratedWorld {
  const { config } = input;
  const rng = createRandomSource(input.seed);
  const seasonStart = new Date(`${config.seasonStart}T00:00:00.000Z`);
  const seasonEnd = new Date(
    seasonStart.getTime() + config.seasonLengthDays * DAY_MS,
  );
  const seasonLabel = `${seasonStart.getUTCFullYear()}/${seasonStart.getUTCFullYear() + 1}`;

  const competitions: GeneratedCompetition[] = [];
  const clubs: GeneratedClub[] = [];
  const coaches: GeneratedCoach[] = [];
  const players: GeneratedPlayer[] = [];
  const seasons: GeneratedSeason[] = [];
  const fixtures: GeneratedFixture[] = [];

  const divisions: DivisionSpec[] = [
    {
      tier: 1,
      clubCount: config.clubsPerTopDivision,
      abilityMean: config.ability.topDivisionMean,
      reputation: config.reputation.topDivision,
      label: 'Prima Divisione',
    },
    {
      tier: 2,
      clubCount: config.clubsPerSecondDivision,
      abilityMean: config.ability.topDivisionMean - config.ability.divisionStep,
      reputation: config.reputation.secondDivision,
      label: 'Seconda Divisione',
    },
  ];

  for (const country of input.countries) {
    const namePool = config.namePools[country.id];
    if (!namePool) {
      throw new Error(
        `generateWorld(): missing name pool for country "${country.id}"`,
      );
    }

    // Youth competition scaffolding (clubs/fixtures added in later milestones).
    competitions.push({
      key: `comp-${country.id}-youth`,
      name: `${country.name} Youth League`,
      countryId: country.id,
      type: CompetitionType.YouthLeague,
      tier: 3,
      reputation: config.reputation.youth,
      seasonStart,
      seasonEnd,
    });

    for (const division of divisions) {
      if (division.clubCount < 2) continue;

      const compKey = `comp-${country.id}-t${division.tier}`;
      competitions.push({
        key: compKey,
        name: `${country.name} ${division.label}`,
        countryId: country.id,
        type: CompetitionType.League,
        tier: division.tier,
        reputation: division.reputation,
        seasonStart,
        seasonEnd,
      });

      const divisionClubKeys: string[] = [];
      for (let i = 0; i < division.clubCount; i += 1) {
        const clubKey = `${compKey}-club${String(i).padStart(2, '0')}`;
        const club = generateClub({
          rng,
          key: clubKey,
          competitionKey: compKey,
          countryId: country.id,
          cityIndex: i,
          namePool,
          divisionMean: division.abilityMean,
          baseReputation: division.reputation,
          config,
        });
        clubs.push(club);
        divisionClubKeys.push(clubKey);

        buildSquadPositions(config.rosterSize).forEach((position, p) => {
          players.push(
            generatePlayer({
              rng,
              key: `${clubKey}-p${String(p).padStart(2, '0')}`,
              clubKey,
              countryId: country.id,
              namePool,
              position,
              clubStrength: club.strength,
              config,
              seasonStart,
            }),
          );
        });

        coaches.push(
          generateCoach({
            rng,
            key: `${clubKey}-coach`,
            clubKey,
            countryId: country.id,
            namePool,
            seasonStart,
          }),
        );
      }

      const seasonKey = `season-${compKey}`;
      seasons.push({
        key: seasonKey,
        competitionKey: compKey,
        label: seasonLabel,
        startDate: seasonStart,
        endDate: seasonEnd,
      });

      for (const game of generateDoubleRoundRobin(divisionClubKeys)) {
        fixtures.push({
          seasonKey,
          matchday: game.matchday,
          homeClubKey: game.homeClubKey,
          awayClubKey: game.awayClubKey,
          scheduledAt: new Date(
            seasonStart.getTime() + (game.matchday - 1) * 7 * DAY_MS,
          ),
          importance: 1,
        });
      }
    }
  }

  return { competitions, clubs, coaches, players, seasons, fixtures };
}

import type { WorldGenerationConfig } from '@football-life/shared';
import {
  academyIntakeStrength,
  buildSquadPositions,
  createRandomSource,
  generatePlayer,
  intakeClassSize,
} from '@football-life/simulation-engine';
import type {
  NewYouth,
  NpcAgingRepository,
} from '../repositories/npc-aging-repository';
import type { YouthIntakeRepository } from '../repositories/youth-intake-repository';
import type { NewsItemInput } from '../repositories/news-repository';

// Academy graduates are younger than aging-replacement youngsters.
const INTAKE_AGE = { min: 15, max: 18, mean: 16, spread: 1 };
const POSITION_LABELS: Record<string, string> = {
  GK: 'portiere',
  DF: 'difensore',
  MF: 'centrocampista',
  WG: 'ala',
  FW: 'attaccante',
};

export interface YouthIntakeDeps {
  intake: YouthIntakeRepository;
  /** Reused for persistence: an intake is just a batch of new youth. */
  aging: NpcAgingRepository;
  worldConfig: WorldGenerationConfig;
}

export interface IntakeGraduate {
  name: string;
  position: string;
  potential: number;
  /** True when the kid plays the protagonist's own position at their club. */
  rivalOfProtagonist: boolean;
}

export interface YouthIntakeResult {
  totalGraduates: number;
  /** Graduates joining the protagonist's own club (empty if unattached). */
  myClubGraduates: IntakeGraduate[];
  news: NewsItemInput[];
}

/**
 * Youth intake day: at every season boundary each club's academy graduates a
 * class of 1-3 teenagers into the first team. Better academies produce bigger
 * and brighter classes. The protagonist's club's class makes the news — and a
 * graduate in the protagonist's own role is called out as a coming rival.
 */
export async function runYouthIntake(
  deps: YouthIntakeDeps,
  input: { saveGameId: string; seasonLabel: string },
): Promise<YouthIntakeResult> {
  const state = await deps.intake.loadIntakeState(input.saveGameId);
  if (!state || state.clubs.length === 0) {
    return { totalGraduates: 0, myClubGraduates: [], news: [] };
  }

  const rng = createRandomSource(
    `${state.seed}:youth-intake:${input.seasonLabel}`,
  );
  const youthConfig: WorldGenerationConfig = {
    ...deps.worldConfig,
    age: INTAKE_AGE,
  };

  const youth: NewYouth[] = [];
  const myClubGraduates: IntakeGraduate[] = [];

  for (const club of state.clubs) {
    const namePool = deps.worldConfig.namePools[club.countryId];
    if (!namePool) continue;
    const size = intakeClassSize(club.academyQuality, rng);
    // A small balanced pool, sampled so classes vary position by position.
    const positions = buildSquadPositions(6);
    for (let i = 0; i < size; i += 1) {
      const position = positions[rng.integer(0, positions.length - 1)]!;
      const player = generatePlayer({
        rng,
        key: `intake-${club.id}-${input.seasonLabel}-${i}`,
        clubKey: club.id,
        countryId: club.countryId,
        namePool,
        position,
        clubStrength: academyIntakeStrength(
          club.strength,
          club.academyQuality,
        ),
        config: youthConfig,
        seasonStart: state.currentDate,
      });
      youth.push({ clubId: club.id, player });
      if (club.id === state.protagonistClubId) {
        myClubGraduates.push({
          name: `${player.firstName} ${player.lastName}`,
          position: player.primaryPosition,
          potential: Math.round(player.potentialAbility),
          rivalOfProtagonist:
            player.primaryPosition === state.protagonistPosition,
        });
      }
    }
  }

  await deps.aging.persistAging(input.saveGameId, {
    abilityUpdates: [],
    retiredPlayerIds: [],
    youth,
  });

  const news: NewsItemInput[] = [
    {
      gameDate: state.currentDate,
      category: 'YOUTH',
      headline: 'Intake day: i vivai promuovono i loro talenti',
      body: `${youth.length} giovani in tutto il mondo salgono in prima squadra dai settori giovanili.`,
    },
  ];
  if (myClubGraduates.length > 0) {
    const myClub = state.clubs.find((c) => c.id === state.protagonistClubId);
    const names = myClubGraduates
      .map(
        (g) =>
          `${g.name} (${POSITION_LABELS[g.position] ?? g.position})`,
      )
      .join(', ');
    const rival = myClubGraduates.find((g) => g.rivalOfProtagonist);
    news.push({
      gameDate: state.currentDate,
      category: 'YOUTH',
      headline: `Il vivaio del ${myClub?.name ?? 'tuo club'} presenta la nuova classe`,
      body:
        `Salgono in prima squadra: ${names}.` +
        (rival
          ? ` Occhio a ${rival.name}: gioca nel tuo ruolo e vuole il tuo posto.`
          : ''),
    });
  }

  return { totalGraduates: youth.length, myClubGraduates, news };
}

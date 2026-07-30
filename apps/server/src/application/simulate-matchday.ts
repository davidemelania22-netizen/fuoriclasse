import type { MatchConfig } from '@football-life/shared';
import {
  applyResult,
  clamp,
  createRandomSource,
  formAfterMatch,
  formWhenIdle,
  resolveMatchPlan,
  simulateMatch,
  sortStandings,
  type KeyMomentResult,
  type MatchApproach,
  type MatchEvent,
  type MatchResult,
  type StandingRow,
} from '@football-life/simulation-engine';
import type { MatchdayRepository } from '../repositories/matchday-repository';
import type { StoredMatchPlan } from '../repositories/profile-repository';

export interface MatchdayDeps {
  repository: MatchdayRepository;
  config: MatchConfig;
}

export interface MatchdayInput {
  saveGameId: string;
  fromDate: Date;
  toDate: Date;
  /** Prepared plan for the protagonist's next match, consumed once. */
  matchPlan?: StoredMatchPlan | null;
}

export interface TabellinoEntry {
  minute: number;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD';
  clubId: string;
  clubName: string;
  playerName: string;
  assistPlayerName: string | null;
}

export interface LineupEntry {
  playerId: string;
  playerName: string;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  isProtagonist: boolean;
}

export interface Pagella {
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  comment: string;
}

export interface MatchdayReport {
  date: string;
  competitionName: string;
  homeClubName: string;
  awayClubName: string;
  homeGoals: number;
  awayGoals: number;
  isHome: boolean;
  isDerby: boolean;
  /** Approach the player prepared for this match, if any. */
  approach: MatchApproach | null;
  /** Outcomes of the prepared key moments (empty when no plan was set). */
  keyMoments: KeyMomentResult[];
  tabellino: TabellinoEntry[];
  liveFeed: string[];
  homeLineup: LineupEntry[];
  awayLineup: LineupEntry[];
  pagella: Pagella | null;
}

/**
 * Applies a prepared pre-match plan to the protagonist's result IN PLACE:
 * adjusts their appearance line, and folds any created goals into the team
 * score with matching events so standings/tabellino stay consistent. Returns
 * the resolved key-moment outcomes for the report. No-op unless the protagonist
 * actually started.
 */
function applyMatchPlan(
  result: MatchResult,
  ctx: {
    seed: string;
    fixtureId: string;
    isHome: boolean;
    protagonistClubId: string;
    protagonistPlayerId: string;
    plan: StoredMatchPlan;
  },
): KeyMomentResult[] {
  const appearance = result.appearances.find(
    (a) => a.playerId === ctx.protagonistPlayerId,
  );
  if (!appearance) return [];

  const outcome = resolveMatchPlan(
    createRandomSource(`${ctx.seed}:matchplan:${ctx.fixtureId}`),
    createRandomSource(`${ctx.seed}:matchplan-roll:${ctx.fixtureId}`),
    {
      approach: ctx.plan.approach as MatchApproach,
      choices: ctx.plan.choices,
      isDerby: ctx.plan.isDerby,
    },
  );

  appearance.rating =
    Math.round(clamp(appearance.rating + outcome.ratingDelta, 1, 10) * 10) / 10;
  appearance.goals += outcome.goals;
  appearance.assists += outcome.assists;
  appearance.yellowCards += outcome.yellowCards;
  appearance.redCards += outcome.redCards;

  if (outcome.teamGoalDelta > 0) {
    if (ctx.isHome) result.homeGoals += outcome.teamGoalDelta;
    else result.awayGoals += outcome.teamGoalDelta;

    const teammate = result.appearances.find(
      (a) =>
        a.clubId === ctx.protagonistClubId &&
        a.playerId !== ctx.protagonistPlayerId,
    );
    const minuteRng = createRandomSource(
      `${ctx.seed}:matchplan-min:${ctx.fixtureId}`,
    );
    for (let i = 0; i < outcome.goals; i += 1) {
      result.events.push({
        type: 'GOAL',
        clubId: ctx.protagonistClubId,
        playerId: ctx.protagonistPlayerId,
        minute: minuteRng.integer(1, 90),
      });
    }
    for (let i = 0; i < outcome.assists; i += 1) {
      result.events.push({
        type: 'GOAL',
        clubId: ctx.protagonistClubId,
        playerId: teammate?.playerId ?? ctx.protagonistPlayerId,
        minute: minuteRng.integer(1, 90),
        assistPlayerId: ctx.protagonistPlayerId,
      });
    }
    result.events.sort((a, b) => a.minute - b.minute);
  }

  return outcome.moments;
}

function pagellaComment(
  rating: number,
  goals: number,
  assists: number,
  redCards: number,
  won: boolean,
  lost: boolean,
): string {
  const parts: string[] = [];
  if (rating >= 8)
    parts.push('Prestazione da fuoriclasse, tra i migliori in campo.');
  else if (rating >= 7) parts.push('Ottima gara, sempre nel vivo del gioco.');
  else if (rating >= 6)
    parts.push('Prova sufficiente, senza infamia e senza lode.');
  else if (rating >= 5) parts.push('Partita opaca, fatica a incidere.');
  else parts.push('Prestazione da dimenticare.');

  if (goals >= 2) parts.push(`Decisivo con una doppietta.`);
  else if (goals === 1) parts.push('Sblocca il match con un gol pesante.');
  if (assists >= 1)
    parts.push(
      `Serve ${assists === 1 ? 'un assist' : `${assists} assist`} ai compagni.`,
    );
  if (redCards > 0) parts.push('Espulso, lascia la squadra in dieci.');
  else if (won) parts.push('Contribuisce alla vittoria della squadra.');
  else if (lost) parts.push('Non basta a evitare la sconfitta.');

  return parts.join(' ');
}

const GOAL_PHRASES = [
  'trova il gol con un tiro preciso',
  'insacca dopo una bella azione personale',
  'sblocca il pallone in rete con freddezza',
  'colpisce con potenza e non lascia scampo al portiere',
];
const YELLOW_PHRASES = [
  (name: string, club: string): string => `Ammonizione per ${name} (${club}).`,
  (name: string, club: string): string =>
    `Il direttore di gara estrae il cartellino giallo per ${name} (${club}).`,
];
const RED_PHRASES = [
  (name: string, club: string): string =>
    `Espulso ${name} (${club})! La squadra resta in dieci.`,
  (name: string, club: string): string =>
    `Cartellino rosso per ${name} (${club}), che lascia i compagni in inferiorità numerica.`,
];

/** A minute-by-minute Italian commentary feed built from the tabellino. */
function buildLiveFeed(
  tabellino: readonly TabellinoEntry[],
  homeClubId: string,
  homeClubName: string,
  awayClubName: string,
  homeGoals: number,
  awayGoals: number,
): string[] {
  const feed: string[] = [
    `1' 🟢 Si comincia! ${homeClubName} contro ${awayClubName}.`,
  ];
  let runningHome = 0;
  let runningAway = 0;
  let halftimeShown = false;

  const showHalftime = (): void => {
    if (halftimeShown) return;
    feed.push(`45' ⏸ Fine primo tempo: ${runningHome}-${runningAway}.`);
    halftimeShown = true;
  };

  for (const event of tabellino) {
    if (event.minute > 45) showHalftime();

    if (event.type === 'GOAL') {
      if (event.clubId === homeClubId) runningHome += 1;
      else runningAway += 1;
      const phrase =
        GOAL_PHRASES[
          (event.minute + event.playerName.length) % GOAL_PHRASES.length
        ]!;
      const assistSuffix = event.assistPlayerName
        ? ` dopo l'assist di ${event.assistPlayerName}`
        : '';
      feed.push(
        `${event.minute}' ⚽ GOL! ${event.playerName} (${event.clubName}) ${phrase}${assistSuffix}. Il punteggio è ${runningHome}-${runningAway}.`,
      );
    } else if (event.type === 'YELLOW_CARD') {
      const phrase = YELLOW_PHRASES[event.minute % YELLOW_PHRASES.length]!;
      feed.push(
        `${event.minute}' 🟨 ${phrase(event.playerName, event.clubName)}`,
      );
    } else {
      const phrase = RED_PHRASES[event.minute % RED_PHRASES.length]!;
      feed.push(
        `${event.minute}' 🟥 ${phrase(event.playerName, event.clubName)}`,
      );
    }
  }

  showHalftime();
  feed.push(
    `90' 🔚 Fischio finale: ${homeClubName} ${homeGoals}-${awayGoals} ${awayClubName}.`,
  );
  return feed;
}

function eventTabellino(
  events: readonly MatchEvent[],
  clubNames: ReadonlyMap<string, string>,
  playerNames: ReadonlyMap<string, string>,
): TabellinoEntry[] {
  return events.map((event) => ({
    minute: event.minute,
    type: event.type,
    clubId: event.clubId,
    clubName: clubNames.get(event.clubId) ?? 'Sconosciuto',
    playerName: playerNames.get(event.playerId) ?? 'Sconosciuto',
    assistPlayerName: event.assistPlayerId
      ? (playerNames.get(event.assistPlayerId) ?? null)
      : null,
  }));
}

/** Simulates every matchday due between fromDate (exclusive) and toDate (inclusive). */
export async function simulateDueMatchdays(
  deps: MatchdayDeps,
  input: MatchdayInput,
): Promise<MatchdayReport[]> {
  const dates = await deps.repository.findDueMatchdayDates(
    input.saveGameId,
    input.fromDate,
    input.toDate,
  );

  const reports: MatchdayReport[] = [];
  for (const date of dates) {
    const rounds = await deps.repository.loadAllMatchdayRounds(
      input.saveGameId,
      date,
    );
    for (const round of rounds) {
      // Only the protagonist's own league needs per-player appearance rows
      // persisted (for pagelle, awards and the career timeline); the rest of the
      // world only needs results and standings.
      const isProtagonistRound =
        round.protagonistClubId !== null &&
        round.fixtures.some(
          (f) =>
            f.homeClubId === round.protagonistClubId ||
            f.awayClubId === round.protagonistClubId,
        );

      const rng = createRandomSource(
        `${round.seed}:matchday:${round.seasonId}:${date.toISOString()}`,
      );

      const table = new Map<string, StandingRow>(
        round.standings.map((row) => [row.clubId, row]),
      );

      let protagonistFixture: (typeof round.fixtures)[number] | null = null;
      const fixturePersistence: {
        fixtureId: string;
        homeGoals: number;
        awayGoals: number;
        homeXg: number;
        awayXg: number;
        simulationData: unknown;
      }[] = [];
      const appearancePersistence: {
        fixtureId: string;
        playerId: string;
        clubId: string;
        started: boolean;
        minutesPlayed: number;
        position: string;
        rating: number;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
      }[] = [];
      let protagonistReport: MatchdayReport | null = null;
      // Ratings of everyone who actually played this round (protagonist league).
      const ratingByPlayer = new Map<string, number>();

      for (const fixture of round.fixtures) {
        const homePlayers = round.squads.get(fixture.homeClubId) ?? [];
        const awayPlayers = round.squads.get(fixture.awayClubId) ?? [];

        const result = simulateMatch({
          home: { clubId: fixture.homeClubId, players: homePlayers },
          away: { clubId: fixture.awayClubId, players: awayPlayers },
          config: deps.config,
          rng,
        });

        const isHome = round.protagonistClubId === fixture.homeClubId;
        const involvesProtagonist =
          isHome || round.protagonistClubId === fixture.awayClubId;

        // Consume the prepared plan for the protagonist's own fixture BEFORE
        // standings/persistence so the adjusted score/appearance flow through.
        let keyMoments: KeyMomentResult[] = [];
        if (
          involvesProtagonist &&
          input.matchPlan &&
          input.matchPlan.fixtureId === fixture.id &&
          round.protagonistClubId &&
          round.protagonistPlayerId
        ) {
          keyMoments = applyMatchPlan(result, {
            seed: round.seed,
            fixtureId: fixture.id,
            isHome,
            protagonistClubId: round.protagonistClubId,
            protagonistPlayerId: round.protagonistPlayerId,
            plan: input.matchPlan,
          });
        }

        applyResult(table, {
          homeClubId: fixture.homeClubId,
          awayClubId: fixture.awayClubId,
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
        });

        fixturePersistence.push({
          fixtureId: fixture.id,
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          homeXg: result.homeXg,
          awayXg: result.awayXg,
          simulationData: {
            events: result.events,
            commentary: result.commentary,
          },
        });
        if (isProtagonistRound) {
          appearancePersistence.push(
            ...result.appearances.map((appearance) => ({
              fixtureId: fixture.id,
              ...appearance,
            })),
          );
          for (const appearance of result.appearances) {
            ratingByPlayer.set(appearance.playerId, appearance.rating);
          }
        }

        if (involvesProtagonist) {
          protagonistFixture = fixture;
          const toLineup = (clubId: string): LineupEntry[] =>
            result.appearances
              .filter((a) => a.clubId === clubId)
              .map((a) => ({
                playerId: a.playerId,
                playerName: round.playerNames.get(a.playerId) ?? 'Sconosciuto',
                position: a.position,
                rating: a.rating,
                goals: a.goals,
                assists: a.assists,
                yellowCards: a.yellowCards,
                redCards: a.redCards,
                isProtagonist: a.playerId === round.protagonistPlayerId,
              }));

          const protagonistAppearance = round.protagonistPlayerId
            ? result.appearances.find(
                (a) => a.playerId === round.protagonistPlayerId,
              )
            : undefined;
          const protagonistGoals = protagonistAppearance
            ? isHome
              ? result.homeGoals
              : result.awayGoals
            : 0;
          const opponentGoals = protagonistAppearance
            ? isHome
              ? result.awayGoals
              : result.homeGoals
            : 0;

          const homeClubName =
            round.clubNames.get(fixture.homeClubId) ?? 'Sconosciuto';
          const awayClubName =
            round.clubNames.get(fixture.awayClubId) ?? 'Sconosciuto';
          const tabellino = eventTabellino(
            result.events,
            round.clubNames,
            round.playerNames,
          );

          protagonistReport = {
            date: date.toISOString(),
            competitionName: round.competitionName,
            homeClubName,
            awayClubName,
            homeGoals: result.homeGoals,
            awayGoals: result.awayGoals,
            isHome,
            isDerby:
              input.matchPlan?.fixtureId === fixture.id
                ? input.matchPlan.isDerby
                : false,
            approach:
              input.matchPlan?.fixtureId === fixture.id
                ? (input.matchPlan.approach as MatchApproach)
                : null,
            keyMoments,
            tabellino,
            liveFeed: buildLiveFeed(
              tabellino,
              fixture.homeClubId,
              homeClubName,
              awayClubName,
              result.homeGoals,
              result.awayGoals,
            ),
            homeLineup: toLineup(fixture.homeClubId),
            awayLineup: toLineup(fixture.awayClubId),
            pagella: protagonistAppearance
              ? {
                  rating: protagonistAppearance.rating,
                  goals: protagonistAppearance.goals,
                  assists: protagonistAppearance.assists,
                  yellowCards: protagonistAppearance.yellowCards,
                  redCards: protagonistAppearance.redCards,
                  comment: pagellaComment(
                    protagonistAppearance.rating,
                    protagonistAppearance.goals,
                    protagonistAppearance.assists,
                    protagonistAppearance.redCards,
                    protagonistGoals > opponentGoals,
                    protagonistGoals < opponentGoals,
                  ),
                }
              : null,
          };
        }
      }

      // Dynamic form for the protagonist's league: performers rise, benchwarmers
      // drift back to baseline — so the fight for a starting spot is real.
      const formUpdates: { playerId: string; form: number }[] = [];
      if (isProtagonistRound) {
        const roundClubIds = new Set(
          round.fixtures.flatMap((f) => [f.homeClubId, f.awayClubId]),
        );
        for (const clubId of roundClubIds) {
          for (const player of round.squads.get(clubId) ?? []) {
            const rating = ratingByPlayer.get(player.id);
            const nextForm =
              rating !== undefined
                ? formAfterMatch(player.form, rating)
                : formWhenIdle(player.form);
            formUpdates.push({ playerId: player.id, form: nextForm });
          }
        }
      }

      await deps.repository.persistMatchdayResults({
        seasonId: round.seasonId,
        fixtures: fixturePersistence,
        appearances: appearancePersistence,
        standings: sortStandings([...table.values()]),
        completeSeason: round.remainingAfterThisRound === 0,
        formUpdates,
      });

      if (protagonistFixture && protagonistReport) {
        reports.push(protagonistReport);
      }
    }
  }

  return reports;
}

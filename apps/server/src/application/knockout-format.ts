import type {
  KnockoutResult,
  KnockoutTie,
} from '@football-life/simulation-engine';

/** Round names counting back from the final (0 = final). */
export function roundLabel(round: number, roundsCount: number): string {
  const fromFinal = roundsCount - round;
  const names = [
    'Finale',
    'Semifinale',
    'Quarti',
    'Ottavi',
    'Sedicesimi',
    'Trentaduesimi',
  ];
  return names[fromFinal] ?? `Turno ${round}`;
}

export interface KnockoutRunStep {
  roundLabel: string;
  opponentName: string;
  won: boolean;
  penalties: boolean;
}

export interface ProtagonistKnockoutRun {
  participated: boolean;
  isChampion: boolean;
  exitRoundLabel: string | null;
  path: KnockoutRunStep[];
}

/** Builds the protagonist's round-by-round path through a knockout bracket. */
export function buildProtagonistRun(
  result: KnockoutResult,
  protagonistClubId: string | null,
  entrants: readonly string[],
  nameOf: (clubId: string) => string,
): ProtagonistKnockoutRun {
  const path: KnockoutRunStep[] = [];
  let participated = false;
  let exitRoundLabel: string | null = null;

  if (protagonistClubId && entrants.includes(protagonistClubId)) {
    participated = true;
    const own: KnockoutTie[] = result.ties
      .filter(
        (t) =>
          t.homeClubId === protagonistClubId ||
          t.awayClubId === protagonistClubId,
      )
      .sort((a, b) => a.round - b.round);
    for (const tie of own) {
      const opponent =
        tie.homeClubId === protagonistClubId ? tie.awayClubId : tie.homeClubId;
      const won = tie.winnerClubId === protagonistClubId;
      path.push({
        roundLabel: roundLabel(tie.round, result.roundsCount),
        opponentName: nameOf(opponent),
        won,
        penalties: tie.decidedByPenalties,
      });
      if (!won) exitRoundLabel = roundLabel(tie.round, result.roundsCount);
    }
  }

  return {
    participated,
    isChampion: protagonistClubId === result.championClubId,
    exitRoundLabel,
    path,
  };
}

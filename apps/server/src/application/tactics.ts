import type { MatchConfig } from '@football-life/shared';
import {
  ATTACK_STYLES,
  DEFAULT_INSTRUCTIONS,
  selectionBiasFromTrust,
  TEMPERAMENTS,
  type AttackStyle,
  type TacticalInstructions,
  type Temperament,
} from '@football-life/simulation-engine';
import type { ProfileRepository } from '../repositories/profile-repository';
import type { TacticsRepository } from '../repositories/tactics-repository';

const POSITION_ORDER = ['GK', 'DF', 'MF', 'WG', 'FW'] as const;
const POSITION_LABELS: Record<string, string> = {
  GK: 'Portieri',
  DF: 'Difensori',
  MF: 'Centrocampisti',
  WG: 'Ali',
  FW: 'Attaccanti',
};

export interface DepthChartRow {
  name: string;
  rank: number;
  score: number;
  form: number;
  condition: number;
  available: boolean;
  isProtagonist: boolean;
  /** Would start if the match were played today (top N for the formation). */
  projectedStarter: boolean;
}

export interface DepthChartGroup {
  position: string;
  label: string;
  slots: number;
  rows: DepthChartRow[];
}

export interface TacticsView {
  clubName: string;
  formationLabel: string;
  depthChart: DepthChartGroup[];
  instructions: TacticalInstructions;
  styles: typeof ATTACK_STYLES;
  temperaments: typeof TEMPERAMENTS;
}

export interface TacticsDeps {
  tactics: TacticsRepository;
  profile: ProfileRepository;
  matchConfig: MatchConfig;
}

/**
 * The tactics screen: the club's system, the pecking order for every
 * position (same score the SelectionAI uses, minus the randomness), and the
 * protagonist's personal instructions.
 */
export async function getTactics(
  deps: TacticsDeps,
  saveGameId: string,
): Promise<TacticsView | null> {
  const state = await deps.tactics.loadTacticsState(saveGameId);
  if (!state) return null;
  const profile = await deps.profile.getProfile(saveGameId);
  const instructions =
    (profile?.tacticalInstructions as TacticalInstructions | null) ??
    DEFAULT_INSTRUCTIONS;

  const w = deps.matchConfig.selectionWeights;
  const trustBias =
    state.protagonistTrust !== null
      ? selectionBiasFromTrust(state.protagonistTrust)
      : 0;

  const formation = deps.matchConfig.formation;
  const depthChart: DepthChartGroup[] = POSITION_ORDER.map((position) => {
    const slots = formation[position] ?? 0;
    const rows = state.squad
      .filter((member) => member.position === position)
      .map((member) => ({
        member,
        score:
          member.currentAbility * w.ability +
          member.form * w.form +
          member.condition * w.condition +
          (member.isProtagonist ? trustBias : 0),
      }))
      .sort((a, b) => {
        // Unavailable players sink to the bottom regardless of score.
        if (a.member.available !== b.member.available) {
          return a.member.available ? -1 : 1;
        }
        return b.score - a.score;
      })
      .map(({ member, score }, index) => ({
        name: member.name,
        rank: index + 1,
        score: Math.round(score * 10) / 10,
        form: Math.round(member.form),
        condition: Math.round(member.condition),
        available: member.available,
        isProtagonist: member.isProtagonist,
        projectedStarter: member.available && index < slots,
      }));
    return {
      position,
      label: POSITION_LABELS[position] ?? position,
      slots,
      rows,
    };
  }).filter((group) => group.rows.length > 0 || group.slots > 0);

  const formationLabel = [
    formation.DF ?? 0,
    formation.MF ?? 0,
    formation.WG ?? 0,
    formation.FW ?? 0,
  ]
    .filter((n) => n > 0)
    .join('-');

  return {
    clubName: state.clubName,
    formationLabel,
    depthChart,
    instructions,
    styles: ATTACK_STYLES,
    temperaments: TEMPERAMENTS,
  };
}

export type SetInstructionsResult = 'ok' | 'invalid';

const STYLE_KEYS = new Set(ATTACK_STYLES.map((s) => s.key));
const TEMPERAMENT_KEYS = new Set(TEMPERAMENTS.map((t) => t.key));

/** Persist the protagonist's personal instructions (validated). */
export async function setInstructions(
  deps: Pick<TacticsDeps, 'profile'>,
  saveGameId: string,
  input: { style: string; temperament: string },
): Promise<SetInstructionsResult> {
  if (
    !STYLE_KEYS.has(input.style as AttackStyle) ||
    !TEMPERAMENT_KEYS.has(input.temperament as Temperament)
  ) {
    return 'invalid';
  }
  await deps.profile.setTacticalInstructions(saveGameId, input);
  return 'ok';
}

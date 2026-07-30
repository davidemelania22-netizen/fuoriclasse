/**
 * Personal tactical instructions — the player-career answer to FM's tactics
 * screen. The protagonist doesn't pick the team's formation (the manager
 * does); they decide HOW to interpret their own role. Two axes, each a
 * three-way choice, translated into the MatchPlayer goal/assist/card biases
 * consumed by the match engine.
 */

export type AttackStyle = 'SHOOT' | 'BALANCED' | 'CREATE';
export type Temperament = 'AGGRESSIVE' | 'COMPOSED' | 'DISCIPLINED';

export interface TacticalInstructions {
  style: AttackStyle;
  temperament: Temperament;
}

export const DEFAULT_INSTRUCTIONS: TacticalInstructions = {
  style: 'BALANCED',
  temperament: 'COMPOSED',
};

export const ATTACK_STYLES: {
  key: AttackStyle;
  label: string;
  description: string;
}[] = [
  {
    key: 'SHOOT',
    label: 'Cerca il tiro',
    description: 'Concludi appena puoi: più gol, meno assist.',
  },
  {
    key: 'BALANCED',
    label: 'Equilibrato',
    description: 'Leggi l’azione e scegli di volta in volta.',
  },
  {
    key: 'CREATE',
    label: 'Rifinitore',
    description: 'Metti i compagni davanti alla porta: più assist, meno gol.',
  },
];

export const TEMPERAMENTS: {
  key: Temperament;
  label: string;
  description: string;
}[] = [
  {
    key: 'AGGRESSIVE',
    label: 'Aggressivo',
    description: 'Sempre nel vivo: più incisivo ma rischi più cartellini.',
  },
  {
    key: 'COMPOSED',
    label: 'Composto',
    description: 'Intensità naturale, nessun eccesso.',
  },
  {
    key: 'DISCIPLINED',
    label: 'Disciplinato',
    description: 'Mai in ritardo: meno cartellini, un filo meno presenza.',
  },
];

export interface InstructionBiases {
  goalBias: number;
  assistBias: number;
  cardBias: number;
}

const STYLE_BIASES: Record<AttackStyle, { goal: number; assist: number }> = {
  SHOOT: { goal: 1.6, assist: 0.7 },
  BALANCED: { goal: 1, assist: 1 },
  CREATE: { goal: 0.7, assist: 1.6 },
};

const TEMPERAMENT_BIASES: Record<
  Temperament,
  { involvement: number; card: number }
> = {
  AGGRESSIVE: { involvement: 1.1, card: 1.6 },
  COMPOSED: { involvement: 1, card: 1 },
  DISCIPLINED: { involvement: 0.95, card: 0.6 },
};

/** Translate the two chosen instructions into match-engine biases. */
export function biasesFor(
  instructions: TacticalInstructions,
): InstructionBiases {
  const style = STYLE_BIASES[instructions.style] ?? STYLE_BIASES.BALANCED;
  const temperament =
    TEMPERAMENT_BIASES[instructions.temperament] ?? TEMPERAMENT_BIASES.COMPOSED;
  return {
    goalBias: style.goal * temperament.involvement,
    assistBias: style.assist * temperament.involvement,
    cardBias: temperament.card,
  };
}

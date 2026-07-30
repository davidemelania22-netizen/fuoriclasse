import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';

/**
 * Pre-match plan: the protagonist decides an overall approach and how they will
 * handle the decisive moments of the match BEFORE the whistle. The plan is then
 * consumed when the match is simulated, adjusting the protagonist's individual
 * line (rating/goals/assists/cards) and — when a big chance is taken — the team
 * score itself. This is the interactive "il match si gioca" layer.
 */

export type MatchApproach = 'DEFENSIVE' | 'BALANCED' | 'ATTACKING';

export const MATCH_APPROACHES: {
  key: MatchApproach;
  label: string;
  description: string;
}[] = [
  {
    key: 'DEFENSIVE',
    label: 'Prudente',
    description: 'Gioca sul sicuro: meno rischi, valutazione più stabile.',
  },
  {
    key: 'BALANCED',
    label: 'Equilibrato',
    description: 'Nessun eccesso: affronti la gara con misura.',
  },
  {
    key: 'ATTACKING',
    label: 'Offensivo',
    description: 'Cerchi la giocata: più occasioni ma più rischi.',
  },
];

interface MomentEffect {
  text: string;
  ratingDelta: number;
  /** Protagonist goals scored (each adds one to the team score). */
  goals: number;
  /** Protagonist assists (each adds one to the team score). */
  assists: number;
  yellowCards: number;
  redCards: number;
}

interface KeyMomentOption {
  key: string;
  label: string;
  /** Base chance the option comes off, before approach/derby modifiers. */
  successChance: number;
  /** Offensive options gain from an attacking approach and suffer from a cautious one. */
  offensive: boolean;
  success: MomentEffect;
  fail: MomentEffect;
}

interface KeyMomentTemplate {
  id: string;
  prompt: string;
  options: KeyMomentOption[];
}

/** How many decisive moments a single match presents. */
export const KEY_MOMENTS_PER_MATCH = 3;

const KEY_MOMENT_TEMPLATES: readonly KeyMomentTemplate[] = [
  {
    id: 'one-on-one',
    prompt: 'Ti ritrovi solo davanti al portiere.',
    options: [
      {
        key: 'shoot',
        label: 'Calcia di prima',
        successChance: 0.5,
        offensive: true,
        success: {
          text: 'Freddi il portiere con un tiro angolato: gol!',
          ratingDelta: 1.4,
          goals: 1,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Il portiere respinge il tuo tiro.',
          ratingDelta: -0.6,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
      {
        key: 'dribble',
        label: 'Salta il portiere',
        successChance: 0.35,
        offensive: true,
        success: {
          text: 'Salti il portiere e depositi in porta vuota!',
          ratingDelta: 1.8,
          goals: 1,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Il portiere anticipa la tua finta.',
          ratingDelta: -0.9,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
      {
        key: 'square',
        label: 'Servi il compagno',
        successChance: 0.72,
        offensive: false,
        success: {
          text: 'Appoggio al compagno tutto solo: assist e gol.',
          ratingDelta: 0.9,
          goals: 0,
          assists: 1,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Il passaggio viene intercettato in scivolata.',
          ratingDelta: -0.2,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
    ],
  },
  {
    id: 'free-kick',
    prompt: 'Punizione dal limite: te ne incarichi tu?',
    options: [
      {
        key: 'shoot',
        label: 'Calcia in porta',
        successChance: 0.32,
        offensive: true,
        success: {
          text: 'La metti sotto l’incrocio: gran gol su punizione!',
          ratingDelta: 1.7,
          goals: 1,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'La barriera respinge la tua conclusione.',
          ratingDelta: -0.3,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
      {
        key: 'cross',
        label: 'Crossa in area',
        successChance: 0.55,
        offensive: false,
        success: {
          text: 'Cross perfetto per la testa del compagno: assist!',
          ratingDelta: 0.9,
          goals: 0,
          assists: 1,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Il portiere fa sua la palla in presa alta.',
          ratingDelta: -0.1,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
    ],
  },
  {
    id: 'last-man',
    prompt: 'L’attaccante avversario ti sfugge e punta la porta.',
    options: [
      {
        key: 'tackle',
        label: 'Entrata decisa',
        successChance: 0.58,
        offensive: false,
        success: {
          text: 'Recupero pulito e ripartenza: intervento provvidenziale.',
          ratingDelta: 0.8,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Arrivi in ritardo: fallo e cartellino.',
          ratingDelta: -0.7,
          goals: 0,
          assists: 0,
          yellowCards: 1,
          redCards: 0,
        },
      },
      {
        key: 'contain',
        label: 'Contieni e temporeggia',
        successChance: 0.7,
        offensive: false,
        success: {
          text: 'Lo accompagni fuori e rientrano i compagni: pericolo sventato.',
          ratingDelta: 0.4,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Ti salta e crea una palla gol per i suoi.',
          ratingDelta: -0.5,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
    ],
  },
  {
    id: 'header-chance',
    prompt: 'Arriva un cross teso: attacchi il primo palo?',
    options: [
      {
        key: 'attack',
        label: 'Stacca di testa',
        successChance: 0.44,
        offensive: true,
        success: {
          text: 'Incorni verso il palo lontano: gol di testa!',
          ratingDelta: 1.3,
          goals: 1,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Arrivi in anticipo ma la palla esce di poco.',
          ratingDelta: -0.3,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
      {
        key: 'hold',
        label: 'Fai da sponda',
        successChance: 0.65,
        offensive: false,
        success: {
          text: 'Spizzichi per il compagno che segna: assist!',
          ratingDelta: 0.8,
          goals: 0,
          assists: 1,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'La sponda è imprecisa e sfuma tutto.',
          ratingDelta: -0.1,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
    ],
  },
  {
    id: 'provocation',
    prompt: 'Un avversario ti provoca dopo un contrasto duro.',
    options: [
      {
        key: 'ignore',
        label: 'Ignora e vai',
        successChance: 0.85,
        offensive: false,
        success: {
          text: 'Resti freddo e concentrato sul gioco.',
          ratingDelta: 0.3,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'Perdi un attimo di lucidità ma niente di grave.',
          ratingDelta: -0.1,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      },
      {
        key: 'react',
        label: 'Rispondi a tono',
        successChance: 0.4,
        offensive: false,
        success: {
          text: 'Lo zittisci con una giocata alla prima occasione.',
          ratingDelta: 0.6,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
        fail: {
          text: 'L’arbitro vede la tua reazione: giallo.',
          ratingDelta: -0.6,
          goals: 0,
          assists: 0,
          yellowCards: 1,
          redCards: 0,
        },
      },
    ],
  },
];

export interface KeyMomentPrompt {
  id: string;
  prompt: string;
  options: { key: string; label: string }[];
}

export interface KeyMomentResult {
  momentId: string;
  prompt: string;
  choiceLabel: string;
  success: boolean;
  text: string;
}

export interface MatchPlanOutcome {
  ratingDelta: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  /** Net change to the protagonist's team score (goals + assisted goals). */
  teamGoalDelta: number;
  moments: KeyMomentResult[];
}

/**
 * The decisive moments a given fixture will present — deterministic per
 * (seed, fixtureId) so the preview shown to the player and the later resolution
 * agree on which situations arise.
 */
function pickTemplates(rng: RandomSource): KeyMomentTemplate[] {
  const pool = [...KEY_MOMENT_TEMPLATES];
  const chosen: KeyMomentTemplate[] = [];
  const count = Math.min(KEY_MOMENTS_PER_MATCH, pool.length);
  for (let i = 0; i < count; i += 1) {
    const index = rng.integer(0, pool.length - 1);
    chosen.push(pool.splice(index, 1)[0]!);
  }
  return chosen;
}

/** The moments to present to the player for a fixture (prompts only, no spoilers). */
export function keyMomentPrompts(pickRng: RandomSource): KeyMomentPrompt[] {
  return pickTemplates(pickRng).map((template) => ({
    id: template.id,
    prompt: template.prompt,
    options: template.options.map((o) => ({ key: o.key, label: o.label })),
  }));
}

function approachSuccessModifier(
  approach: MatchApproach,
  offensive: boolean,
): number {
  if (approach === 'ATTACKING') return offensive ? 0.08 : -0.03;
  if (approach === 'DEFENSIVE') return offensive ? -0.08 : 0.05;
  return 0;
}

/**
 * Resolves a prepared plan into concrete deltas applied to the protagonist's
 * match line. `pickRng` re-derives the same moments the player saw; `rollRng`
 * decides whether each chosen option comes off.
 */
export function resolveMatchPlan(
  pickRng: RandomSource,
  rollRng: RandomSource,
  plan: {
    approach: MatchApproach;
    choices: Record<string, string>;
    isDerby: boolean;
  },
): MatchPlanOutcome {
  const templates = pickTemplates(pickRng);
  const outcome: MatchPlanOutcome = {
    ratingDelta: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    teamGoalDelta: 0,
    moments: [],
  };

  for (const template of templates) {
    const choiceKey = plan.choices[template.id] ?? template.options[0]!.key;
    const option =
      template.options.find((o) => o.key === choiceKey) ?? template.options[0]!;
    const chance = clamp(
      option.successChance +
        approachSuccessModifier(plan.approach, option.offensive),
      0.05,
      0.95,
    );
    const success = rollRng.chance(chance);
    const effect = success ? option.success : option.fail;
    // A derby amplifies the emotional swing of each moment.
    const swing = plan.isDerby ? 1.5 : 1;

    outcome.ratingDelta += effect.ratingDelta * swing;
    outcome.goals += effect.goals;
    outcome.assists += effect.assists;
    outcome.yellowCards += effect.yellowCards;
    outcome.redCards += effect.redCards;
    outcome.teamGoalDelta += effect.goals + effect.assists;
    outcome.moments.push({
      momentId: template.id,
      prompt: template.prompt,
      choiceLabel: option.label,
      success,
      text: effect.text,
    });
  }

  return outcome;
}

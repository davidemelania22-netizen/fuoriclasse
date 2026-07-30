import type { Lifestyle } from '@football-life/shared';

/**
 * Off-pitch lifestyles, license-free. The choice is persisted on the
 * protagonist and unlocks lifestyle-specific media events (the "newspapers"),
 * whose consequences then shape popularity, morale and focus.
 */
export const LIFESTYLES: Lifestyle[] = [
  {
    key: 'FAMILY',
    name: 'Serio padre di famiglia',
    description:
      'Vita riservata e stabile, lontano dai riflettori. La stampa ti dipinge come un modello.',
    vibe: 'Riservato e stabile',
  },
  {
    key: 'PLAYBOY',
    name: 'Don Giovanni',
    description:
      'Vita sentimentale movimentata e mondana. Finisci spesso sulle copertine dei giornali.',
    vibe: 'Mondano e chiacchierato',
  },
  {
    key: 'PARTY',
    name: 'Re della notte',
    description:
      'Locali, feste e vita notturna. Tanta popolarità, ma anche scandali dietro l’angolo.',
    vibe: 'Festaiolo',
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professionista assoluto',
    description:
      'Tutto ruota attorno al calcio: disciplina e dedizione. I media lodano la tua serietà.',
    vibe: 'Disciplinato',
  },
];

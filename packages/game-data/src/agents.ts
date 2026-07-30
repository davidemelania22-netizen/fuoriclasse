import type { Agent } from '@football-life/shared';

/**
 * Selectable agents, license-free. Trade-off: stronger contacts secure bigger
 * raises and sponsor deals, but usually take a fatter commission.
 */
export const AGENTS: Agent[] = [
  {
    key: 'mentor',
    name: 'Don Vincenzo Sartori',
    commissionPct: 5,
    contacts: 2,
    blurb:
      'Vecchia scuola, onesto e paziente. Commissioni basse, ma una rete di contatti modesta.',
  },
  {
    key: 'rising',
    name: 'Giulia Marchetti',
    commissionPct: 8,
    contacts: 3,
    blurb:
      'Giovane e ambiziosa: cura la tua immagine e cresce con te. Buon equilibrio costi-risultati.',
  },
  {
    key: 'shark',
    name: 'Marco "Lo Squalo" Ferraro',
    commissionPct: 12,
    contacts: 4,
    blurb:
      'Aggressivo e spregiudicato. Strappa aumenti e sponsor importanti, ma si prende la sua fetta.',
  },
  {
    key: 'superagent',
    name: 'Aleksandar Bjelić',
    commissionPct: 15,
    contacts: 5,
    blurb:
      'Super-procuratore con contatti ovunque. Risultati al top, commissioni da capogiro.',
  },
];

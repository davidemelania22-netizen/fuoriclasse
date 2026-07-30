import type { CountryRecord } from '@football-life/shared';

/**
 * Static, license-free nations for the MVP world. `id` doubles as the stable
 * country code referenced by persons, clubs and competitions.
 */
export const COUNTRIES: readonly CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
  { id: 'EN', code: 'EN', name: 'Inghilterra', reputation: 92 },
  { id: 'ES', code: 'ES', name: 'Spagna', reputation: 90 },
  { id: 'FR', code: 'FR', name: 'Francia', reputation: 84 },
  { id: 'DE', code: 'DE', name: 'Germania', reputation: 89 },
];

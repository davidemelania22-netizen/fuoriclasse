/**
 * Static, license-free football content (countries, competitions, clubs,
 * events, injuries, balance config). Kept fully separate from the engine so it
 * can later be swapped for imported real-world datasets. Expanded in
 * Milestone 3 onward.
 */
export * from './countries';
export * from './world-config';
export * from './progression-config';
export * from './match-config';

export const GAME_DATA_PACKAGE_NAME = '@football-life/game-data';

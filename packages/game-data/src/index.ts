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
export * from './career-config';
export * from './wellbeing-config';
export * from './events';
export * from './retirement-config';
export * from './shop';
export * from './agents';
export * from './lifestyles';
export * from './interviews';
export * from './news-interviews';
export * from './quick-starts';

export const GAME_DATA_PACKAGE_NAME = '@football-life/game-data';

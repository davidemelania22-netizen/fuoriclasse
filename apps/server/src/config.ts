/**
 * Application-level configuration. The simulation engine never reads these;
 * they are injected by the application/use-case layer. Balance-sensitive values
 * move into the validated balance config in later milestones.
 */

/** Initial in-world date when a new career starts. */
export const GAME_START_DATE = new Date('2024-07-01T00:00:00.000Z');

/** Version stamped onto every save for migration/compatibility checks. */
export const SIMULATION_VERSION = '0.1.0';

/** Default RNG seed when the new-game request omits one. */
export const DEFAULT_SEED =
  process.env.SIMULATION_DEFAULT_SEED ?? 'football-life';

/** Pocket money a new protagonist starts with (academy/family allowance, €). */
export const STARTING_BALANCE = 25_000;

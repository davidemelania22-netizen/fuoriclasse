import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';

/**
 * Youth intake day — once a season every club's academy promotes a class of
 * teenagers into the first-team squad. Better academies graduate bigger,
 * more promising classes. (The FM ritual, seen from the pitch: one of those
 * kids might play YOUR position.)
 */

/** How many prospects a club's academy graduates this season (1-3). */
export function intakeClassSize(
  academyQuality: number,
  rng: RandomSource,
): number {
  const quality = clamp(academyQuality, 0, 100);
  let size = 1;
  if (rng.chance(quality / 150)) size += 1;
  if (rng.chance(quality / 320)) size += 1;
  return size;
}

/**
 * The "strength" fed into the player generator for an academy kid: a great
 * academy at a modest club can still produce a gem, a poor academy dampens
 * even a big club's intake.
 */
export function academyIntakeStrength(
  clubStrength: number,
  academyQuality: number,
): number {
  const quality = clamp(academyQuality, 0, 100);
  return clamp(clubStrength * (0.75 + quality / 200), 1, 100);
}

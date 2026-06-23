export interface WeightedItem<T> {
  value: T;
  weight: number;
}

/** A snapshot of a RandomSource, sufficient to resume the exact sequence. */
export interface RandomState {
  algorithm: string;
  a: number;
  b: number;
  c: number;
  d: number;
  callCount: number;
}

/**
 * Deterministic, injectable source of randomness. Domain code must depend on
 * this interface only and never call `Math.random()`. The same seed and the
 * same sequence of calls always produce the same results.
 */
export interface RandomSource {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (both inclusive). */
  integer(min: number, max: number): number;
  /** True with the given probability in [0, 1]. */
  chance(probability: number): boolean;
  /** Uniformly pick one element. */
  pick<T>(items: readonly T[]): T;
  /** Pick one element with probability proportional to its weight. */
  weightedPick<T>(items: readonly WeightedItem<T>[]): T;
  /** A sample from a normal distribution with the given mean and stddev. */
  normal(mean: number, standardDeviation: number): number;
  /** Serialize the current internal state. */
  getState(): RandomState;
}

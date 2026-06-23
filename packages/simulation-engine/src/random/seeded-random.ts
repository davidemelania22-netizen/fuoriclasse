import type { RandomSource, RandomState, WeightedItem } from './random-source';

const ALGORITHM = 'sfc32+cyrb128/1';

/** Hash an arbitrary string seed into four 32-bit integers (cyrb128). */
function cyrb128(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i += 1) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

class SeededRandom implements RandomSource {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  private callCount: number;
  private spare: number | null = null;

  constructor(state: {
    a: number;
    b: number;
    c: number;
    d: number;
    callCount: number;
  }) {
    this.a = state.a >>> 0;
    this.b = state.b >>> 0;
    this.c = state.c >>> 0;
    this.d = state.d >>> 0;
    this.callCount = state.callCount;
  }

  next(): number {
    // sfc32
    this.a |= 0;
    this.b |= 0;
    this.c |= 0;
    this.d |= 0;
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    this.callCount += 1;
    return (t >>> 0) / 4294967296;
  }

  integer(min: number, max: number): number {
    if (max < min) {
      throw new Error(`integer(min, max): max (${max}) < min (${min})`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('pick(): cannot pick from an empty array');
    }
    return items[this.integer(0, items.length - 1)] as T;
  }

  weightedPick<T>(items: readonly WeightedItem<T>[]): T {
    if (items.length === 0) {
      throw new Error('weightedPick(): cannot pick from an empty array');
    }
    let total = 0;
    for (const item of items) {
      if (item.weight < 0) {
        throw new Error('weightedPick(): negative weight');
      }
      total += item.weight;
    }
    if (total <= 0) {
      throw new Error('weightedPick(): total weight must be positive');
    }
    let threshold = this.next() * total;
    for (const item of items) {
      threshold -= item.weight;
      if (threshold < 0) {
        return item.value;
      }
    }
    return items[items.length - 1]!.value;
  }

  normal(mean: number, standardDeviation: number): number {
    if (this.spare !== null) {
      const value = this.spare;
      this.spare = null;
      return mean + standardDeviation * value;
    }
    // Box-Muller, keeping the second sample for the next call.
    let u = 0;
    let v = 0;
    while (u === 0) {
      u = this.next();
    }
    v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    const z1 = mag * Math.sin(2 * Math.PI * v);
    this.spare = z1;
    return mean + standardDeviation * z0;
  }

  getState(): RandomState {
    return {
      algorithm: ALGORITHM,
      a: this.a >>> 0,
      b: this.b >>> 0,
      c: this.c >>> 0,
      d: this.d >>> 0,
      callCount: this.callCount,
    };
  }
}

/** Create a deterministic RandomSource from a string or numeric seed. */
export function createRandomSource(seed: string | number): RandomSource {
  const [a, b, c, d] = cyrb128(String(seed));
  return new SeededRandom({ a, b, c, d, callCount: 0 });
}

/** Restore a RandomSource from a previously serialized state. */
export function restoreRandomSource(state: RandomState): RandomSource {
  if (state.algorithm !== ALGORITHM) {
    throw new Error(
      `restoreRandomSource(): unknown algorithm "${state.algorithm}"`,
    );
  }
  return new SeededRandom(state);
}

export const RANDOM_ALGORITHM = ALGORITHM;

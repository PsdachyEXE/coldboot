/**
 * Seeded pseudo-random numbers. Every generator takes an Rng so a seed reproduces a round
 * exactly (tests rely on this, and the daily challenge must match across devices).
 */

export type Rng = () => number;

/** mulberry32: small, fast, good enough for question generation. Returns floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit FNV-1a hash of a string, for turning labels and dates into seeds. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * murmur3's 32-bit finaliser (fmix32). FNV-1a leaves strings that differ only in their last
 * character with nearly adjacent hashes; this avalanche step spreads them across the whole range,
 * so ranking sibling ids ("m-u3o1-kk04-001", "-002") by hash no longer keeps them together.
 */
export function mix32(h: number): number {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/** Integer in [min, max], inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (!items.length) throw new Error('pick from empty list');
  return items[Math.floor(rng() * items.length)];
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** n distinct items (or all of them when n exceeds the length). */
export function sample<T>(rng: Rng, items: readonly T[], n: number): T[] {
  return shuffle(rng, items).slice(0, Math.max(0, n));
}

/** Derives an independent child seed, e.g. per question index. */
export function childSeed(seed: number, label: string | number): number {
  return hashString(`${seed >>> 0}:${label}`);
}

/** Seed for the daily challenge on a Melbourne calendar date (YYYY-MM-DD). */
export function dailySeed(melbourneDay: string): number {
  return hashString(`coldboot:daily:${melbourneDay}`);
}

/** A fresh seed for casual play, taken from the clock. Not used where determinism matters. */
export function freshSeed(now: number): number {
  return hashString(`coldboot:play:${now}`);
}

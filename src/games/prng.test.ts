import { describe, expect, it } from 'vitest';
import { childSeed, dailySeed, hashString, mulberry32, pick, randInt, sample, shuffle } from './prng';

describe('prng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 100 }, a);
    const seqB = Array.from({ length: 100 }, b);
    expect(seqA).toEqual(seqB);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('matches the reference mulberry32 output', () => {
    // First output for seed 1 from the canonical implementation.
    expect(mulberry32(1)()).toBeCloseTo(0.6270739405881613, 12);
  });

  it('hashes strings stably (FNV-1a)', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('coldboot')).toBe(hashString('coldboot'));
  });

  it('gives the same daily seed for the same Melbourne date and different seeds for different dates', () => {
    expect(dailySeed('2026-10-02')).toBe(dailySeed('2026-10-02'));
    expect(dailySeed('2026-10-02')).not.toBe(dailySeed('2026-10-03'));
  });

  it('randInt stays in range and hits both ends', () => {
    const rng = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = randInt(rng, 3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('shuffle is a permutation and sample takes distinct items', () => {
    const rng = mulberry32(9);
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const s = shuffle(rng, items);
    expect([...s].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const picked = sample(rng, items, 3);
    expect(new Set(picked).size).toBe(3);
    expect(sample(rng, items, 20)).toHaveLength(8);
    expect(items).toContain(pick(rng, items));
    expect(() => pick(rng, [])).toThrow();
  });

  it('derives stable child seeds', () => {
    expect(childSeed(5, 'q1')).toBe(childSeed(5, 'q1'));
    expect(childSeed(5, 'q1')).not.toBe(childSeed(5, 'q2'));
  });
});

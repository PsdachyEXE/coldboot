/**
 * KK mastery (Section 6.13): the recency-weighted mean of attempt scores, weight 0.5 ^ (ageDays / 7),
 * shown from 0 to 100. A KK with no attempts is "unseen" (absent from the map), never zero.
 */
import type { KkId } from '../content/schema';
import { decay, type AttemptsData } from '../state/attempts';

export interface KkMastery {
  /** 0 to 100. */
  value: number;
  /** Attempts counted, including rolled-up ones. */
  n: number;
  /** Epoch ms of the most recent attempt (0 when only rolled-up attempts exist). */
  last: number;
}

export type MasteryMap = ReadonlyMap<KkId, KkMastery>;

/** One pass over the log. Pure; memoise on the attempts data and a coarse clock. */
export function computeMastery(data: AttemptsData, now: number): MasteryMap {
  const nowS = Math.floor(now / 1000);
  const acc = new Map<KkId, { w: number; s: number; n: number; last: number }>();
  for (const [kk, r] of Object.entries(data.rollup) as [KkId, { w: number; s: number; n: number; ref: number }][]) {
    const f = decay(Math.max(0, nowS - r.ref));
    acc.set(kk, { w: r.w * f, s: r.s * f, n: r.n, last: 0 });
  }
  for (const [, kks, score, ts] of data.log) {
    const w = decay(Math.max(0, nowS - ts));
    for (const kk of kks) {
      const a = acc.get(kk) ?? { w: 0, s: 0, n: 0, last: 0 };
      a.w += w;
      a.s += w * score;
      a.n += 1;
      a.last = Math.max(a.last, ts * 1000);
      acc.set(kk, a);
    }
  }
  const out = new Map<KkId, KkMastery>();
  for (const [kk, a] of acc) {
    if (a.n === 0) continue;
    const value = a.w > 0 ? (a.s / a.w) * 100 : 0;
    out.set(kk, { value: Math.round(value * 10) / 10, n: a.n, last: a.last });
  }
  return out;
}

/** Mastery 0 to 100, or null when unseen. */
export function masteryValue(map: MasteryMap, kk: KkId): number | null {
  return map.get(kk)?.value ?? null;
}

/** Mastery bands for shading the coverage grid. `unseen` must look different from `weak`. */
export type MasteryBand = 'unseen' | 'weak' | 'shaky' | 'solid' | 'strong';

export function masteryBand(value: number | null): MasteryBand {
  if (value === null) return 'unseen';
  if (value < 40) return 'weak';
  if (value < 65) return 'shaky';
  if (value < 85) return 'solid';
  return 'strong';
}

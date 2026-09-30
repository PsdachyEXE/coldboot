/**
 * Attempt log. Every answer anywhere in the app records `{ itemId, kk[], score, timestamp, ms }`.
 * The log is stored as compact tuples; beyond 20,000 attempts the oldest roll into per-KK
 * aggregates that decay exactly like individual attempts (see src/srs/mastery.ts).
 */
import { create } from 'zustand';
import { z } from 'zod';
import { isKkId, type KkId } from '../content/schema';
import { persistStore } from './persist';

/** Attempt item ids: content ids (`c-u3o1-kk04-003`) or generated ids (`gen-sort-selection`). */
export const ATTEMPT_ITEM_ID = /^[a-z0-9][a-z0-9._:-]{0,119}$/;

export interface Attempt {
  itemId: string;
  kk: KkId[];
  /** 0 to 1. */
  score: number;
  /** Epoch ms. */
  timestamp: number;
  /** Time taken to answer, ms. */
  ms: number;
}

/** [itemId, kk, score (2 dp), epoch seconds, ms] */
export type AttemptTuple = [string, KkId[], number, number, number];

/** Weight sum `w` and weighted score sum `s`, both as at `ref` (epoch seconds); `n` attempts rolled in. */
export interface KkRollup {
  w: number;
  s: number;
  n: number;
  ref: number;
}

export interface AttemptsData {
  log: AttemptTuple[];
  rollup: Partial<Record<KkId, KkRollup>>;
}

export interface AttemptsState extends AttemptsData {
  record(attempt: Attempt): void;
  replace(data: AttemptsData): void;
  reset(): void;
}

export const ROLLUP_THRESHOLD = 20_000;
export const ROLLUP_KEEP = 15_000;
export const HALF_LIFE_DAYS = 7;
const HALF_LIFE_S = HALF_LIFE_DAYS * 86_400;

export function toTuple(a: Attempt): AttemptTuple {
  const score = Math.round(Math.min(1, Math.max(0, a.score)) * 100) / 100;
  const ms = Math.round(Math.min(3_600_000, Math.max(0, a.ms)));
  return [a.itemId, a.kk, score, Math.floor(a.timestamp / 1000), ms];
}

export function fromTuple(t: AttemptTuple): Attempt {
  return { itemId: t[0], kk: t[1], score: t[2], timestamp: t[3] * 1000, ms: t[4] };
}

/** Decay factor for an age in seconds: 0.5 ^ (age / 7 days). */
export function decay(ageSeconds: number): number {
  return 0.5 ** (ageSeconds / HALF_LIFE_S);
}

/** Folds the oldest attempts into per-KK aggregates, keeping the newest ROLLUP_KEEP. Pure. */
export function rollUp(data: AttemptsData): AttemptsData {
  if (data.log.length <= ROLLUP_THRESHOLD) return data;
  const cut = data.log.length - ROLLUP_KEEP;
  const old = data.log.slice(0, cut);
  const ref = old[old.length - 1][3];
  const rollup: Partial<Record<KkId, KkRollup>> = {};
  for (const [kk, r] of Object.entries(data.rollup) as [KkId, KkRollup][]) {
    const f = decay(ref - r.ref);
    rollup[kk] = { w: r.w * f, s: r.s * f, n: r.n, ref };
  }
  for (const [, kks, score, ts] of old) {
    const w = decay(ref - ts);
    for (const kk of kks) {
      const r = rollup[kk] ?? { w: 0, s: 0, n: 0, ref };
      rollup[kk] = { w: r.w + w, s: r.s + w * score, n: r.n + 1, ref };
    }
  }
  return { log: data.log.slice(cut), rollup };
}

export const AttemptTupleSchema = z.tuple([
  z.string().regex(ATTEMPT_ITEM_ID),
  z.array(z.custom<KkId>(isKkId)).min(1).max(8),
  z.number().min(0).max(1),
  z.number().int().nonnegative(),
  z.number().int().min(0).max(3_600_000),
]);

export const AttemptsDataSchema = z
  .object({
    log: z.array(AttemptTupleSchema).max(100_000),
    rollup: z.record(
      z.custom<KkId>(isKkId),
      z.object({ w: z.number().nonnegative(), s: z.number().nonnegative(), n: z.number().int().nonnegative(), ref: z.number().int().nonnegative() }).strict(),
    ),
  })
  .strict();

export function defaultAttempts(): AttemptsData {
  return { log: [], rollup: {} };
}

export const useAttempts = create<AttemptsState>()((set) => ({
  ...defaultAttempts(),
  record: (attempt) =>
    set((s) => {
      if (!ATTEMPT_ITEM_ID.test(attempt.itemId) || !attempt.kk.length) return s;
      return rollUp({ log: [...s.log, toTuple(attempt)], rollup: s.rollup });
    }),
  replace: (data) => set({ log: data.log, rollup: data.rollup }),
  reset: () => set(defaultAttempts()),
}));

export function selectAttemptsData(s: AttemptsData): AttemptsData {
  return { log: s.log, rollup: s.rollup };
}

export const attemptsPersistence = persistStore(useAttempts, {
  name: 'attempts',
  version: 1,
  select: selectAttemptsData,
  hydrate: (data) => data,
  validate: (data): data is AttemptsData => AttemptsDataSchema.safeParse(data).success,
  debounceMs: 800,
});

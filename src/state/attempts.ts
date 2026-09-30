/**
 * Attempt log. Every answer anywhere in the app records `{ itemId, kk[], score, timestamp, ms }`.
 * The log is stored as compact tuples; beyond 20,000 attempts the oldest roll into per-KK
 * aggregates that decay exactly like individual attempts (see src/srs/mastery.ts).
 *
 * KK ids are stored as recorded. `kkMap` records the study-design map version they belong to;
 * when the map is renumbered, hydration rewrites old ids through `studyDesign.renames`.
 */
import { create } from 'zustand';
import { MAX_EPOCH_MS } from '../lib/time';
import { z } from '../lib/zodConfig';
import { isKkId, type KkId } from '../content/schema';
import { studyDesign } from '../content/studyDesign';
import { persistStore } from './persist';

/** Attempt item ids: content ids (`c-u3o1-kk04-003`) or generated ids (`gen-sort:1234`). */
export const ATTEMPT_ITEM_ID = /^[a-z0-9][a-z0-9._:-]{0,119}$/;
export const MAX_KKS_PER_ATTEMPT = 8;
export const MAX_ATTEMPT_MS = 3_600_000;

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
  /** Study-design KK map version the stored KK ids belong to. */
  kkMap: number;
}

export interface AttemptsState extends AttemptsData {
  /** Records a sanitised attempt. Returns false (and records nothing) when the attempt is invalid. */
  record(attempt: Attempt): boolean;
  replace(data: AttemptsData): void;
  reset(): void;
}

export const ROLLUP_THRESHOLD = 20_000;
export const ROLLUP_KEEP = 15_000;
export const HALF_LIFE_DAYS = 7;
const HALF_LIFE_S = HALF_LIFE_DAYS * 86_400;

/**
 * The write-boundary gate: returns a clean attempt, or null when it can't be recorded (bad id,
 * no valid KK, non-finite score, or a timestamp that isn't finite or is outside 1970 to
 * MAX_EPOCH_MS). Duplicate and unknown-format KKs are removed.
 */
export function sanitiseAttempt(a: Attempt): Attempt | null {
  if (typeof a.itemId !== 'string' || !ATTEMPT_ITEM_ID.test(a.itemId)) return null;
  const kk = [...new Set((a.kk ?? []).filter(isKkId))].slice(0, MAX_KKS_PER_ATTEMPT);
  if (!kk.length) return null;
  if (!Number.isFinite(a.score) || !Number.isFinite(a.timestamp) || a.timestamp <= 0 || a.timestamp > MAX_EPOCH_MS) return null;
  const ms = Number.isFinite(a.ms) ? Math.min(MAX_ATTEMPT_MS, Math.max(0, a.ms)) : 0;
  return { itemId: a.itemId, kk, score: Math.min(1, Math.max(0, a.score)), timestamp: a.timestamp, ms };
}

export function toTuple(a: Attempt): AttemptTuple {
  const score = Math.round(Math.min(1, Math.max(0, a.score)) * 100) / 100;
  const ms = Math.round(Math.min(MAX_ATTEMPT_MS, Math.max(0, a.ms)));
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
  return { log: data.log.slice(cut), rollup, kkMap: data.kkMap };
}

/** Rewrites KK ids recorded under an older map version. Pure. */
export function applyKkRenames(data: AttemptsData, renames = studyDesign.renames, current = studyDesign.kkMapVersion): AttemptsData {
  if (data.kkMap >= current) return data;
  const steps = renames.filter((r) => r.since > data.kkMap && r.since <= current);
  if (!steps.length) return { ...data, kkMap: current };
  const map = (kk: KkId): KkId => steps.reduce<KkId>((id, r) => (id === r.from ? (r.to as KkId) : id), kk);
  const log = data.log.map(([id, kks, s, ts, ms]): AttemptTuple => [id, [...new Set(kks.map(map))], s, ts, ms]);
  const rollup: Partial<Record<KkId, KkRollup>> = {};
  for (const [kk, r] of Object.entries(data.rollup) as [KkId, KkRollup][]) {
    const to = map(kk);
    const prev = rollup[to];
    rollup[to] = prev ? { w: prev.w + r.w * decay(prev.ref - r.ref), s: prev.s + r.s * decay(prev.ref - r.ref), n: prev.n + r.n, ref: prev.ref } : r;
  }
  return { log, rollup, kkMap: current };
}

export const AttemptTupleSchema = z.tuple([
  z.string().regex(ATTEMPT_ITEM_ID),
  z
    .array(z.custom<KkId>(isKkId))
    .min(1)
    .max(MAX_KKS_PER_ATTEMPT)
    .refine((kks) => new Set(kks).size === kks.length, 'Duplicate KK'),
  z.number().min(0).max(1),
  z.number().int().nonnegative().max(Math.floor(MAX_EPOCH_MS / 1000)),
  z.number().int().min(0).max(MAX_ATTEMPT_MS),
]);

const RollupSchema = z
  .object({ w: z.number().nonnegative().finite(), s: z.number().nonnegative().finite(), n: z.number().int().nonnegative(), ref: z.number().int().nonnegative() })
  .strict();

export const AttemptsDataSchema = z
  .object({
    log: z.array(AttemptTupleSchema).max(100_000),
    rollup: z.record(z.custom<KkId>(isKkId), RollupSchema),
    kkMap: z.number().int().min(1),
  })
  .strict();

export function defaultAttempts(): AttemptsData {
  return { log: [], rollup: {}, kkMap: studyDesign.kkMapVersion };
}

export const useAttempts = create<AttemptsState>()((set) => ({
  ...defaultAttempts(),
  record: (attempt) => {
    const clean = sanitiseAttempt(attempt);
    if (!clean) {
      if (import.meta.env.DEV) console.error('attempts.record rejected', attempt);
      return false;
    }
    set((s) => rollUp({ log: [...s.log, toTuple(clean)], rollup: s.rollup, kkMap: s.kkMap }));
    return true;
  },
  replace: (data) => set({ log: data.log, rollup: data.rollup, kkMap: data.kkMap }),
  reset: () => set(defaultAttempts()),
}));

export function selectAttemptsData(s: AttemptsData): AttemptsData {
  return { log: s.log, rollup: s.rollup, kkMap: s.kkMap };
}

/** Keeps every valid tuple and rollup entry. */
export function salvageAttempts(raw: unknown): { data: AttemptsData; dropped: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as { log?: unknown; rollup?: unknown; kkMap?: unknown };
  let dropped = 0;
  const log: AttemptTuple[] = [];
  if (Array.isArray(r.log)) {
    for (const t of r.log.slice(-100_000)) {
      const parsed = AttemptTupleSchema.safeParse(t);
      if (parsed.success) log.push(parsed.data as AttemptTuple);
      else dropped++;
    }
  } else dropped++;
  const rollup: Partial<Record<KkId, KkRollup>> = {};
  if (typeof r.rollup === 'object' && r.rollup !== null) {
    for (const [kk, v] of Object.entries(r.rollup)) {
      const parsed = RollupSchema.safeParse(v);
      if (isKkId(kk) && parsed.success) rollup[kk] = parsed.data;
      else dropped++;
    }
  }
  const kkMap = typeof r.kkMap === 'number' && Number.isInteger(r.kkMap) && r.kkMap >= 1 ? r.kkMap : 1;
  return { data: { log, rollup, kkMap }, dropped };
}

/** Cross-window merge: the union of both logs (deduplicated, time-ordered). */
export function mergeAttempts(local: AttemptsData, incoming: AttemptsData): AttemptsData {
  const key = (t: AttemptTuple) => `${t[0]}|${t[3]}|${t[2]}|${t[4]}`;
  const seen = new Set(incoming.log.map(key));
  const extra = local.log.filter((t) => !seen.has(key(t)));
  if (!extra.length) return incoming;
  const log = [...incoming.log, ...extra].sort((a, b) => a[3] - b[3]);
  const rolled = Object.keys(incoming.rollup).length >= Object.keys(local.rollup).length ? incoming.rollup : local.rollup;
  return rollUp({ log, rollup: rolled, kkMap: Math.max(local.kkMap, incoming.kkMap) });
}

export const attemptsPersistence = persistStore(useAttempts, {
  name: 'attempts',
  version: 1,
  schema: AttemptsDataSchema,
  select: selectAttemptsData,
  hydrate: (data) => applyKkRenames(data),
  defaults: defaultAttempts,
  salvage: salvageAttempts,
  merge: mergeAttempts,
  debounceMs: 800,
});

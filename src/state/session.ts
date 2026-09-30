/**
 * Session store: terminal command history, daily challenge records, per-study-day activity
 * (for the streak, stats and time studied) and the last day the full boot sequence played.
 */
import { create } from 'zustand';
import { z } from '../lib/zodConfig';
import { areaOf, type AreaId, type GroupId, type KkId } from '../content/schema';
import { addDays } from '../lib/time';
import { cleanPlainText, isCleanPlainText } from '../lib/text';
import { persistStore } from './persist';

export const HISTORY_MAX = 100;
export const HISTORY_ENTRY_MAX = 500;

export interface DailyRecord {
  /** Item ids in the order they were presented. */
  itemIds: string[];
  /** First-attempt results in order: 1 correct, 0 wrong. Only the first attempt counts. */
  results: (0 | 1)[];
  /** Epoch ms when the tenth item was answered, or null while in progress. */
  completedAt: number | null;
}

/** Per study day: attempts `n`, summed score `s`, card reviews, ms spent, and [n, s] per area. */
export interface DayActivity {
  n: number;
  s: number;
  reviews: number;
  ms: number;
  areas: Partial<Record<AreaId | GroupId, [number, number]>>;
}

export interface SessionData {
  terminalHistory: string[];
  /** Keyed by Melbourne date. */
  daily: Record<string, DailyRecord>;
  /** Keyed by study day. */
  activity: Record<string, DayActivity>;
  /** Study day the full boot sequence last played. */
  lastBootDay: string | null;
}

export interface SessionState extends SessionData {
  pushHistory(command: string): void;
  /**
   * Starts the day's daily record, or keeps the existing one (records are never overwritten, so
   * only the first attempt counts). Returns the record in force. Invalid input is ignored.
   */
  beginDaily(date: string, itemIds: string[]): DailyRecord | null;
  /** Records a first attempt at position `index`; later attempts at the same index are ignored. */
  recordDaily(date: string, index: number, correct: boolean, now: number): void;
  noteActivity(day: string, attempt: { kk: KkId[]; score: number; ms: number }, review: boolean): void;
  setLastBootDay(day: string): void;
  replace(data: SessionData): void;
  reset(): void;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DayString = z.string().regex(DAY);
const AreaKey = z.enum(['U3O1', 'U3O2', 'U4O1', 'U4O2', 'TERMS', 'PSM']);
const DAILY_ITEM_ID = /^[a-z0-9][a-z0-9._:-]{0,119}$/;
export const DAILY_MAX_ITEMS = 20;

const DailyRecordSchema = z
  .object({
    itemIds: z.array(z.string().regex(DAILY_ITEM_ID)).min(1).max(DAILY_MAX_ITEMS),
    results: z.array(z.union([z.literal(0), z.literal(1)])).max(DAILY_MAX_ITEMS),
    completedAt: z.number().int().nonnegative().nullable(),
  })
  .strict()
  .refine((r) => r.results.length <= r.itemIds.length, 'More results than items');

const DayActivitySchema = z
  .object({
    n: z.number().int().nonnegative(),
    s: z.number().nonnegative().finite(),
    reviews: z.number().int().nonnegative(),
    ms: z.number().nonnegative().finite(),
    areas: z.partialRecord(AreaKey, z.tuple([z.number().int().nonnegative(), z.number().nonnegative().finite()])),
  })
  .strict();

const HistoryEntrySchema = z.string().refine((h) => h.length > 0 && isCleanPlainText(h, HISTORY_ENTRY_MAX), 'History entries are plain text');

export const SessionDataSchema = z
  .object({
    terminalHistory: z.array(HistoryEntrySchema).max(HISTORY_MAX),
    daily: z.record(DayString, DailyRecordSchema),
    activity: z.record(DayString, DayActivitySchema),
    lastBootDay: DayString.nullable(),
  })
  .strict();

export function defaultSession(): SessionData {
  return { terminalHistory: [], daily: {}, activity: {}, lastBootDay: null };
}

export const useSession = create<SessionState>()((set, get) => ({
  ...defaultSession(),
  pushHistory: (command) =>
    set((s) => {
      const clean = cleanPlainText(command, HISTORY_ENTRY_MAX);
      if (!clean || s.terminalHistory[s.terminalHistory.length - 1] === clean) return s;
      return { terminalHistory: [...s.terminalHistory, clean].slice(-HISTORY_MAX) };
    }),
  beginDaily: (date, itemIds) => {
    const existing = get().daily[date];
    if (existing) return existing;
    const record: DailyRecord = { itemIds: [...itemIds], results: [], completedAt: null };
    if (!DAY.test(date) || !DailyRecordSchema.safeParse(record).success) return null;
    set((s) => ({ daily: { ...s.daily, [date]: record } }));
    return record;
  },
  recordDaily: (date, index, correct, now) =>
    set((s) => {
      const rec = s.daily[date];
      if (!rec || index !== rec.results.length || index >= rec.itemIds.length) return s;
      const results = [...rec.results, correct ? 1 : 0] as (0 | 1)[];
      const completedAt = results.length === rec.itemIds.length ? now : null;
      return { daily: { ...s.daily, [date]: { ...rec, results, completedAt } } };
    }),
  noteActivity: (day, attempt, review) =>
    set((s) => {
      if (!DAY.test(day) || !Number.isFinite(attempt.score) || !Number.isFinite(attempt.ms)) return s;
      const prev = s.activity[day] ?? { n: 0, s: 0, reviews: 0, ms: 0, areas: {} };
      const areas = { ...prev.areas };
      for (const key of new Set(attempt.kk.map(areaOf))) {
        const [n, sum] = areas[key] ?? [0, 0];
        areas[key] = [n + 1, sum + attempt.score];
      }
      const next: DayActivity = {
        n: prev.n + 1,
        s: prev.s + attempt.score,
        reviews: prev.reviews + (review ? 1 : 0),
        ms: prev.ms + Math.max(0, Math.min(attempt.ms, 600_000)),
        areas,
      };
      return { activity: { ...s.activity, [day]: next } };
    }),
  setLastBootDay: (day) => {
    if (DAY.test(day)) set({ lastBootDay: day });
  },
  replace: (data) => set({ ...data }),
  reset: () => set(defaultSession()),
}));

export function selectSessionData(s: SessionData): SessionData {
  return { terminalHistory: s.terminalHistory, daily: s.daily, activity: s.activity, lastBootDay: s.lastBootDay };
}

/** Consecutive study days with at least one attempt, ending today (or yesterday if today is empty so far). */
export function streak(activity: Record<string, DayActivity>, today: string): number {
  let day = activity[today]?.n ? today : addDays(today, -1);
  let count = 0;
  while (activity[day]?.n) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

/** Keeps every valid history entry, daily record and activity day. */
export function salvageSession(raw: unknown): { data: SessionData; dropped: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Partial<Record<keyof SessionData, unknown>>;
  let dropped = 0;
  const terminalHistory = Array.isArray(r.terminalHistory)
    ? r.terminalHistory.filter((h): h is string => HistoryEntrySchema.safeParse(h).success).slice(-HISTORY_MAX)
    : [];
  if (Array.isArray(r.terminalHistory)) dropped += r.terminalHistory.length - terminalHistory.length;
  const pick = <T>(obj: unknown, schema: z.ZodType<T>): Record<string, T> => {
    const out: Record<string, T> = {};
    if (typeof obj !== 'object' || obj === null) return out;
    for (const [k, v] of Object.entries(obj)) {
      const parsed = schema.safeParse(v);
      if (DAY.test(k) && parsed.success) out[k] = parsed.data;
      else dropped++;
    }
    return out;
  };
  const daily = pick(r.daily, DailyRecordSchema);
  const activity = pick(r.activity, DayActivitySchema);
  const lastBootDay = typeof r.lastBootDay === 'string' && DAY.test(r.lastBootDay) ? r.lastBootDay : null;
  return { data: { terminalHistory, daily, activity, lastBootDay }, dropped };
}

/** Cross-window merge: per day, keep whichever record has more progress. */
export function mergeSession(local: SessionData, incoming: SessionData): SessionData {
  const daily = { ...incoming.daily };
  for (const [day, rec] of Object.entries(local.daily)) {
    if (!daily[day] || rec.results.length > daily[day].results.length) daily[day] = rec;
  }
  const activity = { ...incoming.activity };
  for (const [day, act] of Object.entries(local.activity)) {
    if (!activity[day] || act.n > activity[day].n) activity[day] = act;
  }
  const lastBootDay = [local.lastBootDay, incoming.lastBootDay].filter((d): d is string => d !== null).sort().pop() ?? null;
  return { terminalHistory: local.terminalHistory, daily, activity, lastBootDay };
}

export const sessionPersistence = persistStore(useSession, {
  name: 'session',
  version: 1,
  schema: SessionDataSchema,
  select: selectSessionData,
  hydrate: (data) => data,
  defaults: defaultSession,
  salvage: salvageSession,
  merge: mergeSession,
});

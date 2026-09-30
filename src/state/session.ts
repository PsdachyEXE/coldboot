/**
 * Session store: terminal command history, daily challenge records, per-study-day activity
 * (for the streak, stats and time studied) and the last day the full boot sequence played.
 */
import { create } from 'zustand';
import { z } from 'zod';
import { areaOf, type AreaId, type GroupId, type KkId } from '../content/schema';
import { addDays } from '../lib/time';
import { cleanPlainText } from '../lib/text';
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
  /** Starts (or keeps) the day's daily record. Existing records are never overwritten. */
  beginDaily(date: string, itemIds: string[]): void;
  /** Records a first attempt at position `index`; later attempts at the same index are ignored. */
  recordDaily(date: string, index: number, correct: boolean, now: number): void;
  noteActivity(day: string, attempt: { kk: KkId[]; score: number; ms: number }, review: boolean): void;
  setLastBootDay(day: string): void;
  replace(data: SessionData): void;
  reset(): void;
}

const DayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const AreaKey = z.enum(['U3O1', 'U3O2', 'U4O1', 'U4O2', 'TERMS', 'PSM']);

export const SessionDataSchema = z
  .object({
    terminalHistory: z.array(z.string().max(HISTORY_ENTRY_MAX)).max(HISTORY_MAX),
    daily: z.record(
      DayString,
      z
        .object({
          itemIds: z.array(z.string().regex(/^[a-z0-9][a-z0-9._:-]{0,119}$/)).max(20),
          results: z.array(z.union([z.literal(0), z.literal(1)])).max(20),
          completedAt: z.number().int().nonnegative().nullable(),
        })
        .strict(),
    ),
    activity: z.record(
      DayString,
      z
        .object({
          n: z.number().int().nonnegative(),
          s: z.number().nonnegative(),
          reviews: z.number().int().nonnegative(),
          ms: z.number().nonnegative(),
          areas: z.partialRecord(AreaKey, z.tuple([z.number().int().nonnegative(), z.number().nonnegative()])),
        })
        .strict(),
    ),
    lastBootDay: DayString.nullable(),
  })
  .strict();

export function defaultSession(): SessionData {
  return { terminalHistory: [], daily: {}, activity: {}, lastBootDay: null };
}

export const useSession = create<SessionState>()((set) => ({
  ...defaultSession(),
  pushHistory: (command) =>
    set((s) => {
      const clean = cleanPlainText(command, HISTORY_ENTRY_MAX);
      if (!clean || s.terminalHistory[s.terminalHistory.length - 1] === clean) return s;
      return { terminalHistory: [...s.terminalHistory, clean].slice(-HISTORY_MAX) };
    }),
  beginDaily: (date, itemIds) =>
    set((s) => (s.daily[date] ? s : { daily: { ...s.daily, [date]: { itemIds, results: [], completedAt: null } } })),
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
  setLastBootDay: (day) => set({ lastBootDay: day }),
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

export const sessionPersistence = persistStore(useSession, {
  name: 'session',
  version: 1,
  select: selectSessionData,
  hydrate: (data) => data,
  validate: (data): data is SessionData => SessionDataSchema.safeParse(data).success,
});

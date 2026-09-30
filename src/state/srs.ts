/**
 * SRS store: one scheduling record per reviewed card, plus the count of new cards introduced
 * on the current study day. Scheduling logic lives in src/srs/sm2.ts (pure); this store only holds state.
 */
import { create } from 'zustand';
import { z } from 'zod';
import { persistStore } from './persist';

export interface SrsCardState {
  /** Consecutive successful reviews (SM-2 n). */
  reps: number;
  /** Current interval in days. */
  interval: number;
  /** Ease factor (SM-2 EF), never below 1.3. */
  ease: number;
  /** Epoch ms when the card is next due. */
  due: number;
  /** Times the card has been rated Again. */
  lapses: number;
  /** Epoch ms of the last review. */
  last: number;
}

export interface SrsData {
  cards: Record<string, SrsCardState>;
  /** New cards introduced on `day` (study day, YYYY-MM-DD). */
  introduced: { day: string; count: number };
}

export interface SrsState extends SrsData {
  setCard(id: string, state: SrsCardState): void;
  /** Counts one new card toward the daily limit for `day`, resetting the count on a new day. */
  noteIntroduced(day: string): void;
  replace(data: SrsData): void;
  reset(): void;
}

export const SrsCardStateSchema = z
  .object({
    reps: z.number().int().min(0).max(10_000),
    interval: z.number().min(0).max(36_500),
    ease: z.number().min(1.3).max(10),
    due: z.number().int().nonnegative(),
    lapses: z.number().int().min(0).max(10_000),
    last: z.number().int().nonnegative(),
  })
  .strict();

export const SrsDataSchema = z
  .object({
    cards: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/), SrsCardStateSchema),
    introduced: z.object({ day: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/), count: z.number().int().min(0).max(10_000) }).strict(),
  })
  .strict();

export function defaultSrs(): SrsData {
  return { cards: {}, introduced: { day: '', count: 0 } };
}

export const useSrs = create<SrsState>()((set) => ({
  ...defaultSrs(),
  setCard: (id, state) => set((s) => ({ cards: { ...s.cards, [id]: state } })),
  noteIntroduced: (day) =>
    set((s) => ({ introduced: s.introduced.day === day ? { day, count: s.introduced.count + 1 } : { day, count: 1 } })),
  replace: (data) => set({ cards: data.cards, introduced: data.introduced }),
  reset: () => set(defaultSrs()),
}));

export function selectSrsData(s: SrsData): SrsData {
  return { cards: s.cards, introduced: s.introduced };
}

/** Cards whose due time has passed. */
export function countDue(cards: Record<string, SrsCardState>, now: number): number {
  let n = 0;
  for (const id in cards) if (cards[id].due <= now) n++;
  return n;
}

/** New cards still available today under the limit. */
export function newCardsRemaining(data: SrsData, today: string, limit: number): number {
  const used = data.introduced.day === today ? data.introduced.count : 0;
  return Math.max(0, limit - used);
}

export const srsPersistence = persistStore(useSrs, {
  name: 'srs',
  version: 1,
  select: selectSrsData,
  hydrate: (data) => data,
  validate: (data): data is SrsData => SrsDataSchema.safeParse(data).success,
});

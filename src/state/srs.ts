/**
 * SRS store: one scheduling record per reviewed card, plus the count of new cards introduced
 * on the current study day. Scheduling logic lives in src/srs/sm2.ts (pure); this store only holds state.
 *
 * Reverse cards keep ONE record: the review direction alternates with `reps` (see src/srs/queue.ts).
 */
import { create } from 'zustand';
import { z } from '../lib/zodConfig';
import { persistStore } from './persist';

export interface SrsCardState {
  /** Consecutive successful reviews (SM-2 n). */
  reps: number;
  /** Current interval in days. */
  interval: number;
  /** Ease factor (SM-2 EF), never below 1.3. */
  ease: number;
  /** Epoch ms when the card is next due (the start of a study day, or a same-session requeue). */
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
  /** Stores a card's schedule. Returns false (and stores nothing) for an invalid id or state. */
  setCard(id: string, state: SrsCardState): boolean;
  /** Counts one new card toward the daily limit for `day`, resetting the count on a new day. */
  noteIntroduced(day: string): void;
  /** Drops records for cards no longer in the content (after a successful full content load). */
  prune(knownCardIds: ReadonlySet<string>): number;
  replace(data: SrsData): void;
  reset(): void;
}

export const CARD_ID = /^[a-z0-9][a-z0-9-]{1,79}$/;

export const SrsCardStateSchema = z
  .object({
    reps: z.number().int().min(0).max(10_000),
    interval: z.number().min(0).max(36_500),
    ease: z.number().min(1.3).max(10),
    due: z.number().nonnegative(),
    lapses: z.number().int().min(0).max(10_000),
    last: z.number().nonnegative(),
  })
  .strict();

const IntroducedSchema = z.object({ day: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/), count: z.number().int().min(0).max(10_000) }).strict();

export const SrsDataSchema = z
  .object({
    cards: z.record(z.string().regex(CARD_ID), SrsCardStateSchema),
    introduced: IntroducedSchema,
  })
  .strict();

export function defaultSrs(): SrsData {
  return { cards: {}, introduced: { day: '', count: 0 } };
}

export const useSrs = create<SrsState>()((set, get) => ({
  ...defaultSrs(),
  setCard: (id, state) => {
    if (!CARD_ID.test(id) || !SrsCardStateSchema.safeParse(state).success) {
      if (import.meta.env.DEV) console.error('srs.setCard rejected', id, state);
      return false;
    }
    set((s) => ({ cards: { ...s.cards, [id]: state } }));
    return true;
  },
  noteIntroduced: (day) =>
    set((s) => ({ introduced: s.introduced.day === day ? { day, count: s.introduced.count + 1 } : { day, count: 1 } })),
  prune: (known) => {
    const cards = get().cards;
    const kept: Record<string, SrsCardState> = {};
    let removed = 0;
    for (const id in cards) {
      if (known.has(id)) kept[id] = cards[id];
      else removed++;
    }
    if (removed) set({ cards: kept });
    return removed;
  },
  replace: (data) => set({ cards: data.cards, introduced: data.introduced }),
  reset: () => set(defaultSrs()),
}));

export function selectSrsData(s: SrsData): SrsData {
  return { cards: s.cards, introduced: s.introduced };
}

/** Cards whose due time has passed. Pass `known` to ignore records for cards not in the content. */
export function countDue(cards: Record<string, SrsCardState>, now: number, known?: ReadonlySet<string>): number {
  let n = 0;
  for (const id in cards) if (cards[id].due <= now && (!known || known.has(id))) n++;
  return n;
}

/** New cards still available today under the limit. */
export function newCardsRemaining(data: SrsData, today: string, limit: number): number {
  const used = data.introduced.day === today ? data.introduced.count : 0;
  return Math.max(0, limit - used);
}

/** Keeps every valid card record. */
export function salvageSrs(raw: unknown): { data: SrsData; dropped: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as { cards?: unknown; introduced?: unknown };
  const cards: Record<string, SrsCardState> = {};
  let dropped = 0;
  if (typeof r.cards === 'object' && r.cards !== null) {
    for (const [id, state] of Object.entries(r.cards)) {
      const parsed = SrsCardStateSchema.safeParse(state);
      if (CARD_ID.test(id) && parsed.success) cards[id] = parsed.data;
      else dropped++;
    }
  } else dropped++;
  const intro = IntroducedSchema.safeParse(r.introduced);
  if (!intro.success) dropped++;
  return { data: { cards, introduced: intro.success ? intro.data : defaultSrs().introduced }, dropped };
}

/** Cross-window merge: per card, the most recently reviewed record wins. */
export function mergeSrs(local: SrsData, incoming: SrsData): SrsData {
  const cards = { ...incoming.cards };
  for (const [id, state] of Object.entries(local.cards)) {
    const other = cards[id];
    if (!other || state.last > other.last) cards[id] = state;
  }
  const introduced =
    local.introduced.day === incoming.introduced.day
      ? { day: local.introduced.day, count: Math.max(local.introduced.count, incoming.introduced.count) }
      : local.introduced.day > incoming.introduced.day
        ? local.introduced
        : incoming.introduced;
  return { cards, introduced };
}

export const srsPersistence = persistStore(useSrs, {
  name: 'srs',
  version: 1,
  schema: SrsDataSchema,
  select: selectSrsData,
  hydrate: (data) => data,
  defaults: defaultSrs,
  salvage: salvageSrs,
  merge: mergeSrs,
});

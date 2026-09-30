/**
 * Review queue contract (Section 6.3). Implemented and unit-tested by track E.
 *
 * buildQueue returns due cards (most overdue first) followed by new cards up to the day's remaining
 * limit, ordered coverage-first: round-robin across KKs, lowest mastery first (unseen KKs first),
 * so every KK gets exposure in the first days of use.
 */
import type { Card, KkId } from '../content/schema';
import type { SrsCardState } from '../state/srs';
import type { MasteryMap } from './mastery';

export interface QueueInput {
  cards: readonly Card[];
  srs: Readonly<Record<string, SrsCardState>>;
  mastery: MasteryMap;
  now: number;
  newRemaining: number;
  /** Optional restriction to some KKs (focused review). */
  kk?: readonly KkId[];
  /** KK display order (study design order) for tie-breaks. */
  kkOrder: readonly KkId[];
}

/**
 * Reverse cards keep one SRS record and alternate direction: `forward` (term to definition) when
 * reps is even, `reverse` (definition to term) when odd. Every other card type is always `forward`.
 */
export type ReviewDirection = 'forward' | 'reverse';

export interface QueueEntry {
  cardId: string;
  isNew: boolean;
  direction: ReviewDirection;
}

export function buildQueue(_input: QueueInput): QueueEntry[] {
  throw new Error('buildQueue: implemented in Phase 1 track E');
}

/** Coverage-first ordering of unseen cards. Exposed for tests. */
export function orderNewCards(_cards: readonly Card[], _mastery: MasteryMap, _kkOrder: readonly KkId[]): Card[] {
  throw new Error('orderNewCards: implemented in Phase 1 track E');
}

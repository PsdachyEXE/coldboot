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

/** The direction a card is shown in, given its current repetition count. */
export function directionFor(card: Pick<Card, 'type'>, reps: number): ReviewDirection {
  return card.type === 'reverse' && reps % 2 === 1 ? 'reverse' : 'forward';
}

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The queue for a review session: every due card (due <= now) first, most overdue first, then new
 * cards (no SRS record) in coverage-first order, up to `newRemaining`. `kk` restricts both to cards
 * tagged with any of those KKs.
 */
export function buildQueue(input: QueueInput): QueueEntry[] {
  const only = input.kk?.length ? new Set<KkId>(input.kk) : null;
  const inScope = (c: Card) => !only || c.kk.some((k) => only.has(k));
  const due: Card[] = [];
  const fresh: Card[] = [];
  const seen = new Set<string>();
  for (const c of input.cards) {
    if (seen.has(c.id) || !inScope(c)) continue;
    seen.add(c.id);
    const state = input.srs[c.id];
    if (!state) fresh.push(c);
    else if (state.due <= input.now) due.push(c);
  }
  due.sort((a, b) => input.srs[a.id].due - input.srs[b.id].due || byId(a, b));
  const limit = Math.max(0, Math.floor(input.newRemaining));
  const newCards = limit > 0 ? orderNewCards(fresh, input.mastery, input.kkOrder).slice(0, limit) : [];
  return [
    ...due.map((c): QueueEntry => ({ cardId: c.id, isNew: false, direction: directionFor(c, input.srs[c.id].reps) })),
    ...newCards.map((c): QueueEntry => ({ cardId: c.id, isNew: true, direction: 'forward' })),
  ];
}

/**
 * Coverage-first ordering of unseen cards. Exposed for tests.
 *
 * Cards are grouped by their primary KK (`kk[0]`). Groups are ordered unseen KKs first, then by
 * mastery ascending, with study-design order breaking ties (KKs missing from `kkOrder` go last, by
 * id). Within a group, cards run by difficulty, then id. The result takes one card from each group
 * in turn (round-robin), so the first cards of a day cover as many KKs as possible.
 */
export function orderNewCards(cards: readonly Card[], mastery: MasteryMap, kkOrder: readonly KkId[]): Card[] {
  const groups = new Map<KkId, Card[]>();
  for (const c of cards) {
    const kk = c.kk[0];
    const list = groups.get(kk);
    if (list) list.push(c);
    else groups.set(kk, [c]);
  }
  const position = new Map(kkOrder.map((kk, i) => [kk, i]));
  const orderOf = (kk: KkId) => position.get(kk) ?? Number.MAX_SAFE_INTEGER;
  const kks = [...groups.keys()].sort((a, b) => {
    const ma = mastery.get(a)?.value;
    const mb = mastery.get(b)?.value;
    if (ma === undefined && mb !== undefined) return -1;
    if (mb === undefined && ma !== undefined) return 1;
    if (ma !== undefined && mb !== undefined && ma !== mb) return ma - mb;
    return orderOf(a) - orderOf(b) || (a < b ? -1 : a > b ? 1 : 0);
  });
  const lanes = kks.map((kk) => groups.get(kk)!.slice().sort((a, b) => a.difficulty - b.difficulty || byId(a, b)));
  const out: Card[] = [];
  for (let round = 0; out.length < cards.length; round++) {
    let took = false;
    for (const lane of lanes) {
      if (round < lane.length) {
        out.push(lane[round]);
        took = true;
      }
    }
    if (!took) break;
  }
  return out;
}

/**
 * The earliest due time after `now` among cards still in the content, or null when nothing is
 * scheduled. Used for "Next review due" lines.
 */
export function nextDueAfter(srs: Readonly<Record<string, SrsCardState>>, now: number, known?: ReadonlySet<string>): number | null {
  let next: number | null = null;
  for (const id in srs) {
    if (known && !known.has(id)) continue;
    const due = srs[id].due;
    if (due > now && (next === null || due < next)) next = due;
  }
  return next;
}

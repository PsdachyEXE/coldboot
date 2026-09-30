import { describe, expect, it } from 'vitest';
import type { Card, KkId } from '../content/schema';
import { ALL_KK_IDS } from '../content/studyDesign';
import type { SrsCardState } from '../state/srs';
import type { KkMastery, MasteryMap } from './mastery';
import { buildQueue, directionFor, nextDueAfter, orderNewCards } from './queue';

const NOW = new Date(2026, 9, 1, 10).getTime();
const DAY = 86_400_000;

function card(id: string, kk: KkId[], opts: Partial<Card> = {}): Card {
  return { id, kk, type: 'basic', front: `Front ${id}`, back: `Back ${id}`, difficulty: 1, source: 'textbook', ...opts };
}

function state(due: number, reps = 1): SrsCardState {
  return { reps, interval: 1, ease: 2.5, due, lapses: 0, last: due - DAY };
}

function mastery(entries: Record<string, number>): MasteryMap {
  return new Map(Object.entries(entries).map(([kk, value]): [KkId, KkMastery] => [kk as KkId, { value, n: 3, last: NOW }]));
}

const NONE: MasteryMap = new Map();

describe('orderNewCards', () => {
  it('round-robins across KKs so the first cards cover every KK', () => {
    const cards = [
      card('c-u3o1-kk04-001', ['U3O1-KK04']),
      card('c-u3o1-kk04-002', ['U3O1-KK04']),
      card('c-u3o1-kk04-003', ['U3O1-KK04']),
      card('c-u3o1-kk02-001', ['U3O1-KK02']),
      card('c-u3o1-kk02-002', ['U3O1-KK02']),
      card('c-u4o2-kk01-001', ['U4O2-KK01']),
    ];
    const ids = orderNewCards(cards, NONE, ALL_KK_IDS).map((c) => c.id);
    expect(ids).toEqual([
      'c-u3o1-kk02-001',
      'c-u3o1-kk04-001',
      'c-u4o2-kk01-001',
      'c-u3o1-kk02-002',
      'c-u3o1-kk04-002',
      'c-u3o1-kk04-003',
    ]);
  });

  it('puts unseen KKs first, then the lowest mastery, with study-design order breaking ties', () => {
    const cards = [
      card('c-u3o1-kk01-001', ['U3O1-KK01']), // strong
      card('c-u3o1-kk02-001', ['U3O1-KK02']), // weak
      card('c-u3o1-kk03-001', ['U3O1-KK03']), // unseen
      card('c-u3o2-kk01-001', ['U3O2-KK01']), // weak, tie with KK02
      card('c-terms-001', ['TERMS']), // unseen, later in study-design order
      card('c-u3o1-kk05-001', ['U3O1-KK05']), // shaky
    ];
    const m = mastery({ 'U3O1-KK01': 92, 'U3O1-KK02': 20, 'U3O2-KK01': 20, 'U3O1-KK05': 55 });
    const ids = orderNewCards(cards, m, ALL_KK_IDS).map((c) => c.kk[0]);
    expect(ids).toEqual(['U3O1-KK03', 'TERMS', 'U3O1-KK02', 'U3O2-KK01', 'U3O1-KK05', 'U3O1-KK01']);
  });

  it('treats a KK at 0 mastery as seen, after unseen KKs', () => {
    const cards = [card('c-u3o1-kk02-001', ['U3O1-KK02']), card('c-u3o1-kk09-001', ['U3O1-KK09'])];
    const ids = orderNewCards(cards, mastery({ 'U3O1-KK02': 0 }), ALL_KK_IDS).map((c) => c.id);
    expect(ids).toEqual(['c-u3o1-kk09-001', 'c-u3o1-kk02-001']);
  });

  it('orders cards within a KK by difficulty, then id', () => {
    const cards = [
      card('c-u3o1-kk04-003', ['U3O1-KK04'], { difficulty: 1 }),
      card('c-u3o1-kk04-001', ['U3O1-KK04'], { difficulty: 3 }),
      card('c-u3o1-kk04-002', ['U3O1-KK04'], { difficulty: 1 }),
      card('c-u3o1-kk04-004', ['U3O1-KK04'], { difficulty: 2 }),
    ];
    expect(orderNewCards(cards, NONE, ALL_KK_IDS).map((c) => c.id)).toEqual([
      'c-u3o1-kk04-002',
      'c-u3o1-kk04-003',
      'c-u3o1-kk04-004',
      'c-u3o1-kk04-001',
    ]);
  });

  it('groups by the primary KK only', () => {
    const cards = [card('c-u3o1-kk04-001', ['U3O1-KK04', 'U3O1-KK01']), card('c-u3o1-kk01-001', ['U3O1-KK01'])];
    expect(orderNewCards(cards, NONE, ALL_KK_IDS).map((c) => c.id)).toEqual(['c-u3o1-kk01-001', 'c-u3o1-kk04-001']);
  });
});

describe('buildQueue', () => {
  const cards = [
    card('c-u3o1-kk04-001', ['U3O1-KK04']),
    card('c-u3o1-kk04-002', ['U3O1-KK04']),
    card('c-u3o1-kk04-003', ['U3O1-KK04']),
    card('c-u3o1-kk02-001', ['U3O1-KK02']),
    card('c-u3o1-kk02-002', ['U3O1-KK02']),
    card('c-u4o2-kk01-001', ['U4O2-KK01']),
    card('c-u4o2-kk01-002', ['U4O2-KK01']),
  ];

  it('puts due cards first, most overdue first, and leaves out cards not yet due', () => {
    const srs = {
      'c-u3o1-kk04-001': state(NOW - DAY),
      'c-u3o1-kk04-002': state(NOW - 3 * DAY),
      'c-u3o1-kk04-003': state(NOW + DAY),
      'c-u3o1-kk02-001': state(NOW),
    };
    const q = buildQueue({ cards, srs, mastery: NONE, now: NOW, newRemaining: 0, kkOrder: ALL_KK_IDS });
    expect(q.map((e) => e.cardId)).toEqual(['c-u3o1-kk04-002', 'c-u3o1-kk04-001', 'c-u3o1-kk02-001']);
    expect(q.every((e) => !e.isNew)).toBe(true);
  });

  it('adds new cards after due cards, coverage-first, up to the daily limit', () => {
    const srs = { 'c-u3o1-kk04-001': state(NOW - DAY) };
    const q = buildQueue({ cards, srs, mastery: mastery({ 'U3O1-KK04': 30 }), now: NOW, newRemaining: 3, kkOrder: ALL_KK_IDS });
    expect(q.map((e) => [e.cardId, e.isNew])).toEqual([
      ['c-u3o1-kk04-001', false],
      ['c-u3o1-kk02-001', true],
      ['c-u4o2-kk01-001', true],
      ['c-u3o1-kk04-002', true],
    ]);
  });

  it('adds no new cards once the daily limit is used up, and treats a negative limit as zero', () => {
    for (const newRemaining of [0, -4]) {
      const q = buildQueue({ cards, srs: {}, mastery: NONE, now: NOW, newRemaining, kkOrder: ALL_KK_IDS });
      expect(q).toEqual([]);
    }
    const all = buildQueue({ cards, srs: {}, mastery: NONE, now: NOW, newRemaining: 100, kkOrder: ALL_KK_IDS });
    expect(all).toHaveLength(cards.length);
  });

  it('restricts due and new cards to the given KKs for a focused review', () => {
    const srs = { 'c-u3o1-kk02-001': state(NOW - DAY), 'c-u3o1-kk04-001': state(NOW - DAY) };
    const q = buildQueue({ cards, srs, mastery: NONE, now: NOW, newRemaining: 10, kk: ['U3O1-KK04'], kkOrder: ALL_KK_IDS });
    expect(q.map((e) => e.cardId)).toEqual(['c-u3o1-kk04-001', 'c-u3o1-kk04-002', 'c-u3o1-kk04-003']);
  });

  it('shows reverse cards forward on even reps and reverse on odd reps; other types always forward', () => {
    const rev = card('c-terms-alpha', ['TERMS'], { type: 'reverse' });
    const rev2 = card('c-terms-beta', ['TERMS'], { type: 'reverse' });
    const basic = card('c-u3o1-kk04-009', ['U3O1-KK04']);
    const fresh = card('c-terms-gamma', ['TERMS'], { type: 'reverse' });
    const srs = {
      'c-terms-alpha': state(NOW - 2 * DAY, 1),
      'c-terms-beta': state(NOW - DAY, 2),
      'c-u3o1-kk04-009': state(NOW, 1),
    };
    const q = buildQueue({ cards: [rev, rev2, basic, fresh], srs, mastery: NONE, now: NOW, newRemaining: 5, kkOrder: ALL_KK_IDS });
    expect(q.map((e) => [e.cardId, e.direction])).toEqual([
      ['c-terms-alpha', 'reverse'],
      ['c-terms-beta', 'forward'],
      ['c-u3o1-kk04-009', 'forward'],
      ['c-terms-gamma', 'forward'],
    ]);
    expect(directionFor({ type: 'reverse' }, 0)).toBe('forward');
    expect(directionFor({ type: 'reverse' }, 3)).toBe('reverse');
    expect(directionFor({ type: 'cloze' }, 3)).toBe('forward');
  });

  it('lists each card once even if the content repeats it', () => {
    const dup = [cards[0], cards[0]];
    expect(buildQueue({ cards: dup, srs: {}, mastery: NONE, now: NOW, newRemaining: 5, kkOrder: ALL_KK_IDS })).toHaveLength(1);
  });
});

describe('nextDueAfter', () => {
  it('finds the earliest future due time among known cards', () => {
    const srs = { a1: state(NOW - DAY), b1: state(NOW + 3 * DAY), c1: state(NOW + DAY), gone: state(NOW + 60_000) };
    expect(nextDueAfter(srs, NOW, new Set(['a1', 'b1', 'c1']))).toBe(NOW + DAY);
    expect(nextDueAfter(srs, NOW)).toBe(NOW + 60_000);
    expect(nextDueAfter({}, NOW)).toBeNull();
  });
});

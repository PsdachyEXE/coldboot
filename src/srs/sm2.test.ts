import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAM_AT, parseInstant, studyDayStart } from '../lib/time';
import type { SrsCardState } from '../state/srs';
import { SrsCardStateSchema } from '../state/srs';
import {
  INITIAL_EASE,
  MIN_EASE,
  RATING_QUALITY,
  REQUEUE_MS,
  capDueDay,
  nextEase,
  schedule,
  type Rating,
} from './sm2';

const EXAM = parseInstant(DEFAULT_EXAM_AT); // Friday 13 November 2026, 3:00 pm AEDT
/** An exam far enough away that no cap applies. */
const FAR_EXAM = parseInstant('2030-11-13T15:00:00+11:00');

/** Local wall-clock instant in Melbourne (the suite runs with TZ=Australia/Melbourne). */
function local(y: number, m: number, d: number, h = 10, min = 0): number {
  return new Date(y, m - 1, d, h, min).getTime();
}

function card(partial: Partial<SrsCardState>): SrsCardState {
  return { reps: 2, interval: 6, ease: INITIAL_EASE, due: 0, lapses: 0, last: 0, ...partial };
}

function dueDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('SM-2 ease', () => {
  it('maps ratings to quality 1, 3, 4 and 5', () => {
    expect(RATING_QUALITY).toEqual({ 1: 1, 2: 3, 3: 4, 4: 5 });
  });

  it('applies the standard update for each rating', () => {
    // EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    expect(nextEase(2.5, 1)).toBeCloseTo(1.96, 10); // Again: -0.54
    expect(nextEase(2.5, 3)).toBeCloseTo(2.36, 10); // Hard: -0.14
    expect(nextEase(2.5, 4)).toBeCloseTo(2.5, 10); // Good: no change
    expect(nextEase(2.5, 5)).toBeCloseTo(2.6, 10); // Easy: +0.1
    const now = local(2026, 10, 1);
    const eases = ([1, 2, 3, 4] as Rating[]).map((r) => schedule(undefined, r, now, { examAt: FAR_EXAM }).next.ease);
    expect(eases).toEqual([1.96, 2.36, 2.5, 2.6]);
  });

  it('updates ease on every rating, Again included', () => {
    const now = local(2026, 10, 1);
    const again = schedule(card({ ease: 2.2 }), 1, now, { examAt: FAR_EXAM }).next;
    expect(again.ease).toBeCloseTo(1.66, 10);
  });

  it('never lets ease drop below 1.3', () => {
    expect(nextEase(1.4, 1)).toBe(MIN_EASE);
    expect(nextEase(MIN_EASE, 3)).toBe(MIN_EASE);
    let state: SrsCardState | undefined;
    const now = local(2026, 10, 1);
    for (let i = 0; i < 6; i++) state = schedule(state, 1, now, { examAt: FAR_EXAM }).next;
    expect(state!.ease).toBe(MIN_EASE);
  });

  it('starts new cards at ease 2.5', () => {
    const now = local(2026, 10, 1);
    const good = schedule(undefined, 3, now, { examAt: FAR_EXAM }).next;
    expect(good).toMatchObject({ reps: 1, interval: 1, ease: INITIAL_EASE, lapses: 0, last: now });
  });
});

describe('SM-2 intervals', () => {
  it('runs 1 day, 6 days, then previous interval times ease', () => {
    let now = local(2026, 10, 1);
    const seen: number[] = [];
    let state: SrsCardState | undefined;
    for (let i = 0; i < 5; i++) {
      const { next, requeueAfterMs } = schedule(state, 3, now, { examAt: FAR_EXAM });
      expect(requeueAfterMs).toBeNull();
      seen.push(next.interval);
      expect(next.reps).toBe(i + 1);
      state = next;
      now = next.due + 6 * 3_600_000; // review at 10 am on the due day
    }
    // 6 x 2.5 = 15; 15 x 2.5 = 37.5, rounded to 38; 38 x 2.5 = 95.
    expect(seen).toEqual([1, 6, 15, 38, 95]);
  });

  it('multiplies by the ease after this rating, so Hard, Good and Easy differ', () => {
    const now = local(2026, 10, 1);
    const prev = card({ reps: 2, interval: 6, ease: 2.5 });
    const intervals = ([2, 3, 4] as Rating[]).map((r) => schedule(prev, r, now, { examAt: FAR_EXAM }).next.interval);
    // 6 x 2.36 = 14.16; 6 x 2.5 = 15; 6 x 2.6 = 15.6
    expect(intervals).toEqual([14, 15, 16]);
  });

  it('keeps the interval at least 1 day', () => {
    const now = local(2026, 10, 1);
    const next = schedule(card({ reps: 3, interval: 0 }), 2, now, { examAt: FAR_EXAM }).next;
    expect(next.interval).toBe(1);
  });

  it('resets reps, sets 1 day, counts a lapse and requeues in 10 minutes on Again', () => {
    const now = local(2026, 10, 1, 19, 30);
    const res = schedule(card({ reps: 4, interval: 30, ease: 2.4, lapses: 2 }), 1, now, { examAt: FAR_EXAM });
    expect(res.requeueAfterMs).toBe(REQUEUE_MS);
    expect(REQUEUE_MS).toBe(600_000);
    expect(res.next).toMatchObject({ reps: 0, interval: 1, lapses: 3, last: now });
    expect(res.next.due).toBe(studyDayStart('2026-10-02'));
  });

  it('does not requeue or count a lapse for Hard, Good or Easy', () => {
    const now = local(2026, 10, 1);
    for (const r of [2, 3, 4] as Rating[]) {
      const res = schedule(card({ lapses: 1 }), r, now, { examAt: FAR_EXAM });
      expect(res.requeueAfterMs).toBeNull();
      expect(res.next.lapses).toBe(1);
    }
  });

  it('sets due to the 4 am start of the study day', () => {
    const now = local(2026, 10, 1, 21, 15);
    const { next } = schedule(undefined, 3, now, { examAt: FAR_EXAM });
    expect(next.due).toBe(local(2026, 10, 2, 4, 0));
  });

  it('counts from the study day, so a review after midnight is due at 4 am the same morning', () => {
    const now = local(2026, 10, 8, 1, 30); // still the study day of 7 October
    const { next } = schedule(undefined, 3, now, { examAt: FAR_EXAM });
    expect(next.due).toBe(local(2026, 10, 8, 4, 0));
    expect(next.interval).toBe(1);
  });

  it('always produces a state the SRS store accepts', () => {
    let state: SrsCardState | undefined;
    let now = local(2026, 12, 1);
    for (let i = 0; i < 40; i++) {
      state = schedule(state, 4, now, { examAt: EXAM }).next;
      expect(SrsCardStateSchema.safeParse(state).success).toBe(true);
      now = state.due + 3_600_000;
    }
  });
});

describe('SM-2 exam caps', () => {
  it('clamps the due date to two days before the exam', () => {
    const now = local(2026, 10, 20);
    const { next } = schedule(card({ reps: 2, interval: 20, ease: 2.5 }), 3, now, { examAt: EXAM });
    expect(dueDay(next.due)).toBe('2026-11-11');
    expect(new Date(next.due).getHours()).toBe(4);
  });

  it('stores the effective interval, so the next review grows from what was scheduled', () => {
    const now = local(2026, 10, 20);
    const first = schedule(card({ reps: 2, interval: 20, ease: 2.5 }), 3, now, { examAt: EXAM }).next;
    expect(first.interval).toBe(22); // 20 October to 11 November, not 50
    const second = schedule(first, 3, first.due + 3_600_000, { examAt: FAR_EXAM }).next;
    expect(second.interval).toBe(55); // 22 x 2.5
  });

  it('caps intervals at 2 days in the final 7 days before the exam day', () => {
    const inWeek = schedule(card({ reps: 2, interval: 6 }), 3, local(2026, 11, 6), { examAt: EXAM }).next;
    expect(dueDay(inWeek.due)).toBe('2026-11-08');
    expect(inWeek.interval).toBe(2);
    // Eight days out the final-week cap doesn't apply; only the exam-minus-two clamp does.
    const before = schedule(card({ reps: 2, interval: 6 }), 3, local(2026, 11, 5), { examAt: EXAM }).next;
    expect(dueDay(before.due)).toBe('2026-11-11');
    expect(before.interval).toBe(6);
  });

  it('applies both caps together near the exam', () => {
    const next = schedule(card({ reps: 5, interval: 40 }), 4, local(2026, 11, 8), { examAt: EXAM }).next;
    expect(dueDay(next.due)).toBe('2026-11-10');
    expect(next.interval).toBe(2);
  });

  it('never schedules earlier than tomorrow', () => {
    const dayBefore = schedule(card({ reps: 3, interval: 10 }), 3, local(2026, 11, 12), { examAt: EXAM }).next;
    expect(dueDay(dayBefore.due)).toBe('2026-11-13');
    expect(dayBefore.interval).toBe(1);
    const examMorning = schedule(undefined, 4, local(2026, 11, 13, 9), { examAt: EXAM }).next;
    expect(dueDay(examMorning.due)).toBe('2026-11-14');
    const twoBefore = schedule(card({ reps: 3, interval: 10 }), 3, local(2026, 11, 10), { examAt: EXAM }).next;
    expect(dueDay(twoBefore.due)).toBe('2026-11-11');
  });

  it('lifts both caps once the exam has started', () => {
    const justBefore = schedule(card({ reps: 2, interval: 6 }), 3, EXAM - 60_000, { examAt: EXAM }).next;
    expect(dueDay(justBefore.due)).toBe('2026-11-14');
    const after = schedule(card({ reps: 2, interval: 6 }), 3, EXAM + 60_000, { examAt: EXAM }).next;
    expect(after.interval).toBe(15);
    expect(dueDay(after.due)).toBe('2026-11-28');
  });

  it('says which cap moved the due date, so the rating buttons can explain it', () => {
    const exam = schedule(card({ reps: 2, interval: 20, ease: 2.5 }), 3, local(2026, 10, 20), { examAt: EXAM });
    expect(exam.capped).toBe('exam');
    const week = schedule(card({ reps: 2, interval: 6 }), 3, local(2026, 11, 6), { examAt: EXAM });
    expect(week.capped).toBe('final-week');
    const free = schedule(card({ reps: 2, interval: 6 }), 3, local(2026, 10, 1), { examAt: EXAM });
    expect(free.capped).toBeNull();
    const again = schedule(card({ reps: 2, interval: 6 }), 1, local(2026, 11, 6), { examAt: EXAM });
    expect(again.capped).toBeNull();
    const after = schedule(card({ reps: 2, interval: 6 }), 3, EXAM + 60_000, { examAt: EXAM });
    expect(after.capped).toBeNull();
  });

  it('caps the due day with capDueDay directly', () => {
    const now = local(2026, 11, 1);
    expect(capDueDay('2026-11-01', 30, now, EXAM)).toBe('2026-11-11');
    expect(capDueDay('2026-11-09', 30, local(2026, 11, 9), EXAM)).toBe('2026-11-11');
    expect(capDueDay('2026-11-11', 30, local(2026, 11, 11), EXAM)).toBe('2026-11-12');
    expect(capDueDay('2026-11-20', 30, local(2026, 11, 20), EXAM)).toBe('2026-12-20');
  });
});

describe('SM-2 due times across daylight saving', () => {
  it('lands at 4 am AEDT the morning daylight saving starts (4 October 2026)', () => {
    const now = local(2026, 10, 3, 20); // AEST, UTC+10
    const { next } = schedule(undefined, 3, now, { examAt: EXAM });
    expect(new Date(next.due).toISOString()).toBe('2026-10-03T17:00:00.000Z'); // 4 am UTC+11
    expect(new Date(next.due).getHours()).toBe(4);
  });

  it('lands at 4 am when a 6-day interval crosses the October change', () => {
    const now = local(2026, 10, 1, 18); // AEST
    const { next } = schedule(card({ reps: 1, interval: 1 }), 3, now, { examAt: EXAM });
    expect(new Date(next.due).toISOString()).toBe('2026-10-06T17:00:00.000Z'); // 7 October, 4 am AEDT
    expect(new Date(next.due).getHours()).toBe(4);
    expect(next.interval).toBe(6);
  });

  it('lands at 4 am from a review between midnight and 4 am on the October change', () => {
    const now = local(2026, 10, 4, 1, 30); // 1:30 am AEST, before the 2 am jump; study day 3 October
    const { next } = schedule(undefined, 3, now, { examAt: EXAM });
    expect(new Date(next.due).toISOString()).toBe('2026-10-03T17:00:00.000Z');
  });

  it('lands at 4 am AEST the morning daylight saving ends (4 April 2027)', () => {
    const now = local(2027, 4, 3, 20); // AEDT, UTC+11
    const { next } = schedule(undefined, 3, now, { examAt: EXAM });
    expect(new Date(next.due).toISOString()).toBe('2027-04-03T18:00:00.000Z'); // 4 am UTC+10
    expect(new Date(next.due).getHours()).toBe(4);
  });

  it('lands at 4 am when a 6-day interval crosses the April change', () => {
    const now = local(2027, 4, 1, 18); // AEDT
    const { next } = schedule(card({ reps: 1, interval: 1 }), 4, now, { examAt: EXAM });
    expect(new Date(next.due).toISOString()).toBe('2027-04-06T18:00:00.000Z'); // 7 April, 4 am AEST
    expect(next.interval).toBe(6);
  });
});

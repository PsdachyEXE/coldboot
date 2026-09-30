import { describe, expect, it } from 'vitest';
import type { KkId } from '../../content/schema';
import { ALL_KK_IDS } from '../../content/studyDesign';
import { studyDayStart } from '../../lib/time';
import type { KkMastery } from '../../srs/mastery';
import type { DayActivity } from '../../state/session';
import type { SrsCardState } from '../../state/srs';
import {
  AREA_KEYS,
  accuracyByArea,
  daysStudied,
  dueForecast,
  hasActivity,
  lastDays,
  niceTicks,
  reviewsPerDay,
  sumValues,
  timePerDay,
  totalTime,
  weakestKks,
} from './aggregate';
import { formatStudyTime, longDay, shortDay, toMinutes } from './format';

function day(partial: Partial<DayActivity>): DayActivity {
  return { n: 0, s: 0, reviews: 0, ms: 0, areas: {}, ...partial };
}

function card(due: number): SrsCardState {
  return { reps: 1, interval: 1, ease: 2.5, due, lapses: 0, last: due - 86_400_000 };
}

describe('lastDays', () => {
  it('lists the 21 study days ending today, oldest first, across a month boundary', () => {
    const days = lastDays('2026-10-05');
    expect(days).toHaveLength(21);
    expect(days[0]).toBe('2026-09-15');
    expect(days[20]).toBe('2026-10-05');
    expect(new Set(days).size).toBe(21);
  });

  it('takes a window length', () => {
    expect(lastDays('2026-01-01', 3)).toEqual(['2025-12-30', '2025-12-31', '2026-01-01']);
  });
});

describe('accuracyByArea', () => {
  const days = lastDays('2026-10-05', 5);
  const activity = {
    '2026-10-01': day({ n: 4, s: 3, areas: { U3O1: [4, 3] } }),
    '2026-10-03': day({ n: 6, s: 2.4, areas: { U3O1: [2, 0], PSM: [4, 2.4] } }),
    // Outside the window: ignored.
    '2026-09-01': day({ n: 10, s: 10, areas: { U3O1: [10, 10] } }),
  };

  it('gives one series per area, in the order areas then Terms and PSM', () => {
    const series = accuracyByArea(activity, days);
    expect(series.map((s) => s.area)).toEqual(['U3O1', 'U3O2', 'U4O1', 'U4O2', 'TERMS', 'PSM']);
    expect(series.map((s) => s.area)).toEqual([...AREA_KEYS]);
    expect(series.every((s) => s.points.length === 5)).toBe(true);
  });

  it('computes the mean score per day, with null (a gap) for days without answers', () => {
    const u3o1 = accuracyByArea(activity, days)[0];
    expect(u3o1.points.map((p) => p.day)).toEqual(days);
    expect(u3o1.points.map((p) => p.pct)).toEqual([75, null, 0, null, null]);
    expect(u3o1.points.map((p) => p.n)).toEqual([4, 0, 2, 0, 0]);
  });

  it('keeps a 0% day distinct from a day without data', () => {
    const u3o1 = accuracyByArea(activity, days)[0];
    expect(u3o1.points[2].pct).toBe(0);
    expect(u3o1.points[3].pct).toBeNull();
  });

  it('totals the window per area, ignoring days outside it', () => {
    const series = accuracyByArea(activity, days);
    expect(series[0].n).toBe(6);
    expect(series[0].pct).toBeCloseTo(50);
    const psm = series.find((s) => s.area === 'PSM')!;
    expect(psm.n).toBe(4);
    expect(psm.pct).toBeCloseTo(60);
    const u4o2 = series.find((s) => s.area === 'U4O2')!;
    expect(u4o2).toMatchObject({ n: 0, pct: null });
  });

  it('handles no activity at all', () => {
    const series = accuracyByArea({}, days);
    expect(series.every((s) => s.n === 0 && s.pct === null && s.points.every((p) => p.pct === null))).toBe(true);
  });
});

describe('reviews and time per day', () => {
  const days = lastDays('2026-10-05', 3);
  const activity = {
    '2026-10-03': day({ n: 5, s: 4, reviews: 5, ms: 90_000 }),
    '2026-10-05': day({ n: 3, s: 3, reviews: 1, ms: 30_000 }),
    '2026-08-01': day({ n: 2, s: 1, reviews: 2, ms: 600_000 }),
  };

  it('counts reviews per study day, zero where nothing was reviewed', () => {
    expect(reviewsPerDay(activity, days)).toEqual([
      { day: '2026-10-03', value: 5 },
      { day: '2026-10-04', value: 0 },
      { day: '2026-10-05', value: 1 },
    ]);
    expect(sumValues(reviewsPerDay(activity, days))).toBe(6);
  });

  it('sums time per study day, in the window and in total', () => {
    expect(timePerDay(activity, days).map((d) => d.value)).toEqual([90_000, 0, 30_000]);
    expect(totalTime(activity)).toBe(720_000);
    expect(totalTime({})).toBe(0);
  });

  it('counts days studied and whether there is any activity', () => {
    expect(daysStudied(activity)).toBe(3);
    expect(daysStudied({ '2026-10-01': day({}) })).toBe(0);
    expect(hasActivity(activity)).toBe(true);
    expect(hasActivity({})).toBe(false);
    expect(hasActivity({ '2026-10-01': day({}) })).toBe(false);
  });
});

describe('dueForecast', () => {
  // 6 pm on Monday 5 October 2026, Melbourne (tests run in Australia/Melbourne).
  const now = new Date(2026, 9, 5, 18, 0).getTime();

  it('buckets cards by the study day they fall due, over 14 days from today', () => {
    const cards = {
      overdue: card(studyDayStart('2026-10-01')),
      'due-this-morning': card(studyDayStart('2026-10-05')),
      'requeued-later-today': card(now + 10 * 60_000),
      'after-midnight': card(new Date(2026, 9, 6, 1, 0).getTime()),
      tomorrow: card(studyDayStart('2026-10-06')),
      'day-13': card(studyDayStart('2026-10-18')),
      'day-14': card(studyDayStart('2026-10-19')),
      'far-away': card(studyDayStart('2026-11-10')),
    };
    const f = dueForecast(cards, now);
    expect(f.days).toHaveLength(14);
    expect(f.days[0]).toEqual({ day: '2026-10-05', due: 4, dueNow: 2 });
    expect(f.days[1]).toEqual({ day: '2026-10-06', due: 1, dueNow: 0 });
    expect(f.days[13]).toEqual({ day: '2026-10-18', due: 1, dueNow: 0 });
    expect(f.days.slice(2, 13).every((d) => d.due === 0)).toBe(true);
    expect(f.later).toBe(2);
    expect(f.total).toBe(8);
    expect(f.days.slice(1).every((d) => d.dueNow === 0)).toBe(true);
  });

  it('leaves out cards that are no longer in the content', () => {
    const cards = { kept: card(now - 1), gone: card(now - 1) };
    const f = dueForecast(cards, now, new Set(['kept']));
    expect(f.total).toBe(1);
    expect(f.days[0].due).toBe(1);
  });

  it('is empty with no cards', () => {
    const f = dueForecast({}, now);
    expect(f.total).toBe(0);
    expect(f.later).toBe(0);
    expect(f.days.every((d) => d.due === 0)).toBe(true);
  });
});

describe('weakestKks', () => {
  const m = (value: number, n = 3): KkMastery => ({ value, n, last: 1_000 });

  it('ranks seen KKs by mastery, weakest first, and counts unseen KKs apart', () => {
    const mastery = new Map<KkId, KkMastery>([
      ['U3O1-KK04', m(62)],
      ['U3O2-KK08', m(20)],
      ['PSM', m(45)],
      ['U4O2-KK01', m(90)],
    ]);
    const result = weakestKks(mastery);
    expect(result.weakest.map((w) => w.kk)).toEqual(['U3O2-KK08', 'PSM', 'U3O1-KK04', 'U4O2-KK01']);
    expect(result.seen).toBe(4);
    expect(result.unseen).toBe(ALL_KK_IDS.length - 4);
  });

  it('shows at most ten, and ties keep study-design order', () => {
    const mastery = new Map<KkId, KkMastery>(ALL_KK_IDS.slice(0, 14).map((kk) => [kk, m(50)]));
    mastery.set(ALL_KK_IDS[13], m(10));
    const result = weakestKks(mastery);
    expect(result.weakest).toHaveLength(10);
    expect(result.weakest[0].kk).toBe(ALL_KK_IDS[13]);
    expect(result.weakest.slice(1).map((w) => w.kk)).toEqual(ALL_KK_IDS.slice(0, 9));
  });

  it('never ranks an unseen KK, even one with a mastery of zero elsewhere', () => {
    const mastery = new Map<KkId, KkMastery>([['U3O1-KK01', m(0)]]);
    const result = weakestKks(mastery);
    expect(result.weakest.map((w) => w.kk)).toEqual(['U3O1-KK01']);
    expect(result.weakest[0].value).toBe(0);
    expect(weakestKks(new Map()).weakest).toEqual([]);
    expect(weakestKks(new Map()).unseen).toBe(ALL_KK_IDS.length);
  });

  it('ignores KKs that are not in the current map', () => {
    const mastery = new Map<KkId, KkMastery>([
      ['U3O1-KK99', m(5)],
      ['U3O1-KK02', m(50)],
    ]);
    const result = weakestKks(mastery);
    expect(result.weakest.map((w) => w.kk)).toEqual(['U3O1-KK02']);
    expect(result.seen).toBe(1);
  });
});

describe('niceTicks', () => {
  it('gives clean whole-number steps from zero past the maximum', () => {
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(7)).toEqual([0, 5, 10]);
    expect(niceTicks(42)).toEqual([0, 20, 40, 60]);
    expect(niceTicks(100)).toEqual([0, 50, 100]);
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(0.4)).toEqual([0, 1]);
  });
});

describe('stats formatting', () => {
  it('names days for axes and tables', () => {
    expect(shortDay('2026-09-30')).toBe('30 Sep');
    expect(longDay('2026-09-30')).toBe('Wednesday 30 September');
  });

  it('says how long was studied in words', () => {
    expect(formatStudyTime(0)).toBe('None');
    expect(formatStudyTime(20_000)).toBe('under a minute');
    expect(formatStudyTime(25 * 60_000)).toBe('25 min');
    expect(formatStudyTime(125 * 60_000)).toBe('2 h 5 min');
    expect(formatStudyTime(120 * 60_000)).toBe('2 h');
    expect(toMinutes(90_000)).toBe(1.5);
  });
});

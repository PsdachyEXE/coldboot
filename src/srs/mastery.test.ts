import { describe, expect, it } from 'vitest';
import type { KkId } from '../content/schema';
import { ROLLUP_KEEP, ROLLUP_THRESHOLD, rollUp, type AttemptTuple, type AttemptsData } from '../state/attempts';
import { computeMastery, masteryBand, masteryValue } from './mastery';

const NOW = Date.UTC(2026, 9, 1, 0, 0, 0);
const DAY_S = 86_400;
const nowS = NOW / 1000;

function data(log: AttemptTuple[], rollup: AttemptsData['rollup'] = {}): AttemptsData {
  return { log, rollup, kkMap: 1 };
}

function t(kk: KkId[], score: number, ageDays: number, id = 'm-u3o1-kk04-001'): AttemptTuple {
  return [id, kk, score, Math.round(nowS - ageDays * DAY_S), 1000];
}

describe('computeMastery', () => {
  it('weights each attempt by 0.5 ^ (ageDays / 7)', () => {
    // A right answer today (weight 1) and a wrong one a week ago (weight 0.5): 1 / 1.5.
    const m = computeMastery(data([t(['U3O1-KK04'], 0, 7), t(['U3O1-KK04'], 1, 0)]), NOW);
    expect(m.get('U3O1-KK04')!.value).toBeCloseTo(66.7, 1);
    // Two weeks back the weight is 0.25: 1 / 1.25.
    const m2 = computeMastery(data([t(['U3O1-KK04'], 0, 14), t(['U3O1-KK04'], 1, 0)]), NOW);
    expect(m2.get('U3O1-KK04')!.value).toBeCloseTo(80, 1);
  });

  it('decays as time passes with no new attempts, towards the older scores', () => {
    const log = [t(['U3O1-KK04'], 0, 10), t(['U3O1-KK04'], 1, 3)];
    const a = computeMastery(data(log), NOW).get('U3O1-KK04')!.value;
    const b = computeMastery(data(log), NOW + 30 * DAY_S * 1000).get('U3O1-KK04')!.value;
    // Relative weights don't change with a uniform shift in age, so the mean is stable.
    expect(b).toBeCloseTo(a, 5);
    // Weighting: w(3 days) = 0.5^(3/7), w(10 days) = 0.5^(10/7).
    const w3 = 0.5 ** (3 / 7);
    const w10 = 0.5 ** (10 / 7);
    expect(a).toBeCloseTo((w3 / (w3 + w10)) * 100, 1);
  });

  it('averages card ratings, MCQ results and short-answer scores on one 0 to 100 scale', () => {
    const m = computeMastery(data([t(['U3O2-KK08'], 0.8, 0), t(['U3O2-KK08'], 0.5, 0), t(['U3O2-KK08'], 0.25, 0)]), NOW);
    expect(m.get('U3O2-KK08')!.value).toBeCloseTo(51.7, 1);
    expect(m.get('U3O2-KK08')!.n).toBe(3);
  });

  it('credits every KK an attempt carries', () => {
    const m = computeMastery(data([t(['U3O1-KK04', 'TERMS'], 1, 0)]), NOW);
    expect(m.get('U3O1-KK04')!.value).toBe(100);
    expect(m.get('TERMS')!.value).toBe(100);
  });

  it('leaves unseen KKs out of the map, which is different from zero', () => {
    const m = computeMastery(data([t(['U3O1-KK04'], 0, 1)]), NOW);
    expect(m.get('U3O1-KK04')).toMatchObject({ value: 0, n: 1 });
    expect(m.has('U3O1-KK05')).toBe(false);
    expect(masteryValue(m, 'U3O1-KK04')).toBe(0);
    expect(masteryValue(m, 'U3O1-KK05')).toBeNull();
    expect(masteryBand(masteryValue(m, 'U3O1-KK04'))).toBe('weak');
    expect(masteryBand(masteryValue(m, 'U3O1-KK05'))).toBe('unseen');
  });

  it('records the time of the latest attempt', () => {
    const m = computeMastery(data([t(['U3O1-KK04'], 1, 3), t(['U3O1-KK04'], 1, 1)]), NOW);
    expect(m.get('U3O1-KK04')!.last).toBe((nowS - DAY_S) * 1000);
  });

  it('bands mastery at 40, 65 and 85', () => {
    expect([0, 39.9, 40, 64.9, 65, 84.9, 85, 100].map(masteryBand)).toEqual([
      'weak',
      'weak',
      'shaky',
      'shaky',
      'solid',
      'solid',
      'strong',
      'strong',
    ]);
  });
});

describe('computeMastery with a rolled-up log', () => {
  function bigLog(): AttemptTuple[] {
    const kks: KkId[][] = [['U3O1-KK04'], ['U3O1-KK12'], ['U3O1-KK04', 'TERMS'], ['U4O2-KK07']];
    const log: AttemptTuple[] = [];
    const count = ROLLUP_THRESHOLD + 1500;
    for (let i = 0; i < count; i++) {
      const ageDays = ((count - i) / count) * 60; // oldest 60 days ago, newest now
      const score = ((i * 37) % 11) / 10;
      log.push([`m-x-${i % 400}`, kks[i % kks.length], Math.min(1, score), Math.round(nowS - ageDays * DAY_S), 500]);
    }
    return log;
  }

  it('gives the same values with and without the roll-up', () => {
    const full = data(bigLog());
    const rolled = rollUp(full);
    expect(rolled.log.length).toBe(ROLLUP_KEEP);
    expect(Object.keys(rolled.rollup).length).toBeGreaterThan(0);
    const a = computeMastery(full, NOW);
    const b = computeMastery(rolled, NOW);
    expect([...b.keys()].sort()).toEqual([...a.keys()].sort());
    for (const [kk, m] of a) {
      // Values are rounded to one decimal place, so allow one step of rounding either way.
      expect(Math.abs(b.get(kk)!.value - m.value)).toBeLessThanOrEqual(0.1 + 1e-9);
      expect(b.get(kk)!.n).toBe(m.n);
    }
  });

  it('stays equivalent as time moves on after the roll-up', () => {
    const full = data(bigLog());
    const rolled = rollUp(full);
    const later = NOW + 12 * DAY_S * 1000;
    const a = computeMastery(full, later);
    const b = computeMastery(rolled, later);
    for (const [kk, m] of a) expect(Math.abs(b.get(kk)!.value - m.value)).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it('keeps a KK that only has rolled-up attempts, with no last-practised time', () => {
    const rolled = data([], { 'U3O2-KK03': { w: 2, s: 1, n: 4, ref: nowS - 3 * DAY_S } });
    const m = computeMastery(rolled, NOW);
    expect(m.get('U3O2-KK03')).toEqual({ value: 50, n: 4, last: 0 });
  });
});

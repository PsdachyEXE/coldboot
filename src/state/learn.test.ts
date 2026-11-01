import { afterEach, describe, expect, it } from 'vitest';
import { LearnDataSchema, mergeLearn, salvageLearn, useLearn } from './learn';

describe('learn store', () => {
  afterEach(() => useLearn.getState().reset());

  it('records the latest read for each key knowledge point and ignores older ones', () => {
    useLearn.getState().markRead('U3O1-KK04', 2_000);
    useLearn.getState().markRead('U3O1-KK04', 1_000);
    useLearn.getState().markRead('TERMS', 3_000);
    expect(useLearn.getState().read).toEqual({
      'U3O1-KK04': 2_000,
      TERMS: 3_000,
    });
  });

  it('accepts only key knowledge ids and sane times', () => {
    expect(LearnDataSchema.safeParse({ read: { 'U3O1-KK04': 5 } }).success).toBe(true);
    expect(LearnDataSchema.safeParse({ read: { 'U9O1-KK04': 5 } }).success).toBe(false);
    expect(LearnDataSchema.safeParse({ read: { 'U3O1-KK04': -1 } }).success).toBe(false);
  });

  it('salvages the valid records of damaged data', () => {
    const r = salvageLearn({
      read: { 'U3O1-KK04': 5, nope: 6, 'U4O2-KK10': 'x' },
    });
    expect(r?.data.read).toEqual({ 'U3O1-KK04': 5 });
    expect(r?.dropped).toBe(2);
    expect(salvageLearn(7)).toBeUndefined();
  });

  it('merges two windows by keeping the later read', () => {
    expect(mergeLearn({ read: { 'U3O1-KK04': 9, PSM: 1 } }, { read: { 'U3O1-KK04': 4, 'U3O2-KK08': 2 } }).read).toEqual({
      'U3O1-KK04': 9,
      PSM: 1,
      'U3O2-KK08': 2,
    });
  });
});

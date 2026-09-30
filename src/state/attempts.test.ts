import { describe, expect, it } from 'vitest';
import type { KkId, KkRename } from '../content/schema';
import { studyDesign } from '../content/studyDesign';
import { examPersistence } from '../exam/store';
import { applyKkRenames, attemptsPersistence, mergeAttempts, type AttemptsData, type AttemptTuple } from './attempts';

const tuple = (id: string, kk: string[], ts = 1_000): AttemptTuple => [id, kk as KkId[], 1, ts, 100];
const data = (log: AttemptTuple[], kkMap = 1, rollup: AttemptsData['rollup'] = {}): AttemptsData => ({ log, rollup, kkMap });
const kks = (d: AttemptsData) => d.log.map((t) => t[1]);

describe('KK renames', () => {
  const recorded = data([tuple('a', ['U3O1-KK03']), tuple('b', ['U3O1-KK04']), tuple('c', ['U3O1-KK05', 'PSM'])]);

  it('shifts ids when a KK is inserted, whatever order the renames are listed in', () => {
    const shift: KkRename[] = [
      { from: 'U3O1-KK03', to: 'U3O1-KK04', since: 2 },
      { from: 'U3O1-KK04', to: 'U3O1-KK05', since: 2 },
      { from: 'U3O1-KK05', to: 'U3O1-KK06', since: 2 },
    ];
    for (const renames of [shift, [...shift].reverse()]) {
      const moved = applyKkRenames(recorded, renames, 2);
      expect(kks(moved)).toEqual([['U3O1-KK04'], ['U3O1-KK05'], ['U3O1-KK06', 'PSM']]);
      expect(moved.kkMap).toBe(2);
    }
  });

  it('swaps two ids', () => {
    const swap: KkRename[] = [
      { from: 'U3O1-KK04', to: 'U3O1-KK05', since: 2 },
      { from: 'U3O1-KK05', to: 'U3O1-KK04', since: 2 },
    ];
    expect(kks(applyKkRenames(recorded, swap, 2))).toEqual([['U3O1-KK03'], ['U3O1-KK05'], ['U3O1-KK04', 'PSM']]);
  });

  it('chains versions in order, applying only the ones newer than the data', () => {
    const renames: KkRename[] = [
      { from: 'U3O1-KK03', to: 'U3O1-KK04', since: 2 },
      { from: 'U3O1-KK04', to: 'U3O1-KK06', since: 3 },
    ];
    // Under map 1, KK03 became KK04 in version 2 and KK06 in version 3.
    expect(kks(applyKkRenames(data([tuple('a', ['U3O1-KK03'])], 1), renames, 3))).toEqual([['U3O1-KK06']]);
    // Under map 2, KK03 is a different KK that version 3 leaves alone.
    expect(kks(applyKkRenames(data([tuple('a', ['U3O1-KK03']), tuple('b', ['U3O1-KK04'])], 2), renames, 3))).toEqual([['U3O1-KK03'], ['U3O1-KK06']]);
    // Data already on the current map is untouched.
    const current = data([tuple('a', ['U3O1-KK03'])], 3);
    expect(applyKkRenames(current, renames, 3)).toBe(current);
  });

  it('renames roll-ups, combining two KKs that become one', () => {
    const merge: KkRename[] = [{ from: 'U3O1-KK04', to: 'U3O1-KK03', since: 2 }];
    const rolled = data([], 1, { 'U3O1-KK03': { w: 1, s: 1, n: 2, ref: 500 }, 'U3O1-KK04': { w: 2, s: 1, n: 3, ref: 500 } });
    expect(applyKkRenames(rolled, merge, 2).rollup).toEqual({ 'U3O1-KK03': { w: 3, s: 2, n: 5, ref: 500 } });
  });

  it("merges another window's attempts under one map, renaming the older side first", () => {
    const renames: KkRename[] = [{ from: 'U3O1-KK04', to: 'U3O1-KK05', since: 2 }];
    // This window has already hydrated under map 2; a window on the old map saved under map 1.
    const local = data([tuple('a', ['U3O1-KK05'], 2_000)], 2);
    const incoming = data([tuple('b', ['U3O1-KK04'], 1_000)], 1);
    const merged = mergeAttempts(local, incoming, renames, 2);
    expect(merged.kkMap).toBe(2);
    expect(kks(merged)).toEqual([['U3O1-KK05'], ['U3O1-KK05']]);
    // With nothing new here, the other window's data still comes back on the current map.
    expect(mergeAttempts(data([], 2), incoming, renames, 2)).toEqual(data([tuple('b', ['U3O1-KK05'], 1_000)], 2));
  });

  it('bumps the attempts and exam store versions whenever the KK map is renumbered', () => {
    // docs/CONTRACTS.md: a new kkMapVersion ships with a version bump of both stores, so a build
    // on the old map open in another window blocks instead of saving old ids under the new map.
    expect({ kkMapVersion: studyDesign.kkMapVersion, attempts: attemptsPersistence.version, exam: examPersistence.version }).toEqual({
      kkMapVersion: 1,
      attempts: 1,
      exam: 2,
    });
  });
});

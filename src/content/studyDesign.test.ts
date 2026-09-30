import { describe, expect, it } from 'vitest';
import raw from '../../content/study-design.json';
import { kkRenamer, StudyDesignSchema, type KkRename } from './schema';

function issues(renames: KkRename[], kkMapVersion = 2): string[] {
  const parsed = StudyDesignSchema.safeParse({ ...raw, kkMapVersion, renames });
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
}

describe('KK map renames', () => {
  it('accepts the shipped map, a shift, a swap and a chain across versions', () => {
    expect(issues(raw.renames as KkRename[], raw.kkMapVersion)).toEqual([]);
    expect(
      issues([
        { from: 'U3O1-KK03', to: 'U3O1-KK04', since: 2 },
        { from: 'U3O1-KK04', to: 'U3O1-KK05', since: 2 },
      ]),
    ).toEqual([]);
    expect(
      issues([
        { from: 'U3O1-KK04', to: 'U3O1-KK05', since: 2 },
        { from: 'U3O1-KK05', to: 'U3O1-KK04', since: 2 },
      ]),
    ).toEqual([]);
    expect(
      issues(
        [
          { from: 'U3O1-KK03', to: 'U3O1-KK04', since: 2 },
          { from: 'U3O1-KK04', to: 'U3O1-KK06', since: 3 },
        ],
        3,
      ),
    ).toEqual([]);
  });

  it('rejects a KK renamed twice in one version, a rename past the map version, and an id that ends up missing', () => {
    expect(
      issues([
        { from: 'U3O1-KK03', to: 'U3O1-KK04', since: 2 },
        { from: 'U3O1-KK03', to: 'U3O1-KK05', since: 2 },
      ]),
    ).toEqual(['U3O1-KK03 is renamed twice in version 2']);
    expect(issues([{ from: 'U3O1-KK03', to: 'U3O1-KK04', since: 3 }])).toEqual(['Rename U3O1-KK03 to U3O1-KK04 is for version 3, after kkMapVersion 2']);
    expect(issues([{ from: 'U3O1-KK03', to: 'U3O1-KK99', since: 2 }])).toEqual(['U3O1-KK03 (map 1) becomes U3O1-KK99, which is not in the KK map']);
    // Through a chain: KK03 becomes KK04 in version 2, and version 3 moves KK04 off the map.
    expect(
      issues(
        [
          { from: 'U3O1-KK03', to: 'U3O1-KK04', since: 2 },
          { from: 'U3O1-KK04', to: 'U3O1-KK98', since: 3 },
        ],
        3,
      ),
    ).toEqual(['U3O1-KK03 (map 1) becomes U3O1-KK98, which is not in the KK map', 'U3O1-KK04 (map 2) becomes U3O1-KK98, which is not in the KK map']);
  });

  it('maps an id from any older version to the current one', () => {
    const renames: KkRename[] = [
      { from: 'U3O1-KK04', to: 'U3O1-KK05', since: 2 },
      { from: 'U3O1-KK05', to: 'U3O1-KK04', since: 2 },
      { from: 'U3O1-KK05', to: 'U3O1-KK07', since: 3 },
    ];
    const fromOne = kkRenamer(renames, 1, 3);
    expect(['U3O1-KK04', 'U3O1-KK05', 'U3O1-KK06'].map(fromOne)).toEqual(['U3O1-KK07', 'U3O1-KK04', 'U3O1-KK06']);
    const fromTwo = kkRenamer(renames, 2, 3);
    expect(['U3O1-KK04', 'U3O1-KK05'].map(fromTwo)).toEqual(['U3O1-KK04', 'U3O1-KK07']);
    expect(kkRenamer(renames, 3, 3)('U3O1-KK05')).toBe('U3O1-KK05');
  });
});

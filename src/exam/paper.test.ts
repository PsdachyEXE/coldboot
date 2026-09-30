import { beforeAll, describe, expect, it } from 'vitest';
import { fxCaseStudy, fxMcq, fxShort } from '../app/study/testing';
import { loadAllContent, type ContentIndex } from '../content/loader';
import { isMcq, type CaseStudy, type KkId, type Mcq, type ShortAnswer } from '../content/schema';
import { mulberry32 } from '../games/prng';
import {
  SLICE,
  apportion,
  assemblePaper,
  bucketOf,
  chooseCaseStudy,
  nearIdentical,
  nearIdenticalGroups,
  orderShorts,
  pickSectionA,
  pickSectionB,
  pickShortMarks,
  sliceCaseStudy,
  type Bucket,
} from './paper';

let content: ContentIndex;
const SEEDS = Array.from({ length: 120 }, (_, i) => (i * 2654435761) >>> 0);

beforeAll(async () => {
  content = await loadAllContent();
});

function marksOf(ids: string[]): number {
  return ids.reduce((sum, id) => {
    const e = content.byId.get(id);
    if (!e || e.kind === 'card') throw new Error(`unknown item ${id}`);
    return sum + (isMcq(e.item) ? 1 : e.item.marks);
  }, 0);
}

function item(id: string) {
  const e = content.byId.get(id);
  if (!e || e.kind === 'card') throw new Error(`unknown item ${id}`);
  return e;
}

describe('full paper assembly', () => {
  it('sets 20 distinct standalone MCQs, short answers worth exactly 20 marks, and one whole case study', () => {
    for (const seed of SEEDS) {
      const p = assemblePaper(content, 'full', seed);
      expect(p.sections.a).toHaveLength(20);
      expect(new Set(p.sections.a).size).toBe(20);
      for (const id of p.sections.a) expect(item(id)).toMatchObject({ kind: 'mcq' });
      for (const id of p.sections.a) expect(item(id).caseStudyId).toBeUndefined();

      expect(marksOf(p.sections.b)).toBe(20);
      expect(p.sections.b.length).toBeGreaterThanOrEqual(4);
      expect(p.sections.b.length).toBeLessThanOrEqual(6);
      for (const id of p.sections.b) expect(item(id)).toMatchObject({ kind: 'short' });
      for (const id of p.sections.b) expect(item(id).caseStudyId).toBeUndefined();

      const cs = content.caseStudies.find((c) => c.id === p.caseStudyId)!;
      expect(cs).toBeDefined();
      expect(p.sections.c).toEqual(cs.questions.map((q) => q.id));
    }
  });

  it('sets five or six short answers covering all four areas, with the marks per question varying', () => {
    const counts = new Set<number>();
    const marks = new Set<number>();
    for (const seed of SEEDS) {
      const b = assemblePaper(content, 'full', seed).sections.b;
      counts.add(b.length);
      for (const id of b) marks.add(marksOf([id]));
      expect([5, 6]).toContain(b.length);
      const areas = b.map((id) => bucketOf(item(id).item.kk));
      expect(new Set(areas).size).toBe(4);
    }
    expect([...counts].sort()).toEqual([5, 6]);
    expect(marks.size).toBeGreaterThan(1);
  });

  it('spreads Section A across the areas and the PSM in line with their KK counts', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const counts: Record<string, number> = {};
      for (const id of assemblePaper(content, 'full', seed).sections.a) {
        const b = bucketOf(item(id).item.kk);
        counts[b] = (counts[b] ?? 0) + 1;
      }
      expect(counts).toEqual({ U3O1: 5, U3O2: 6, U4O1: 4, U4O2: 4, PSM: 1 });
    }
  });

  it('never sets two Section A questions from one near-identical group, and spreads them across KKs', () => {
    const groups = nearIdenticalGroups(content.mcq);
    for (const seed of SEEDS) {
      const a = assemblePaper(content, 'full', seed).sections.a;
      expect(new Set(a.map((id) => groups.get(id))).size).toBe(a.length);
      const kks = new Set(a.map((id) => item(id).item.kk[0]));
      expect(kks.size).toBeGreaterThanOrEqual(18);
    }
  });

  it('is deterministic for a seed and varies between seeds', () => {
    expect(assemblePaper(content, 'full', 1234)).toEqual(assemblePaper(content, 'full', 1234));
    expect(assemblePaper(content, 'mini', 1234)).toEqual(assemblePaper(content, 'mini', 1234));
    expect(assemblePaper(content, 'full', 1234).sections.a).not.toEqual(assemblePaper(content, 'full', 1235).sections.a);
    expect(assemblePaper(content, 'full', 1234).sections.b).not.toEqual(assemblePaper(content, 'full', 1235).sections.b);
  });
});

describe('mini paper assembly', () => {
  it('sets 10 MCQs, 1 short answer and a slice of 2 to 4 case study questions worth 10 to 15 marks', () => {
    for (const seed of SEEDS) {
      const p = assemblePaper(content, 'mini', seed);
      expect(p.sections.a).toHaveLength(10);
      expect(new Set(p.sections.a).size).toBe(10);
      expect(p.sections.b).toHaveLength(1);
      const cs = content.caseStudies.find((c) => c.id === p.caseStudyId)!;
      expect(p.sections.c.length).toBeGreaterThanOrEqual(2);
      expect(p.sections.c.length).toBeLessThanOrEqual(4);
      const ids = cs.questions.map((q) => q.id);
      for (const id of p.sections.c) expect(ids).toContain(id);
      // Kept in insert order.
      expect([...p.sections.c].sort((x, y) => ids.indexOf(x) - ids.indexOf(y))).toEqual(p.sections.c);
      const marks = marksOf(p.sections.c);
      expect(marks).toBeGreaterThanOrEqual(SLICE.minMarks);
      expect(marks).toBeLessThanOrEqual(SLICE.maxMarks);
    }
  });

  it('varies the slice with the seed', () => {
    const slices = new Set(SEEDS.map((seed) => assemblePaper(content, 'mini', seed).sections.c.join()));
    expect(slices.size).toBeGreaterThan(20);
  });
});

describe('apportioning Section A', () => {
  const all: Record<Bucket, number> = { U3O1: 99, U3O2: 99, U4O1: 99, U4O2: 99, PSM: 99, TERMS: 0 };

  it('shares slots by KK count, with at least one for every bucket that has questions', () => {
    expect(apportion(20, all)).toEqual({ U3O1: 5, U3O2: 6, U4O1: 4, U4O2: 4, PSM: 1, TERMS: 0 });
    expect(apportion(10, all)).toEqual({ U3O1: 2, U3O2: 3, U4O1: 2, U4O2: 2, PSM: 1, TERMS: 0 });
  });

  it('moves slots a thin bucket cannot fill to the others, and never exceeds what exists', () => {
    const thin = { ...all, U3O2: 2, PSM: 0 };
    const counts = apportion(20, thin);
    expect(counts.U3O2).toBe(2);
    expect(counts.PSM).toBe(0);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(20);
    expect(apportion(20, { ...all, U3O1: 1, U3O2: 1, U4O1: 1, U4O2: 1, PSM: 1 })).toEqual({ U3O1: 1, U3O2: 1, U4O1: 1, U4O2: 1, PSM: 1, TERMS: 0 });
    expect(apportion(3, all)).toEqual({ U3O1: 1, U3O2: 1, U4O1: 1, U4O2: 0, PSM: 0, TERMS: 0 });
  });
});

describe('near-identical questions', () => {
  it('groups questions that share most of their stem or three options on one KK', () => {
    const a = fxMcq('m-a', ['U3O1-KK04'], { stem: "Which data type best suits a customer's **phone number**?" });
    const b = fxMcq('m-b', ['U3O1-KK04'], { stem: 'Which data type best suits a phone number?', options: ['Integer', 'String', 'Boolean', 'Character'] });
    const c = fxMcq('m-c', ['U3O1-KK07'], { stem: 'The Account class hides balance. Which OOP concept is this?', options: ['Inheritance', 'Encapsulation', 'Generalisation', 'Abstraction'] });
    const d = fxMcq('m-d', ['U3O1-KK07'], { stem: 'A Vehicle class holds what Car and Truck share. Which concept?', options: ['Encapsulation', 'Instantiation', 'Inheritance', 'Generalisation'] });
    const e = fxMcq('m-e', ['U3O2-KK03'], { stem: 'What does a Gantt chart show about task dependencies?' });
    expect(nearIdentical(a, b)).toBe(true);
    expect(nearIdentical(c, d)).toBe(true);
    expect(nearIdentical(a, e)).toBe(false);
    const alpha = fxMcq('m-f', ['U4O1-KK06'], { stem: 'Which statement best describes alpha testing?' });
    const beta = fxMcq('m-g', ['U4O1-KK07'], { stem: 'Which statement best describes beta testing?', options: ['W', 'X', 'Y', 'Z'] });
    expect(nearIdentical(alpha, beta)).toBe(false);
    const groups = nearIdenticalGroups([a, b, c, d, e]);
    expect(groups.get('m-a')).toBe(groups.get('m-b'));
    expect(groups.get('m-c')).toBe(groups.get('m-d'));
    expect(new Set(groups.values()).size).toBe(3);
  });

  it('only relaxes the rule when the pool is too small to fill the section otherwise', () => {
    const twins = [
      fxMcq('m-u3o1-kk04-001', ['U3O1-KK04'], { stem: 'Which data type suits a phone number?' }),
      fxMcq('m-u3o1-kk04-002', ['U3O1-KK04'], { stem: 'Which data type suits a phone number here?' }),
      fxMcq('m-u3o2-kk03-001', ['U3O2-KK03'], { stem: 'What does the critical path show?' }),
    ];
    const two = pickSectionA(twins, 2, mulberry32(7)).map((m) => m.id);
    expect(two).toContain('m-u3o2-kk03-001');
    expect(pickSectionA(twins, 3, mulberry32(7))).toHaveLength(3);
  });
});

describe('Section B subset sum', () => {
  const sa = (id: string, marks: number, kk: KkId = 'U3O1-KK04'): ShortAnswer =>
    fxShort(id, [kk], { marks, points: [{ text: 'Point', marks }] });

  it('hits the total exactly, preferring about five questions', () => {
    const pool = [sa('s-1', 6), sa('s-2', 6), sa('s-3', 4), sa('s-4', 4), sa('s-5', 2), sa('s-6', 3), sa('s-7', 5)];
    const picked = pickShortMarks(pool, 20, 5);
    expect(picked.reduce((n, q) => n + q.marks, 0)).toBe(20);
    expect(picked).toHaveLength(5);
  });

  it('falls back to the nearest total below when no subset makes it', () => {
    const picked = pickShortMarks([sa('s-1', 3), sa('s-2', 3), sa('s-3', 3)], 20, 5);
    expect(picked.map((q) => q.id)).toEqual(['s-1', 's-2', 's-3']);
    expect(pickShortMarks([], 20, 5)).toEqual([]);
    expect(pickShortMarks([sa('s-1', 12), sa('s-2', 12)], 20, 5).map((q) => q.marks)).toEqual([12]);
  });

  it('takes one short answer from each area in turn, falling back to any subset that makes the total', () => {
    const areas = [sa('s-a1', 4, 'U3O1-KK01'), sa('s-b1', 4, 'U3O2-KK01'), sa('s-c1', 4, 'U4O1-KK01'), sa('s-d1', 4, 'U4O2-KK01'), sa('s-d2', 4, 'U4O2-KK02'), sa('s-a2', 4, 'U3O1-KK02')];
    const picked = pickSectionB(areas, 20, 5, mulberry32(11));
    expect(picked.reduce((n, q) => n + q.marks, 0)).toBe(20);
    expect(new Set(picked.map((q) => bucketOf(q.kk))).size).toBe(4);
    const lopsided = [sa('s-a1', 2, 'U3O1-KK01'), sa('s-b1', 6, 'U3O2-KK01'), sa('s-b2', 6, 'U3O2-KK02'), sa('s-b3', 6, 'U3O2-KK03')];
    expect(pickSectionB(lopsided, 20, 5, mulberry32(11)).reduce((n, q) => n + q.marks, 0)).toBe(20);

    const pool = [sa('s-a1', 4, 'U3O1-KK01'), sa('s-a2', 4, 'U3O1-KK02'), sa('s-b1', 4, 'U3O2-KK01'), sa('s-c1', 4, 'U4O1-KK01'), sa('s-d1', 4, 'U4O2-KK01'), sa('s-p1', 4, 'PSM')];
    const ordered = orderShorts(pool, mulberry32(3));
    expect(new Set(ordered.slice(0, 4).map((q) => bucketOf(q.kk))).size).toBe(4);
    expect(ordered[ordered.length - 1].id).toBe('s-p1');
  });
});

describe('Section C', () => {
  const cs = (id: string, marks: number[]): CaseStudy => {
    const base = fxCaseStudy(id);
    const questions = marks.map((m, i) =>
      m === 1 ? { ...fxMcq(`${id}-q${String(i + 1).padStart(2, '0')}`, ['U3O1-KK04']) } : { ...fxShort(`${id}-q${String(i + 1).padStart(2, '0')}`, ['U3O2-KK05'], { marks: m, points: [{ text: 'Point', marks: Math.min(m, 6) }, { text: 'Other', marks: Math.max(1, m - 6) }] }) },
    );
    return { ...base, questions, totalMarks: marks.reduce((a, b) => a + b, 0) };
  };

  it('rotates case studies by seed and skips the one sat last time when it can', () => {
    const list = [cs('cs-02', [5]), cs('cs-01', [5]), cs('cs-03', [5])];
    expect(chooseCaseStudy(list, 0)?.id).toBe('cs-01');
    expect(chooseCaseStudy(list, 1)?.id).toBe('cs-02');
    expect(chooseCaseStudy(list, 5)?.id).toBe('cs-03');
    expect(chooseCaseStudy(list, 0, ['cs-01'])?.id).toBe('cs-02');
    expect(chooseCaseStudy([list[1]], 0, ['cs-01'])?.id).toBe('cs-01');
    expect(chooseCaseStudy([], 0)).toBeNull();
  });

  it('slices 2 to 4 questions worth 10 to 15 marks, or the nearest to 12 when none fit', () => {
    const study = cs('cs-01', [3, 4, 3, 6, 3, 5, 7, 4]);
    for (let seed = 0; seed < 50; seed++) {
      const ids = sliceCaseStudy(study, mulberry32(seed));
      const marks = ids.reduce((n, id) => {
        const q = study.questions.find((c) => c.id === id)!;
        return n + ('marks' in q ? q.marks : 1);
      }, 0);
      expect(ids.length).toBeGreaterThanOrEqual(2);
      expect(ids.length).toBeLessThanOrEqual(4);
      expect(marks).toBeGreaterThanOrEqual(10);
      expect(marks).toBeLessThanOrEqual(15);
    }
    const tiny = cs('cs-02', [2, 2]);
    expect(sliceCaseStudy(tiny, mulberry32(1))).toEqual(['cs-02-q01', 'cs-02-q02']);
    const huge = cs('cs-03', [12, 12]);
    expect(sliceCaseStudy(huge, mulberry32(1))).toHaveLength(1);
  });
});

describe('thin content', () => {
  it('sets what exists without throwing', () => {
    const empty = assemblePaper({ mcq: [], short: [], caseStudies: [] }, 'full', 9);
    expect(empty).toEqual({ mode: 'full', seed: 9, sections: { a: [], b: [], c: [] }, caseStudyId: null });

    const mcq: Mcq[] = Array.from({ length: 5 }, (_, i) => fxMcq(`m-u3o1-kk0${i + 1}-001`, [`U3O1-KK0${i + 1}` as KkId], { stem: `Distinct stem number ${i} about topic ${'xyz'.repeat(i + 1)}` }));
    const short = [fxShort('s-u3o1-kk04-001', ['U3O1-KK04'], { marks: 3 })];
    const thin = assemblePaper({ mcq, short, caseStudies: [] }, 'full', 9);
    expect(thin.sections.a).toHaveLength(5);
    expect(thin.sections.b).toEqual(['s-u3o1-kk04-001']);
    expect(thin.caseStudyId).toBeNull();

    const mini = assemblePaper({ mcq, short, caseStudies: [fxCaseStudy()] }, 'mini', 9);
    expect(mini.sections.a).toHaveLength(5);
    expect(mini.caseStudyId).toBe('cs-01');
    expect(mini.sections.c).toEqual(['cs-01-q01', 'cs-01-q02']);
  });
});

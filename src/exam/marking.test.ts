import { describe, expect, it } from 'vitest';
import { fixtureIndex, fxCaseStudy, fxMcq, fxShort } from '../app/study/testing';
import { studyDesign } from '../content/studyDesign';
import type { ExamPaper } from './store';
import { FULL_TIMING } from './timer';
import { attemptsFor, markItem, markPaper, resolvePaper, sortKkTallies, summarise, weakestKks } from './marking';

const MIN = 60_000;
const T0 = Date.parse('2026-10-01T09:00:00+10:00');

const m1 = fxMcq('m-u3o1-kk04-001', ['U3O1-KK04']); // answer 2
const m2 = fxMcq('m-u3o2-kk03-001', ['U3O2-KK03', 'U3O1-KK04']);
const m3 = fxMcq('m-u4o2-kk05-001', ['U4O2-KK05']);
const s1 = fxShort('s-u3o1-kk04-001', ['U3O1-KK04'], { marks: 3 }); // four 1-mark points
const s2 = fxShort('s-u4o1-kk06-001', ['U4O1-KK06'], { marks: 2, points: [{ text: 'Names it', marks: 1 }, { text: 'Explains it', marks: 2 }] });
const cs = fxCaseStudy('cs-01'); // q01 MCQ (answer 2) on U3O1-KK04, q02 2 marks on U3O2-KK05
const content = fixtureIndex({ mcq: [m1, m2, m3], short: [s1, s2], caseStudies: [cs] });

function paper(overrides: Partial<ExamPaper> = {}): ExamPaper {
  return {
    id: 'p-abc-1',
    mode: 'full',
    seed: 1,
    sections: { a: [m1.id, m2.id, m3.id], b: [s1.id, s2.id], c: ['cs-01-q01', 'cs-01-q02'] },
    caseStudyId: 'cs-01',
    startedAt: T0,
    readingMs: FULL_TIMING.readingMs,
    writingMs: FULL_TIMING.writingMs,
    answers: {},
    flags: [],
    ticks: {},
    submittedAt: T0 + 100 * MIN,
    autoSubmitted: false,
    warned: [],
    at: { section: 'a', index: 0 },
    ...overrides,
  };
}

describe('marking one item', () => {
  it('marks an MCQ 1 or 0, and an unanswered one 0', () => {
    expect(markItem(m1, 'a', 2)).toMatchObject({ earned: 1, available: 1, answered: true, kind: 'mcq' });
    expect(markItem(m1, 'a', 0)).toMatchObject({ earned: 0, available: 1, answered: true });
    expect(markItem(m1, 'a', undefined)).toMatchObject({ earned: 0, available: 1, answered: false });
  });

  it('marks a written answer by its ticked points, capped at the marks available, and a blank one 0', () => {
    expect(markItem(s1, 'b', 'An answer', [0, 2])).toMatchObject({ earned: 2, available: 3, answered: true, kind: 'short' });
    expect(markItem(s1, 'b', 'An answer', [0, 1, 2, 3])).toMatchObject({ earned: 3, available: 3 });
    expect(markItem(s2, 'b', 'An answer', [1])).toMatchObject({ earned: 2, available: 2 });
    expect(markItem(s1, 'b', '   ', [0, 1])).toMatchObject({ earned: 0, answered: false });
  });
});

describe('marking a paper', () => {
  const p = paper({
    answers: { [m1.id]: 2, [m2.id]: 0, [s1.id]: 'Leading zeros', [s2.id]: 'Alpha testing', 'cs-01-q01': 2, 'cs-01-q02': 'Because' },
    ticks: { [s1.id]: [0, 1], [s2.id]: [0], 'cs-01-q02': [0, 1] },
  });
  const resolved = resolvePaper(p, content);
  const marks = markPaper(p, resolved);

  it('totals each section and the paper', () => {
    expect(resolved.missing).toEqual([]);
    expect(resolved.caseStudy?.id).toBe('cs-01');
    expect(marks.sections).toEqual({ a: [1, 3], b: [3, 5], c: [3, 3] });
    expect(marks.total).toEqual([7, 11]);
  });

  it('credits every KK an item is tagged with, and sorts KKs weakest first', () => {
    const byKk = Object.fromEntries(marks.byKk.map((t) => [t.kk, [t.earned, t.available]]));
    // U3O1-KK04: m1 1/1, m2 0/1, s1 2/3, cs-q01 1/1.
    expect(byKk['U3O1-KK04']).toEqual([4, 6]);
    expect(byKk['U3O2-KK03']).toEqual([0, 1]);
    expect(byKk['U4O2-KK05']).toEqual([0, 1]);
    expect(byKk['U4O1-KK06']).toEqual([1, 2]);
    expect(byKk['U3O2-KK05']).toEqual([2, 2]);
    expect(marks.byKk.map((t) => t.kk)).toEqual(['U3O2-KK03', 'U4O2-KK05', 'U4O1-KK06', 'U3O1-KK04', 'U3O2-KK05']);
  });

  it('names the weakest KKs, leaving out any with full marks', () => {
    expect(weakestKks(marks.byKk).map((t) => t.kk)).toEqual(['U3O2-KK03', 'U4O2-KK05', 'U4O1-KK06']);
    expect(weakestKks(marks.byKk, 10).map((t) => t.kk)).not.toContain('U3O2-KK05');
    expect(sortKkTallies([{ kk: 'U3O1-KK02', earned: 1, available: 2 }, { kk: 'U3O1-KK01', earned: 2, available: 4 }]).map((t) => t.kk)).toEqual([
      'U3O1-KK01',
      'U3O1-KK02',
    ]);
  });

  it('skips items that have left the content', () => {
    const gone = paper({ sections: { a: [m1.id, 'm-u3o1-kk99-001'], b: [], c: [] }, caseStudyId: null });
    const r = resolvePaper(gone, content);
    expect(r.missing).toEqual(['m-u3o1-kk99-001']);
    expect(markPaper(gone, r).sections.a).toEqual([0, 1]);
  });

  it('summarises the paper for history, with the time used', () => {
    const summary = summarise(p, marks, T0 + 110 * MIN);
    expect(summary).toMatchObject({
      id: 'p-abc-1',
      mode: 'full',
      caseStudyId: 'cs-01',
      submittedAt: T0 + 100 * MIN,
      markedAt: T0 + 110 * MIN,
      usedMs: 100 * MIN,
      allowedMs: 135 * MIN,
      autoSubmitted: false,
      sections: { a: [1, 3], b: [3, 5], c: [3, 3] },
    });
    expect(summary.kk[0]).toEqual(['U3O2-KK03', 0, 1]);
    // The KK map version the ids belong to, so a renumbering can rename them later.
    expect(summary.kkMap).toBe(studyDesign.kkMapVersion);
  });

  it('records every answered item: MCQs 0 or 1, written answers marks over marks available', () => {
    const attempts = attemptsFor(marks, 100 * MIN, T0 + 110 * MIN);
    // m3 was not answered.
    expect(attempts.map((a) => a.itemId)).toEqual([m1.id, m2.id, s1.id, s2.id, 'cs-01-q01', 'cs-01-q02']);
    expect(attempts.map((a) => a.score)).toEqual([1, 0, 2 / 3, 0.5, 1, 1]);
    expect(attempts.every((a) => a.timestamp === T0 + 110 * MIN)).toBe(true);
    // Time is shared by marks: 11 marks on the paper, so a 3-mark answer gets 3/11 of it.
    expect(attempts[2].ms).toBe(Math.round((100 * MIN * 3) / 11));
  });
});

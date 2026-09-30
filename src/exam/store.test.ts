import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ExamDataSchema,
  HISTORY_MAX,
  mergeExam,
  salvageExam,
  useExam,
  type ExamData,
  type ExamPaper,
  type ExamSummary,
  type NewPaper,
} from './store';
import { cleanAnswer, examActions } from './actions';
import { FULL_TIMING, MINI_TIMING } from './timer';

const MIN = 60_000;
const T0 = Date.parse('2026-10-01T09:00:00+10:00');
const WRITING = T0 + 20 * MIN;

const NEW: NewPaper = {
  mode: 'full',
  seed: 77,
  sections: { a: ['m-u3o1-kk04-001', 'm-u3o1-kk04-002'], b: ['s-u3o1-kk04-001'], c: ['cs-01-q01'] },
  caseStudyId: 'cs-01',
  timing: FULL_TIMING,
};

function summary(id: string, markedAt: number, overrides: Partial<ExamSummary> = {}): ExamSummary {
  return {
    id,
    mode: 'full',
    caseStudyId: 'cs-01',
    startedAt: markedAt - 200 * MIN,
    submittedAt: markedAt - 60 * MIN,
    markedAt,
    usedMs: 130 * MIN,
    allowedMs: 135 * MIN,
    autoSubmitted: false,
    sections: { a: [14, 20], b: [12, 20], c: [40, 60] },
    kk: [['U3O1-KK04', 2, 5]],
    ...overrides,
  };
}

function started(): ExamPaper {
  expect(examActions.start(NEW, T0)).toBe(true);
  return useExam.getState().paper!;
}

describe('exam store', () => {
  beforeEach(() => useExam.getState().reset());
  afterEach(() => useExam.getState().reset());

  it('starts a paper with its timing and refuses a second one while it is in progress', () => {
    const p = started();
    expect(p).toMatchObject({ mode: 'full', seed: 77, startedAt: T0, readingMs: 15 * MIN, writingMs: 120 * MIN, submittedAt: null, at: { section: 'a', index: 0 } });
    expect(p.id).toMatch(/^p-[a-z0-9]+-[a-z0-9]+$/);
    expect(ExamDataSchema.safeParse({ paper: p, history: [] }).success).toBe(true);
    expect(examActions.start({ ...NEW, seed: 78 }, T0 + 1)).toBe(false);
    expect(useExam.getState().paper?.seed).toBe(77);
  });

  it('locks answers during reading time and after submission, and saves them during writing', () => {
    started();
    const s = examActions;
    s.answer('s-u3o1-kk04-001', 'Too early', T0 + 5 * MIN);
    expect(useExam.getState().paper!.answers).toEqual({});
    s.answer('s-u3o1-kk04-001', 'Keeps the \u202eleading zero\u0007.\nLine two', WRITING);
    s.answer('m-u3o1-kk04-001', 3, WRITING);
    s.answer('m-u3o1-kk04-002', 7, WRITING);
    s.answer('m-not-on-paper-001', 1, WRITING);
    expect(useExam.getState().paper!.answers).toEqual({ 's-u3o1-kk04-001': 'Keeps the leading zero.\nLine two', 'm-u3o1-kk04-001': 3 });
    s.clearAnswer('m-u3o1-kk04-001', WRITING);
    expect(useExam.getState().paper!.answers).toEqual({ 's-u3o1-kk04-001': 'Keeps the leading zero.\nLine two' });
    s.submit(WRITING + MIN);
    s.answer('s-u3o1-kk04-001', 'Changed after submitting', WRITING + 2 * MIN);
    expect(useExam.getState().paper!.answers['s-u3o1-kk04-001']).toBe('Keeps the leading zero.\nLine two');
  });

  it('flags questions, remembers the position, and keeps track of warnings given', () => {
    started();
    const s = examActions;
    s.toggleFlag('m-u3o1-kk04-002');
    s.toggleFlag('cs-01-q01');
    s.toggleFlag('cs-01-q01');
    s.goTo('c', 5);
    s.noteWarned([30, 10]);
    s.noteWarned([10]);
    expect(useExam.getState().paper).toMatchObject({ flags: ['m-u3o1-kk04-002'], at: { section: 'c', index: 0 }, warned: [30, 10] });
  });

  it('submits during writing time only, and stamps an automatic submission at the end of writing', () => {
    started();
    examActions.submit(T0 + 5 * MIN);
    expect(useExam.getState().paper!.submittedAt).toBeNull();
    examActions.submit(T0 + 7 * 60 * MIN);
    expect(useExam.getState().paper).toMatchObject({ submittedAt: T0 + 135 * MIN, autoSubmitted: true });
  });

  it('takes marking-point ticks only after submission', () => {
    started();
    examActions.setTicks('s-u3o1-kk04-001', [1]);
    expect(useExam.getState().paper!.ticks).toEqual({});
    examActions.submit(WRITING);
    examActions.setTicks('s-u3o1-kk04-001', [2, 0, 2, -1, 99]);
    expect(useExam.getState().paper!.ticks).toEqual({ 's-u3o1-kk04-001': [0, 2] });
  });

  it('files marked papers in a short history and clears the paper', () => {
    const p = started();
    examActions.finish(summary(p.id, T0 + 3 * 60 * MIN));
    expect(useExam.getState().paper).toBeNull();
    for (let i = 0; i < HISTORY_MAX + 3; i++) examActions.finish(summary(`p-old${i}-1`, T0 + i * MIN));
    const h = useExam.getState().history;
    expect(h).toHaveLength(HISTORY_MAX);
    expect(h[h.length - 1].id).toBe(p.id);
    examActions.finish(summary('p-bad-1', T0, { sections: { a: [21, 20], b: [0, 20], c: [0, 60] } }));
    expect(useExam.getState().history.some((s) => s.id === 'p-bad-1')).toBe(false);
  });

  it('discards a paper without touching history', () => {
    started();
    examActions.finish(summary('p-keep-1', T0));
    examActions.start(NEW, T0 + MIN);
    examActions.discard();
    expect(useExam.getState()).toMatchObject({ paper: null, history: [expect.objectContaining({ id: 'p-keep-1' })] });
  });

  it('keeps line breaks in answers but strips control and direction characters', () => {
    expect(cleanAnswer('a\tb\nc\r\u0000d\u202ee\u200bf')).toBe('a\tb\ncdef');
    expect(cleanAnswer('x'.repeat(30_000))).toHaveLength(20_000);
  });
});

describe('exam schema, salvage and merge', () => {
  const base = (): ExamData => {
    useExam.getState().reset();
    examActions.start(NEW, T0);
    examActions.answer('s-u3o1-kk04-001', 'Mine', WRITING);
    return { paper: structuredClone(useExam.getState().paper!), history: [summary('p-one-1', T0 - 60 * MIN)] };
  };

  it('rejects stray answers, hostile text, out-of-range choices and impossible scores', () => {
    const ok = base();
    expect(ExamDataSchema.safeParse(ok).success).toBe(true);
    const stray = structuredClone(ok);
    stray.paper!.answers['m-elsewhere-001'] = 1;
    expect(ExamDataSchema.safeParse(stray).success).toBe(false);
    const hostile = structuredClone(ok);
    hostile.paper!.answers['s-u3o1-kk04-001'] = 'bad\u202etext';
    expect(ExamDataSchema.safeParse(hostile).success).toBe(false);
    const choice = structuredClone(ok);
    choice.paper!.answers['m-u3o1-kk04-001'] = 4;
    expect(ExamDataSchema.safeParse(choice).success).toBe(false);
    const extra = structuredClone(ok) as unknown as { paper: Record<string, unknown> };
    extra.paper.polluted = true;
    expect(ExamDataSchema.safeParse(extra).success).toBe(false);
    const score = structuredClone(ok);
    score.history[0].sections.a = [25, 20];
    expect(ExamDataSchema.safeParse(score).success).toBe(false);
    const twice = structuredClone(ok);
    twice.paper!.sections.b.push('m-u3o1-kk04-001');
    expect(ExamDataSchema.safeParse(twice).success).toBe(false);
  });

  it('salvages a paper with a damaged answer, and drops damaged history entries only', () => {
    const data = base() as unknown as { paper: ExamPaper; history: unknown[] };
    data.paper.answers['m-u3o1-kk04-001'] = 'bad\u0007';
    data.paper.flags.push('m-elsewhere-001');
    data.history.push({ id: 'nope' });
    const r = salvageExam(data)!;
    expect(r.data.paper?.answers).toEqual({ 's-u3o1-kk04-001': 'Mine' });
    expect(r.data.paper?.flags).toEqual([]);
    expect(r.data.history.map((h) => h.id)).toEqual(['p-one-1']);
    expect(r.dropped).toBe(3);
    const broken = salvageExam({ paper: { id: 42 }, history: [] })!;
    expect(broken.data.paper).toBeNull();
    expect(broken.dropped).toBe(1);
    expect(salvageExam('junk')).toBeUndefined();
  });

  it('merges another window: union of history, this window wins its unsaved answers on the same paper', () => {
    const mine = base();
    const theirs = structuredClone(mine);
    theirs.paper!.answers = { 'm-u3o1-kk04-002': 1, 's-u3o1-kk04-001': 'Old' };
    theirs.history = [summary('p-two-1', T0 - 30 * MIN)];
    const merged = mergeExam(mine, theirs);
    expect(merged.paper?.answers).toEqual({ 'm-u3o1-kk04-002': 1, 's-u3o1-kk04-001': 'Mine' });
    expect(merged.history.map((h) => h.id)).toEqual(['p-one-1', 'p-two-1']);

    // The other window marked the paper: it's gone here too.
    const marked = { paper: null, history: [summary(mine.paper!.id, T0 + 200 * MIN)] };
    expect(mergeExam(mine, marked).paper).toBeNull();
    // The other window started a newer paper.
    const newer = structuredClone(mine);
    newer.paper = { ...newer.paper!, id: 'p-newer-1', startedAt: T0 + MIN, answers: {} };
    expect(mergeExam(mine, newer).paper?.id).toBe('p-newer-1');
    // The earlier submission stands.
    const submitted = structuredClone(mine);
    submitted.paper!.submittedAt = WRITING;
    expect(mergeExam(mine, submitted).paper?.submittedAt).toBe(WRITING);
  });

  it('stores the mini timing with the paper', () => {
    useExam.getState().reset();
    examActions.start({ ...NEW, mode: 'mini', timing: MINI_TIMING }, T0);
    expect(useExam.getState().paper).toMatchObject({ mode: 'mini', readingMs: 3 * MIN, writingMs: 27 * MIN });
    useExam.getState().reset();
  });
});

describe('exam data in progress files', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  async function fresh() {
    vi.resetModules();
    const io = await import('../state/exportImport');
    const exam = await import('./store');
    const { examActions: actions } = await import('./actions');
    return { io, exam, actions };
  }

  it('exports, resets and imports the paper in progress and the history', async () => {
    const { io, exam, actions } = await fresh();
    actions.start(NEW, T0);
    actions.answer('s-u3o1-kk04-001', 'Kept through export', WRITING);
    actions.finish(summary('p-past-1', T0 - 60 * MIN));
    const file = io.buildExport(T0 + 30 * MIN);
    expect(file.stores.exam.v).toBe(1);
    const text = JSON.stringify(file);

    io.resetAllProgress();
    expect(exam.useExam.getState()).toMatchObject({ paper: null, history: [] });
    expect(window.localStorage.getItem('coldboot:v1:exam')).toBeNull();

    const parsed = io.parseImport(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) io.applyImport(parsed.file);
    expect(exam.useExam.getState().paper?.answers).toEqual({ 's-u3o1-kk04-001': 'Kept through export' });
    expect(exam.useExam.getState().history.map((h) => h.id)).toEqual(['p-past-1']);
    expect(JSON.parse(window.localStorage.getItem('coldboot:v1:exam')!)).toMatchObject({ v: 1, data: { history: [{ id: 'p-past-1' }] } });

    // Hostile exam data rejects the whole file; a file from before the exam store still imports.
    const hostile = structuredClone(file);
    (hostile.stores.exam.data as ExamData).paper!.answers['s-u3o1-kk04-001'] = 'x\u202ey';
    expect(io.parseImport(JSON.stringify(hostile))).toEqual({ ok: false, error: expect.stringMatching(/exam data is damaged/) });
    const older = structuredClone(file);
    delete (older.stores as Record<string, unknown>).exam;
    expect(io.parseImport(JSON.stringify(older)).ok).toBe(true);
  });
});

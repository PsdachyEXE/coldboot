import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = (name: string) => `coldboot:v1:${name}`;

function seed(name: string, value: unknown) {
  window.localStorage.setItem(KEY(name), JSON.stringify(value));
}

function stored(name: string): unknown {
  const raw = window.localStorage.getItem(KEY(name));
  return raw === null ? null : JSON.parse(raw);
}

const card = (due: number, last = 1) => ({ reps: 1, interval: 1, ease: 2.5, due, lapses: 0, last });

/** Fresh module graph so each store hydrates from the storage seeded for the test. */
async function freshState() {
  vi.resetModules();
  const srs = await import('./srs');
  const attempts = await import('./attempts');
  const session = await import('./session');
  const settings = await import('./settings');
  const storage = await import('./storage');
  const persist = await import('./persist');
  const record = await import('./record');
  const io = await import('./exportImport');
  return { srs, attempts, session, settings, storage, persist, record, io };
}

describe('persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('salvages valid records, quarantines the damaged original, warns, and never wipes good data', async () => {
    seed('srs', { v: 1, data: { cards: { 'c-good-001': card(1000), 'c-bad-002': { ...card(1000), ease: 0.2 } }, introduced: { day: '', count: 0 } } });
    const { srs, storage } = await freshState();
    expect(Object.keys(srs.useSrs.getState().cards)).toEqual(['c-good-001']);
    expect(stored('srs:quarantine')).not.toBeNull();
    expect(storage.useStorageHealth.getState().ok).toBe(false);

    srs.useSrs.getState().setCard('c-new-003', card(2000));
    vi.runAllTimers();
    const saved = stored('srs') as { data: { cards: Record<string, unknown> } };
    expect(Object.keys(saved.data.cards).sort()).toEqual(['c-good-001', 'c-new-003']);
  });

  it('accepts fractional due times from the scheduler', async () => {
    const { srs } = await freshState();
    expect(srs.useSrs.getState().setCard('c-frac-001', card(1234.5))).toBe(true);
    expect(srs.useSrs.getState().setCard('Bad Id', card(1))).toBe(false);
  });

  it('quarantines unparseable JSON instead of overwriting it silently', async () => {
    window.localStorage.setItem(KEY('session'), '{not json');
    const { session } = await freshState();
    expect(stored('session:quarantine')).toEqual({ unparseable: '{not json' });
    session.useSession.getState().pushHistory('help');
    vi.runAllTimers();
    expect((stored('session') as { data: { terminalHistory: string[] } }).data.terminalHistory).toEqual(['help']);
  });

  it('never loads or overwrites data saved by a newer build, and says so', async () => {
    seed('srs', { v: 99, data: { anything: true } });
    const { srs, storage } = await freshState();
    expect(storage.useStorageHealth.getState().reason).toMatch(/newer version/);
    srs.useSrs.getState().setCard('c-x-001', card(1));
    vi.runAllTimers();
    expect(stored('srs')).toEqual({ v: 99, data: { anything: true } });
  });

  it('merges attempts written by another window instead of overwriting them', async () => {
    const { attempts, persist } = await freshState();
    attempts.useAttempts.getState().record({ itemId: 'gen-sort', kk: ['U3O1-KK12'], score: 1, timestamp: 2_000_000_000_000, ms: 500 });
    // Another window saves its own attempt before this window's debounced write lands.
    const theirs = { v: 1, data: { log: [['m-other-001', ['U3O2-KK03'], 0, 1_999_999_000, 700]], rollup: {}, kkMap: 1 } };
    window.localStorage.setItem(KEY('attempts'), JSON.stringify(theirs));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY('attempts'), newValue: JSON.stringify(theirs), storageArea: window.localStorage }));
    expect(attempts.useAttempts.getState().log.map((t) => t[0])).toEqual(['m-other-001', 'gen-sort']);
    persist.flushAllPersisted();
    vi.runAllTimers();
    expect((stored('attempts') as { data: { log: unknown[] } }).data.log).toHaveLength(2);
  });

  it('rejects invalid attempts at the write boundary', async () => {
    const { record, attempts, session } = await freshState();
    expect(record.recordAttempt({ itemId: 'gen-x', kk: ['U3O1-KK4' as never], score: 1, timestamp: Date.now(), ms: 1 })).toBe(false);
    expect(record.recordAttempt({ itemId: 'gen-x', kk: ['U3O1-KK04'], score: Number.NaN, timestamp: Date.now(), ms: 1 })).toBe(false);
    expect(record.recordAttempt({ itemId: '<script>', kk: ['U3O1-KK04'], score: 1, timestamp: Date.now(), ms: 1 })).toBe(false);
    expect(attempts.useAttempts.getState().log).toHaveLength(0);
    expect(Object.keys(session.useSession.getState().activity)).toHaveLength(0);
    expect(record.recordAttempt({ itemId: 'gen-x', kk: ['U3O1-KK04', 'U3O1-KK04', 'PSM'], score: 1.7, timestamp: Date.now(), ms: Number.NaN })).toBe(true);
    const [t] = attempts.useAttempts.getState().log;
    expect(t[1]).toEqual(['U3O1-KK04', 'PSM']);
    expect(t[2]).toBe(1);
    expect(t[4]).toBe(0);
  });

  it('keeps only the first daily attempt and never overwrites a started record', async () => {
    const { session } = await freshState();
    const s = session.useSession.getState();
    expect(s.beginDaily('2026-10-02', ['a-1', 'a-2'])).not.toBeNull();
    s.recordDaily('2026-10-02', 0, true, 1);
    s.recordDaily('2026-10-02', 0, false, 2);
    expect(session.useSession.getState().beginDaily('2026-10-02', ['z-9'])?.itemIds).toEqual(['a-1', 'a-2']);
    expect(session.useSession.getState().daily['2026-10-02'].results).toEqual([1]);
    expect(s.beginDaily('not-a-date', ['a'])).toBeNull();
  });

  it('exports and re-imports every store, and rejects hostile or foreign files', async () => {
    const { io, record, settings } = await freshState();
    settings.useSettings.getState().setName('Mia');
    record.recordAttempt({ itemId: 'gen-sort', kk: ['U3O1-KK12'], score: 1, timestamp: 2_000_000_000_000, ms: 10 });
    const file = io.buildExport(2_000_000_000_000);
    expect(Object.keys(file.stores).sort()).toEqual(['attempts', 'exam', 'session', 'settings', 'srs']);
    const text = JSON.stringify(file);

    io.resetAllProgress();
    expect(settings.useSettings.getState().name).toBe('');
    const parsed = io.parseImport(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) io.applyImport(parsed.file);
    expect(settings.useSettings.getState().name).toBe('Mia');

    expect(io.parseImport('{oops').ok).toBe(false);
    expect(io.parseImport('x'.repeat(io.MAX_IMPORT_BYTES + 1))).toEqual({ ok: false, error: expect.stringMatching(/5 MB/) });
    expect(io.parseImport(JSON.stringify({ ...file, schema: 2 }))).toEqual({ ok: false, error: expect.stringMatching(/newer version/) });
    expect(io.parseImport(JSON.stringify({ app: 'other' })).ok).toBe(false);
    const hostile = structuredClone(file);
    (hostile.stores.settings.data as { name: string }).name = 'ab‮\ncd';
    expect(io.parseImport(JSON.stringify(hostile)).ok).toBe(false);
    const extra = structuredClone(file) as unknown as Record<string, unknown>;
    extra.__proto_pollution = { polluted: true };
    expect(io.parseImport(JSON.stringify(extra)).ok).toBe(false);
    const tooNew = structuredClone(file);
    tooNew.stores.srs.v = 7;
    expect(io.parseImport(JSON.stringify(tooNew))).toEqual({ ok: false, error: expect.stringMatching(/newer version/) });
  });

  it('rejects dates outside the range the app can show, on import, on load and when recording', async () => {
    const { io, record, attempts } = await freshState();
    record.recordAttempt({ itemId: 'gen-sort', kk: ['U3O1-KK12'], score: 1, timestamp: 2_000_000_000_000, ms: 10 });
    const file = io.buildExport(2_000_000_000_000);
    const summary = (at: number) => ({
      id: 'p-abc-1',
      mode: 'mini',
      caseStudyId: null,
      startedAt: at,
      submittedAt: at + 60_000,
      markedAt: at + 120_000,
      usedMs: 60_000,
      allowedMs: 60 * 60_000,
      autoSubmitted: false,
      sections: { a: [1, 2], b: [0, 0], c: [0, 0] },
      kk: [['U3O1-KK04', 1, 2]],
    });
    const withExam = (at: number) => {
      const f = structuredClone(file);
      f.stores.exam = { v: f.stores.exam.v, data: { paper: null, history: [summary(at)] } };
      return JSON.stringify(f);
    };
    const withAttemptAt = (seconds: number) => {
      const f = structuredClone(file);
      (f.stores.attempts.data as { log: unknown[] }).log.push(['gen-x', ['U3O1-KK04'], 1, seconds, 10]);
      return JSON.stringify(f);
    };
    const withDue = (due: number) => {
      const f = structuredClone(file);
      (f.stores.srs.data as { cards: Record<string, unknown> }).cards['c-u3o1-kk04-001'] = card(due);
      return JSON.stringify(f);
    };
    const damaged = (name: string) => ({ ok: false, error: `That file's ${name} data is damaged or has been edited, so nothing was imported.` });
    // A paper marked in the year 287,000; an attempt stamped in milliseconds where seconds belong; a card due in the year 10000.
    expect(io.parseImport(withExam(9e15))).toEqual(damaged('exam'));
    expect(io.parseImport(withAttemptAt(9e12))).toEqual(damaged('attempts'));
    expect(io.parseImport(withDue(Date.UTC(10000, 0, 5)))).toEqual(damaged('srs'));
    // The furthest a real schedule reaches (36,500 days from now) still loads.
    expect(io.parseImport(withExam(2_000_000_000_000)).ok).toBe(true);
    expect(io.parseImport(withDue(Date.UTC(2126, 0, 1))).ok).toBe(true);

    // At the write boundary, and when the same values are already in storage.
    expect(record.recordAttempt({ itemId: 'gen-x', kk: ['U3O1-KK04'], score: 1, timestamp: 9e15, ms: 1 })).toBe(false);
    expect(attempts.useAttempts.getState().log).toHaveLength(1);
    seed('srs', { v: 1, data: { cards: { 'c-good-001': card(1000), 'c-far-002': card(Date.UTC(10000, 0, 5)) }, introduced: { day: '', count: 0 } } });
    const again = await freshState();
    expect(Object.keys(again.srs.useSrs.getState().cards)).toEqual(['c-good-001']);
  });

  it("names the export file by the device's local date, not the UTC date", async () => {
    const { io } = await freshState();
    // Tests run in Australia/Melbourne: 8 am on 1 October is still 30 September in UTC.
    expect(io.exportFilename(Date.parse('2026-10-01T08:00:00+10:00'))).toBe('coldboot-progress-2026-10-01.json');
    // In daylight saving, 9 am on New Year's Day is still the previous year in UTC.
    expect(io.exportFilename(Date.parse('2027-01-01T09:00:00+11:00'))).toBe('coldboot-progress-2027-01-01.json');
  });
});

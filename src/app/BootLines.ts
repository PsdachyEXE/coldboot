/**
 * The boot sequence's POST-style lines, built only from real data: the build id, the KK map, the
 * content status, reviews due and the time to the exam. Nothing here is decorative filler.
 */
import { AREA_IDS, type AreaId } from '../content/schema';
import { countdown, examPhase, formatCountdown } from '../lib/time';

export type BootMode = 'full' | 'condensed';

export interface BootData {
  buildId: string;
  /** KK count per area, in study-design order. */
  kkCounts: Record<AreaId, number>;
  /** How many KKs are still provisional (not yet checked against the study design). */
  provisional: number;
  content: { status: 'idle' | 'loading' | 'ready' | 'error'; cards: number; questions: number };
  due: number;
  now: number;
  /** Exam start, epoch ms. */
  examAt: number;
}

export interface BootLine {
  key: string;
  /** Left column, e.g. "U3O1". */
  label: string;
  /** Middle text, e.g. "14 key knowledge points". */
  detail: string;
  /** Right-hand result, e.g. "ok". */
  result?: string;
}

const examTimeFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

const shortExamTimeFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

/** "Fri 13 Nov 2026, 3:00 pm AEDT": the exam's Melbourne time. */
export function formatExamTime(examAt: number): string {
  return examTimeFormatter.format(new Date(examAt)).replace(/^(\w{3}),/, '$1');
}

/** "13 Nov, 3:00 pm AEDT": the same, short enough for one line on a 360 px phone. */
export function formatExamTimeShort(examAt: number): string {
  return shortExamTimeFormatter.format(new Date(examAt));
}

export interface BootOptions {
  /** Phones: shorter wording so every line fits one row at 360 px. */
  narrow?: boolean;
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('en-AU')} ${n === 1 ? one : many}`;
}

function contentLine(c: BootData['content'], narrow: boolean): BootLine {
  if (c.status === 'ready') {
    const questions = narrow ? plural(c.questions, 'Q', 'Qs') : plural(c.questions, 'question', 'questions');
    return { key: 'content', label: 'content', detail: `${plural(c.cards, 'card', 'cards')}, ${questions}`, result: 'ok' };
  }
  if (c.status === 'error') return { key: 'content', label: 'content', detail: 'not loaded, check your connection' };
  return { key: 'content', label: 'content', detail: 'loading' };
}

function examLines(d: BootData, narrow: boolean): BootLine[] {
  const phase = examPhase(d.now, d.examAt);
  const when = { key: 'exam-at', label: '', detail: narrow ? formatExamTimeShort(d.examAt) : formatExamTime(d.examAt) };
  if (phase === 'before') return [{ key: 'exam', label: 'exam', detail: `${formatCountdown(countdown(d.now, d.examAt))} to go` }, when];
  if (phase === 'finished') return [{ key: 'exam', label: 'exam', detail: 'finished' }, when];
  return [{ key: 'exam', label: 'exam', detail: 'underway' }, when];
}

export function bootLines(d: BootData, mode: BootMode, opts: BootOptions = {}): BootLine[] {
  const narrow = opts.narrow ?? false;
  const build: BootLine = { key: 'build', label: 'COLDBOOT', detail: `build ${d.buildId}` };
  const reviews: BootLine = { key: 'reviews', label: 'reviews', detail: d.due === 0 ? 'none due' : `${d.due.toLocaleString('en-AU')} due` };
  const ready: BootLine = { key: 'ready', label: 'ready', detail: '' };
  if (mode === 'condensed') return [build, reviews, examLines(d, narrow)[0], ready];
  const areas = AREA_IDS.map<BootLine>((area) => ({
    key: area,
    label: area,
    detail: narrow ? plural(d.kkCounts[area] ?? 0, 'KK point', 'KK points') : plural(d.kkCounts[area] ?? 0, 'key knowledge point', 'key knowledge points'),
    result: (d.kkCounts[area] ?? 0) > 0 ? 'ok' : 'missing',
  }));
  const map: BootLine =
    d.provisional > 0
      ? { key: 'map', label: 'kk map', detail: 'provisional, see About' }
      : { key: 'map', label: 'kk map', detail: 'checked', result: 'ok' };
  return [build, ...areas, map, contentLine(d.content, narrow), reviews, ...examLines(d, narrow), ready];
}

/** The same lines as plain text, one per line (used by tests and for copying). */
export function bootText(lines: readonly BootLine[]): string {
  return lines.map((l) => [l.label.padEnd(9), l.detail, l.result ? `  ${l.result}` : ''].join('').trimEnd()).join('\n');
}

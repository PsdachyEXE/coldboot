/**
 * The boot sequence's POST-style lines, built only from real data: the build id, the KK map, the
 * content status, reviews due and the time to the exam. Nothing here is decorative filler.
 *
 * On exam day the exam line gives the hours and minutes left, rounded down as Home and the status
 * bar round them; during the exam it wishes the student luck and drops the reviews line, so nothing
 * asks for study; afterwards it says the exam is over and the reviews line notes that the exam caps
 * have lifted.
 */
import { AREA_IDS, type AreaId } from '../content/schema';
import { countdown, examDayState, formatCountdown, formatTimeLeftShort } from '../lib/time';

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
  const state = examDayState(d.now, d.examAt);
  const when = { key: 'exam-at', label: '', detail: narrow ? formatExamTimeShort(d.examAt) : formatExamTime(d.examAt) };
  if (state === 'study') return [{ key: 'exam', label: 'exam', detail: `${formatCountdown(countdown(d.now, d.examAt))} to go` }, when];
  if (state === 'exam-day') return [{ key: 'exam', label: 'exam', detail: `today, ${formatTimeLeftShort(d.now, d.examAt)} to go` }, when];
  if (state === 'underway') return [{ key: 'exam', label: 'exam', detail: 'underway, good luck' }, when];
  return [{ key: 'exam', label: 'exam', detail: 'over, well done' }, when];
}

function reviewsLine(d: BootData, narrow: boolean): BootLine | null {
  const state = examDayState(d.now, d.examAt);
  // No study nags while the exam is on.
  if (state === 'underway') return null;
  const due = d.due === 0 ? 'none due' : `${d.due.toLocaleString('en-AU')} due`;
  const lifted = state === 'over' ? (narrow ? ', caps lifted' : ', exam caps lifted') : '';
  return { key: 'reviews', label: 'reviews', detail: `${due}${lifted}` };
}

export function bootLines(d: BootData, mode: BootMode, opts: BootOptions = {}): BootLine[] {
  const narrow = opts.narrow ?? false;
  const build: BootLine = { key: 'build', label: 'COLDBOOT', detail: `build ${d.buildId}` };
  const reviews = reviewsLine(d, narrow);
  const study = reviews ? [reviews] : [];
  const ready: BootLine = { key: 'ready', label: 'ready', detail: '' };
  if (mode === 'condensed') return [build, ...study, examLines(d, narrow)[0], ready];
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
  return [build, ...areas, map, contentLine(d.content, narrow), ...study, ...examLines(d, narrow), ready];
}

/** The same lines as plain text, one per line (used by tests and for copying). */
export function bootText(lines: readonly BootLine[]): string {
  return lines.map((l) => [l.label.padEnd(9), l.detail, l.result ? `  ${l.result}` : ''].join('').trimEnd()).join('\n');
}

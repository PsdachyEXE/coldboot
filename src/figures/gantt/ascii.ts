/**
 * Plain-text Gantt chart for the terminal (a `pre` block). ASCII only, so it survives copying
 * into any editor. Critical tasks are marked twice: a `*` before the row and `#` bars instead of
 * `=`, so the chart never relies on colour.
 *
 *   Task                  Days  Slack  1   5    10
 *                                      +---+----+-
 *   * A Plan                 2      0  ##
 *     B Build UI             3      2    ===..
 */
import type { Schedule, ScheduleTask } from './schedule';

export interface AsciiGanttTask extends ScheduleTask {
  name?: string;
  milestone?: boolean;
}

export interface AsciiGanttOptions {
  /** Unit name for the header and scale (default `day`). */
  unit?: 'day' | 'week';
  /** Mark critical tasks (default true). Turn off while a game asks for the critical path. */
  showCritical?: boolean;
  /** Show the slack column and slack dots (default: same as showCritical). */
  showSlack?: boolean;
  /** Widest chart in columns; longer projects put several units in a column (default 60). */
  maxColumns?: number;
  /** Width of the task column (default 24). */
  nameWidth?: number;
}

const BAR_CRITICAL = '#';
const BAR_OTHER = '=';
const SLACK = '.';
const MILESTONE = 'M';

function plural(unit: 'day' | 'week', n: number): string {
  return n === 1 ? unit : `${unit}s`;
}

function fit(text: string, width: number): string {
  return text.length <= width ? text.padEnd(width) : `${text.slice(0, Math.max(0, width - 3))}...`;
}

/** Replaces anything outside printable ASCII so the chart stays ASCII. */
function ascii(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?');
}

/** Draws `tasks` (in their given order) on the schedule computed for them. */
export function asciiGantt(tasks: readonly AsciiGanttTask[], schedule: Schedule, opts: AsciiGanttOptions = {}): string {
  const unit = opts.unit ?? 'day';
  const showCritical = opts.showCritical ?? true;
  const showSlack = opts.showSlack ?? showCritical;
  const nameWidth = opts.nameWidth ?? 24;
  const maxColumns = Math.max(10, opts.maxColumns ?? 60);
  const total = Math.max(1, schedule.duration);
  const per = Math.ceil(total / maxColumns);
  const columns = Math.ceil(total / per);
  const unitHeader = unit === 'day' ? 'Days' : 'Weeks';
  const durWidth = unitHeader.length;

  // Column c (0-based) covers units c*per+1 to (c+1)*per. Every fifth column is labelled with the
  // last unit it covers (5, 10, 15, ... at one unit per column), and the first column with 1.
  const labelled = (c: number) => c === 0 || (c + 1) % 5 === 0;
  let numbers = '';
  let ruler = '';
  for (let c = 0; c < columns; c++) {
    if (labelled(c) && numbers.length <= c) numbers = numbers.padEnd(c) + String(c === 0 ? 1 : (c + 1) * per);
    ruler += labelled(c) ? '+' : '-';
  }

  const mark = showCritical ? 2 : 0;
  const lead = (m: string, name: string, dur: string, slack: string) =>
    `${showCritical ? m.padEnd(mark) : ''}${fit(name, nameWidth)}  ${dur.padStart(durWidth)}${showSlack ? `  ${slack.padStart(5)}` : ''}  `;
  const head = lead('', 'Task', unitHeader, 'Slack');
  const lines = [(head + numbers).trimEnd(), (' '.repeat(head.length) + ruler).trimEnd()];

  let anyMilestone = false;
  let anyCritical = false;
  let anySlack = false;
  let anyOther = false;
  for (const t of tasks) {
    const timing = schedule.byId[t.id];
    if (!timing) continue;
    const critical = showCritical && timing.critical;
    const cells = new Array<string>(columns).fill(' ');
    const startCol = Math.floor(timing.earliestStart / per);
    const endCol = Math.ceil(timing.earliestFinish / per);
    for (let c = startCol; c < endCol && c < columns; c++) cells[c] = critical ? BAR_CRITICAL : BAR_OTHER;
    if (timing.duration > 0) {
      if (critical) anyCritical = true;
      else anyOther = true;
    }
    if (showSlack && timing.slack > 0) {
      const slackEnd = Math.ceil(timing.latestFinish / per);
      for (let c = endCol; c < slackEnd && c < columns; c++) cells[c] = SLACK;
      anySlack = true;
    }
    if (t.milestone || timing.duration === 0) {
      // A milestone happens at the end of the unit before it: the column of its finish.
      cells[Math.min(columns - 1, Math.max(0, endCol - 1))] = MILESTONE;
      anyMilestone = true;
    }
    const name = ascii(t.name && t.name !== t.id ? `${t.id} ${t.name}` : t.id);
    const row = lead(critical ? '*' : '', name, String(timing.duration), String(timing.slack)) + cells.join('');
    lines.push(row.trimEnd());
  }

  const key: string[] = [];
  if (anyCritical) key.push(`* and ${BAR_CRITICAL} critical task`);
  if (anyOther || !showCritical) key.push(`${BAR_OTHER} ${showCritical ? 'other task' : 'task'}`);
  if (anySlack) key.push(`${SLACK} slack`);
  if (anyMilestone) key.push(`${MILESTONE} milestone`);
  lines.push('');
  lines.push(`Scale: 1 column = ${per} ${plural(unit, per)}.${key.length ? ` Key: ${key.join(', ')}.` : ''}`);
  return lines.join('\n');
}

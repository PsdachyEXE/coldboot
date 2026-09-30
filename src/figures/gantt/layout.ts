/**
 * Layout for the SVG Gantt chart. Gantt figures carry no coordinates: rows follow the task order,
 * and bars sit on a unit axis at the earliest start computed by computeSchedule.
 *
 * Columns, left to right: task id and name, duration, "Depends on", then the chart, one column
 * per day or week, numbered from 1. A task with earliest start 2 and duration 3 fills columns 3
 * to 5. A milestone is a diamond on the boundary where it happens.
 *
 * The compact layout, for boxes too narrow for all of that (phones, the case study insert), keeps
 * only the task ids beside the bars and sizes the day columns to fit `fitWidth`; the names,
 * durations and dependencies go in a table under the chart instead.
 */
import type { Gantt, GanttTask } from '../../content/schema';
import { LABEL_SIZE, LINE_HEIGHT, textWidth, wrapText } from '../text';
import type { Schedule, TaskTiming } from './schedule';

export const PAD = 16;
export const HEADER_UNIT_Y = 24;
export const HEADER_Y = 48;
export const HEADER_BOTTOM = 62;
export const BAR_HEIGHT = 16;
export const DIAMOND = 8;
const MIN_ROW = 36;
/** The narrowest day or week column the compact layout uses before it lets the box scroll. */
const MIN_COMPACT_UNIT = 8;
const GAP = 12;
const DURATION_W = 64;
const CRITICAL_ROOM = 84;
const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

export interface GanttRow {
  task: GanttTask;
  timing: TaskTiming;
  top: number;
  height: number;
  cy: number;
  nameLines: string[];
  depsLines: string[];
  /** The bar, absent for a zero-duration milestone. */
  bar: { x: number; w: number } | null;
  /** Centre of the milestone diamond. */
  diamondX: number | null;
  /** Critical and marked as such (only when the figure shows the critical path). */
  critical: boolean;
  /** Right end of the slack line (only when the figure shows the critical path). */
  slackTo: number | null;
  /** Where the word "critical" starts. */
  criticalX: number;
}

export interface GanttLayoutOptions {
  /** Ids beside the bars only, with day columns sized to fit `fitWidth`. */
  compact?: boolean;
  /** The width available, in pixels (compact layout only). */
  fitWidth?: number;
}

export interface GanttLayout {
  compact: boolean;
  width: number;
  height: number;
  idX: number;
  nameX: number;
  durationX: number;
  depsX: number;
  plotX: number;
  plotW: number;
  unitW: number;
  columns: number;
  ticks: { x: number; label: string }[];
  rows: GanttRow[];
  anyMilestone: boolean;
  anySlack: boolean;
  anyCritical: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function unitHeader(unit: Gantt['unit']): string {
  return unit === 'day' ? 'Days' : 'Weeks';
}

export function layoutGantt(f: Gantt, schedule: Schedule, opts: GanttLayoutOptions = {}): GanttLayout {
  const show = f.showCriticalPath ?? false;
  const compact = opts.compact ?? false;
  const idW = Math.max(textWidth('Task', LABEL_SIZE, true), ...f.tasks.map((t) => textWidth(t.id, LABEL_SIZE, true))) + GAP;
  const nameW = compact ? 0 : clamp(Math.max(textWidth('Task', LABEL_SIZE, true), ...f.tasks.map((t) => textWidth(t.name))) + 8, 120, 200);
  const depsText = (t: GanttTask) => t.dependsOn.join(', ');
  const depsW = compact ? 0 : clamp(Math.max(textWidth('Depends on', LABEL_SIZE, true), ...f.tasks.map((t) => textWidth(depsText(t)))) + 2 * GAP, 96, 150);

  const idX = PAD;
  const nameX = idX + idW;
  const durationX = nameX + nameW + GAP + DURATION_W / 2;
  const depsX = nameX + nameW + GAP + DURATION_W + GAP;
  const plotX = compact ? idX + idW : depsX + depsW;
  const columns = Math.max(1, schedule.duration);
  const tail = show ? CRITICAL_ROOM : PAD;
  const unitW =
    compact && opts.fitWidth
      ? clamp(Math.floor((opts.fitWidth - plotX - tail) / columns), MIN_COMPACT_UNIT, 48)
      : clamp(Math.round(440 / columns), 18, 48);
  const plotW = columns * unitW;
  const width = plotX + plotW + tail;

  const labelRoom = textWidth(String(columns)) + 8;
  const step = TICK_STEPS.find((s) => s * unitW >= labelRoom) ?? 100;
  const ticks: GanttLayout['ticks'] = [];
  for (let k = 1; k <= columns; k++) {
    if (k % step === 0 || (step === 1 && k === 1)) ticks.push({ x: plotX + (k - 0.5) * unitW, label: String(k) });
  }

  const xAt = (t: number) => plotX + t * unitW;
  let y = HEADER_BOTTOM;
  let anyMilestone = false;
  let anySlack = false;
  let anyCritical = false;
  const rows = f.tasks.map((task): GanttRow => {
    const timing = schedule.byId[task.id];
    const nameLines = compact ? [] : wrapText(task.name, nameW - 8);
    const depsLines = compact ? [] : wrapText(depsText(task), depsW - GAP);
    const height = Math.max(MIN_ROW, Math.max(nameLines.length, depsLines.length) * LINE_HEIGHT + GAP);
    const top = y;
    y += height;
    const milestone = task.milestone === true || task.duration === 0;
    anyMilestone ||= milestone;
    const bar = task.duration > 0 ? { x: xAt(timing.earliestStart), w: task.duration * unitW } : null;
    const diamondX = milestone ? xAt(timing.earliestFinish) : null;
    const critical = show && timing.critical;
    anyCritical ||= critical;
    const slackTo = show && timing.slack > 0 ? xAt(timing.latestFinish) : null;
    anySlack ||= slackTo !== null;
    const end = diamondX !== null ? diamondX + DIAMOND : xAt(timing.earliestFinish);
    return { task, timing, top, height, cy: top + height / 2, nameLines, depsLines, bar, diamondX, critical, slackTo, criticalX: end + 8 };
  });

  return {
    compact,
    width,
    height: y + PAD / 2,
    idX,
    nameX,
    durationX,
    depsX,
    plotX,
    plotW,
    unitW,
    columns,
    ticks,
    rows,
    anyMilestone,
    anySlack,
    anyCritical,
  };
}

/**
 * Plain SVG charts for the Stats screen (no chart library). Each chart is drawn at the pixel width
 * of its box, so text stays 14 px at every width instead of shrinking with a viewBox. Marks use the
 * palette tokens through CSS classes; no colour carries meaning on its own: a chart has one data
 * series, and the only split (cards due now) is a hatched pattern with a legend in words.
 *
 * The SVGs are images (`role="img"` with a one-line summary). The numbers behind every chart are in
 * a "Show data" table beside it, and each mark has a hover title as well.
 */
import { useId, type ReactNode } from 'react';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { niceTicks } from './aggregate';
import styles from './Stats.module.css';
import { useWidth } from './useWidth';

/** Approximate advance of a 14 px character, for keeping labels inside the chart. */
const CHAR_W = 7.6;
/** Columns are never thicker than this (they don't fill their slot). */
const MAX_COLUMN = 24;

function textWidth(text: string): number {
  return text.length * CHAR_W;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** A column with a flat base and a 4 px rounded top (square when too short to round). */
function columnPath(x: number, w: number, base: number, top: number, rounded: boolean): string {
  const h = base - top;
  const r = rounded ? Math.min(4, w / 2, h) : 0;
  if (r <= 0) return `M${x},${base}V${top}H${x + w}V${base}Z`;
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}

/** A 45° hatch in phosphor on the page background: the "due now" part of the forecast. */
export function HatchPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" className={styles.hatchBg} />
      <rect width="3" height="6" className={styles.hatchInk} />
    </pattern>
  );
}

/** A legend swatch drawn with the chart's own fills. */
export function Swatch({ kind }: { kind: 'solid' | 'hatched' }) {
  const id = `sw${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  return (
    <svg width="16" height="16" aria-hidden="true" focusable="false" className={styles.swatch}>
      {kind === 'hatched' ? (
        <>
          <defs>
            <HatchPattern id={id} />
          </defs>
          <rect x="1" y="1" width="14" height="14" fill={`url(#${id})`} />
        </>
      ) : (
        <rect x="1" y="1" width="14" height="14" className={styles.mark} />
      )}
    </svg>
  );
}

export interface Column {
  key: string;
  value: number;
  /** The bottom part of the column drawn hatched (cards due now). */
  hatched?: number;
  /** Hover text for the column, e.g. "30 Sep: 12 reviews". */
  title: string;
}

export interface ColumnChartProps {
  columns: readonly Column[];
  /** Tick labels on the day axis, by column index. */
  ticks: ReadonlyMap<number, string>;
  /** Value axis name, shown above the axis ("Reviews"). */
  yLabel: string;
  /** Day axis name, shown under the ticks ("Study day"). */
  xLabel: string;
  /** One-sentence summary read by screen readers. */
  summary: string;
  /** Formats a value for the axis and the direct labels. */
  format?: (v: number) => string;
  /** Columns whose value is printed on the cap. Defaults to the tallest. */
  labelled?: readonly number[];
  height?: number;
}

export function ColumnChart({ columns, ticks, yLabel, xLabel, summary, format = String, labelled, height = 200 }: ColumnChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const hatchId = `h${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const max = Math.max(0, ...columns.map((c) => c.value));
  const yTicks = niceTicks(max);
  const top = yTicks[yTicks.length - 1];
  const tickW = Math.max(...yTicks.map((t) => textWidth(format(t))));
  const left = Math.ceil(tickW) + 10;
  const right = 8;
  const padTop = 44;
  const padBottom = 52;
  const plotH = height - padTop - padBottom;
  const base = padTop + plotH;
  const slot = (width - left - right) / Math.max(1, columns.length);
  const barW = clamp(slot * 0.7, 3, MAX_COLUMN);
  const y = (v: number) => base - (top > 0 ? (v / top) * plotH : 0);
  const cx = (i: number) => left + slot * i + slot / 2;

  const tallest = columns.reduce((best, c, i) => (c.value > (columns[best]?.value ?? -1) ? i : best), 0);
  const labels = (labelled ?? (max > 0 ? [tallest] : [])).filter((i) => (columns[i]?.value ?? 0) > 0);
  // Drop a label that would sit on top of an earlier one.
  const shown: number[] = [];
  for (const i of labels) {
    const w = textWidth(format(columns[i].value));
    if (shown.every((j) => Math.abs(cx(i) - cx(j)) > (w + textWidth(format(columns[j].value))) / 2 + 6)) shown.push(i);
  }

  return (
    <div ref={ref} className={styles.chartBox}>
      <svg width={width} height={height} role="img" aria-label={summary} className={styles.chart} focusable="false">
        <defs>
          <HatchPattern id={hatchId} />
        </defs>
        <text x={0} y={16} className={styles.axisName}>
          {yLabel}
        </text>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.baseline : styles.grid} />
            <text x={left - 8} y={y(t)} dy="0.35em" textAnchor="end" className={styles.tick}>
              {format(t)}
            </text>
          </g>
        ))}
        {columns.map((c, i) => {
          const x = cx(i) - barW / 2;
          const hatched = Math.min(c.hatched ?? 0, c.value);
          const solidTop = y(c.value);
          const hatchTop = y(hatched);
          const solidBase = hatched > 0 ? hatchTop - 2 : base;
          return (
            <g key={c.key}>
              {hatched > 0 ? <path d={columnPath(x, barW, base, hatchTop, hatched === c.value)} fill={`url(#${hatchId})`} /> : null}
              {c.value > hatched && solidBase - solidTop >= 1 ? (
                <path d={columnPath(x, barW, solidBase, solidTop, true)} className={styles.mark} />
              ) : null}
              <rect x={left + slot * i} y={padTop} width={slot} height={plotH} className={styles.hit}>
                <title>{c.title}</title>
              </rect>
            </g>
          );
        })}
        {shown.map((i) => {
          const text = format(columns[i].value);
          const w = textWidth(text);
          return (
            <text key={`v${i}`} x={clamp(cx(i), left + w / 2, width - w / 2)} y={y(columns[i].value) - 8} textAnchor="middle" className={styles.value}>
              {text}
            </text>
          );
        })}
        {[...ticks].map(([i, label]) => {
          const w = textWidth(label);
          return (
            <g key={`t${i}`}>
              <line x1={cx(i)} x2={cx(i)} y1={base} y2={base + 5} className={styles.baseline} />
              <text x={clamp(cx(i), w / 2, width - w / 2)} y={base + 22} textAnchor="middle" className={styles.tick}>
                {label}
              </text>
            </g>
          );
        })}
        <text x={left + (width - left - right) / 2} y={height - 6} textAnchor="middle" className={styles.axisName}>
          {xLabel}
        </text>
      </svg>
    </div>
  );
}

export interface LinePoint {
  key: string;
  /** 0 to 100, or null for a day without data (a gap). */
  value: number | null;
  title: string;
}

export interface LineChartProps {
  points: readonly LinePoint[];
  ticks: ReadonlyMap<number, string>;
  yLabel: string;
  summary: string;
  height?: number;
}

/**
 * A 0 to 100% line with a dot on every day that has data. Days without data break the line, so a
 * gap never reads as zero, and a lone day still shows as a dot.
 */
export function PercentLine({ points, ticks, yLabel, summary, height = 150 }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const yTicks = [0, 50, 100];
  const left = Math.ceil(textWidth('100%')) + 10;
  const right = 8;
  const padTop = 36;
  const padBottom = 30;
  const plotH = height - padTop - padBottom;
  const base = padTop + plotH;
  const slot = (width - left - right) / Math.max(1, points.length);
  const y = (v: number) => base - (v / 100) * plotH;
  const cx = (i: number) => left + slot * i + slot / 2;

  const runs: string[] = [];
  let run: string[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (run.length > 1) runs.push(run.join(' '));
      run = [];
    } else {
      run.push(`${run.length ? 'L' : 'M'}${cx(i).toFixed(1)},${y(p.value).toFixed(1)}`);
    }
  });
  if (run.length > 1) runs.push(run.join(' '));

  return (
    <div ref={ref} className={styles.chartBox}>
      <svg width={width} height={height} role="img" aria-label={summary} className={styles.chart} focusable="false">
        <text x={0} y={16} className={styles.axisName}>
          {yLabel}
        </text>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.baseline : styles.grid} />
            <text x={left - 8} y={y(t)} dy="0.35em" textAnchor="end" className={styles.tick}>
              {t}%
            </text>
          </g>
        ))}
        {runs.map((d, i) => (
          <path key={i} d={d} className={styles.line} />
        ))}
        {points.map((p, i) =>
          p.value === null ? null : (
            <g key={p.key}>
              <circle cx={cx(i)} cy={y(p.value)} r={4} className={styles.dot} />
              <rect x={left + slot * i} y={padTop - 6} width={slot} height={plotH + 12} className={styles.hit}>
                <title>{p.title}</title>
              </rect>
            </g>
          ),
        )}
        {[...ticks].map(([i, label]) => {
          const w = textWidth(label);
          return (
            <g key={`t${i}`}>
              <line x1={cx(i)} x2={cx(i)} y1={base} y2={base + 5} className={styles.baseline} />
              <text x={clamp(cx(i), w / 2, width - w / 2)} y={base + 22} textAnchor="middle" className={styles.tick}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface BarScaleProps {
  width: number;
}

/** The shared 0 to 100% scale over the weakest list's bars. */
export function PercentScale({ width }: BarScaleProps) {
  const ticks = [0, 25, 50, 75, 100];
  return (
    <svg width={width} height={24} aria-hidden="true" focusable="false" className={styles.chart}>
      {ticks.map((t) => {
        const x = 1 + (t / 100) * (width - 2);
        const label = `${t}%`;
        const w = textWidth(label);
        return (
          <g key={t}>
            <text x={clamp(x, w / 2, width - w / 2)} y={14} textAnchor="middle" className={styles.tick}>
              {label}
            </text>
            <line x1={x} x2={x} y1={18} y2={24} className={styles.baseline} />
          </g>
        );
      })}
    </svg>
  );
}

/** One horizontal mastery bar on the shared scale, with gridlines at the quarter marks. */
export function PercentBar({ width, value }: { width: number; value: number }) {
  const h = 12;
  const w = Math.max(0, (clamp(value, 0, 100) / 100) * (width - 2));
  const r = Math.min(4, w / 2, h / 2);
  const d =
    w <= 0
      ? ''
      : r > 0
        ? `M1,0H${1 + w - r}Q${1 + w},0 ${1 + w},${r}V${h - r}Q${1 + w},${h} ${1 + w - r},${h}H1Z`
        : `M1,0H${1 + w}V${h}H1Z`;
  return (
    <svg width={width} height={h} aria-hidden="true" focusable="false" className={styles.bar}>
      <rect x={1} y={0} width={width - 2} height={h} className={styles.track} />
      {[25, 50, 75].map((t) => {
        const x = 1 + (t / 100) * (width - 2);
        return <line key={t} x1={x} x2={x} y1={0} y2={h} className={styles.trackGrid} />;
      })}
      {d ? <path d={d} className={styles.mark} /> : null}
    </svg>
  );
}

export interface DataTableProps {
  /** What the data is for, e.g. "reviews per day"; completes "Show data for ...". */
  about: string;
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}

/** The numbers behind a chart, in a "Show data" disclosure. */
export function DataTable({ about, caption, columns, rows }: DataTableProps) {
  return (
    <details className={styles.data}>
      <summary className={styles.summary}>
        Show data<VisuallyHidden> for {about}</VisuallyHidden>
      </summary>
      <div className={styles.tableWrap} role="region" aria-label={caption} tabIndex={0}>
        <table className={styles.table}>
          <caption className={styles.caption}>{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={i}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** A chart's section: heading, lead text, the chart, then anything else (legend, data table). */
export function ChartSection({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <h2 id={id}>{title}</h2>
      {lead}
      {children}
    </section>
  );
}

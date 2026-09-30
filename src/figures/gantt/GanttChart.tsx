/**
 * SVG Gantt chart: one bar per task on a day or week axis, a diamond for each milestone, and a
 * legend. With `showCriticalPath`, critical tasks are hatched and labelled "critical", and slack
 * shows as a dashed line to the latest finish, so neither relies on colour.
 */
import { useMemo } from 'react';
import type { Gantt } from '../../content/schema';
import { r1, type Shape } from '../geometry';
import { Canvas, HighlightRing, TextLines } from '../svg';
import { LINE_HEIGHT, textWidth } from '../text';
import type { BodyProps } from '../types';
import { useFigureId } from '../useScrollable';
import { BAR_HEIGHT, DIAMOND, HEADER_BOTTOM, HEADER_UNIT_Y, HEADER_Y, layoutGantt, PAD, unitHeader, type GanttRow } from './layout';
import { trySchedule } from './schedule';
import styles from '../Figure.module.css';

function Hatch({ id }: { id: string }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
      <rect className={styles.hatchGround} width={6} height={6} />
      <line className={styles.hatch} x1={3} y1={0} x2={3} y2={6} />
    </pattern>
  );
}

function diamondPoints(x: number, y: number, half = DIAMOND): string {
  return `${r1(x)},${r1(y - half)} ${r1(x + half)},${r1(y)} ${r1(x)},${r1(y + half)} ${r1(x - half)},${r1(y)}`;
}

function Row({ row, hatch, layout }: { row: GanttRow; hatch: string; layout: ReturnType<typeof layoutGantt> }) {
  const { task, cy, bar, diamondX, critical, slackTo } = row;
  const barY = cy - BAR_HEIGHT / 2;
  const criticalW = textWidth('critical') + 8;
  return (
    <g data-task={task.id} data-critical={critical ? 'true' : undefined}>
      <TextLines lines={[task.id]} x={layout.idX} y={cy} anchor="start" className={styles.bold} />
      <TextLines lines={row.nameLines} x={layout.nameX} y={cy} anchor="start" />
      <TextLines lines={[String(task.duration)]} x={layout.durationX} y={cy} />
      {row.depsLines[0] && <TextLines lines={row.depsLines} x={layout.depsX} y={cy} anchor="start" />}
      {slackTo !== null && (
        <>
          <path className={styles.slack} d={`M${r1(bar ? bar.x + bar.w : (diamondX ?? 0))} ${r1(cy)} H${r1(slackTo)}`} />
          <path className={styles.slackEnd} d={`M${r1(slackTo)} ${r1(cy - 6)} V${r1(cy + 6)}`} />
        </>
      )}
      {bar &&
        (critical ? (
          <rect className={styles.criticalBar} fill={`url(#${hatch})`} x={r1(bar.x)} y={r1(barY)} width={r1(bar.w)} height={BAR_HEIGHT} />
        ) : (
          <rect className={styles.bar} x={r1(bar.x)} y={r1(barY)} width={r1(bar.w)} height={BAR_HEIGHT} />
        ))}
      {diamondX !== null && <polygon className={styles.diamond} points={diamondPoints(diamondX, cy)} />}
      {critical && (
        <>
          <rect className={styles.backing} x={r1(row.criticalX - 4)} y={r1(cy - LINE_HEIGHT / 2)} width={r1(criticalW)} height={LINE_HEIGHT} />
          <TextLines lines={['critical']} x={row.criticalX} y={cy} anchor="start" />
        </>
      )}
    </g>
  );
}

function Legend({ id, critical, slack, milestone }: { id: string; critical: boolean; slack: boolean; milestone: boolean }) {
  return (
    <ul className={styles.legend} aria-label="Key">
      <li>
        <svg className={styles.swatch} width={28} height={16} aria-hidden="true">
          <rect className={styles.bar} x={0} y={2} width={28} height={12} />
        </svg>
        Task
      </li>
      {critical && (
        <li>
          <svg className={styles.swatch} width={28} height={16} aria-hidden="true">
            <defs>
              <Hatch id={`${id}-key`} />
            </defs>
            <rect className={styles.criticalBar} fill={`url(#${id}-key)`} x={1} y={2} width={26} height={12} />
          </svg>
          Critical task, labelled critical
        </li>
      )}
      {slack && (
        <li>
          <svg className={styles.swatch} width={28} height={16} aria-hidden="true">
            <path className={styles.slack} d="M0 8 H26" />
            <path className={styles.slackEnd} d="M26 2 V14" />
          </svg>
          Slack, to the latest finish
        </li>
      )}
      {milestone && (
        <li>
          <svg className={styles.swatch} width={28} height={16} aria-hidden="true">
            <polygon className={styles.diamond} points={diamondPoints(14, 8, 7)} />
          </svg>
          Milestone
        </li>
      )}
    </ul>
  );
}

export function GanttChartView({ figure: f, markers, title, desc }: BodyProps<Gantt>) {
  const id = useFigureId();
  const result = useMemo(() => trySchedule(f.tasks), [f.tasks]);
  const layout = useMemo(() => (result.schedule ? layoutGantt(f, result.schedule) : null), [f, result]);
  if (!layout) {
    return <p className={styles.error}>This Gantt chart can&rsquo;t be drawn. {result.error}</p>;
  }
  const hatch = `${id}-hatch`;
  const bottom = layout.rows.length ? layout.rows[layout.rows.length - 1].top + layout.rows[layout.rows.length - 1].height : HEADER_BOTTOM;
  const grid: number[] = [];
  for (let k = 0; k <= layout.columns; k++) grid.push(layout.plotX + k * layout.unitW);
  const unit = f.unit === 'day' ? 'Day' : 'Week';
  return (
    <>
      <Canvas width={layout.width} height={layout.height} title={title} desc={desc}>
        <defs>
          <Hatch id={hatch} />
        </defs>
        <TextLines lines={[unit]} x={layout.plotX} y={HEADER_UNIT_Y} anchor="start" />
        <TextLines lines={['Task']} x={layout.idX} y={HEADER_Y} anchor="start" className={styles.bold} />
        <TextLines lines={[unitHeader(f.unit)]} x={layout.durationX} y={HEADER_Y} className={styles.bold} />
        <TextLines lines={['Depends on']} x={layout.depsX} y={HEADER_Y} anchor="start" className={styles.bold} />
        {layout.ticks.map((t) => (
          <TextLines key={t.label} lines={[t.label]} x={t.x} y={HEADER_Y} />
        ))}
        {grid.map((x, k) => (
          <path key={k} className={`${styles.hair} ${styles.dotted}`} d={`M${r1(x)} ${HEADER_BOTTOM} V${r1(bottom)}`} />
        ))}
        <path className={styles.hair} d={`M${PAD} ${HEADER_BOTTOM} H${r1(layout.width - PAD)}`} />
        {layout.rows.map((row) => (
          <path key={row.task.id} className={styles.hair} d={`M${PAD} ${r1(row.top + row.height)} H${r1(layout.width - PAD)}`} />
        ))}
        {layout.rows.map((row) => (
          <Row key={row.task.id} row={row} hatch={hatch} layout={layout} />
        ))}
        {[...markers].map(([taskId, marker]) => {
          const row = layout.rows.find((r) => r.task.id === taskId);
          if (!row) return null;
          const left = Math.min(row.bar?.x ?? Infinity, (row.diamondX ?? Infinity) - DIAMOND);
          const right = Math.max(row.bar ? row.bar.x + row.bar.w : -Infinity, (row.diamondX ?? -Infinity) + DIAMOND);
          const shape: Shape = { kind: 'rect', cx: (left + right) / 2, cy: row.cy, w: right - left, h: BAR_HEIGHT };
          return <HighlightRing key={taskId} shape={shape} marker={marker} canvas={layout} gap={5} />;
        })}
      </Canvas>
      <Legend id={id} critical={layout.anyCritical} slack={layout.anySlack} milestone={layout.anyMilestone} />
    </>
  );
}

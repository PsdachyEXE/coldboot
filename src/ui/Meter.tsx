import { useId, type ReactNode } from 'react';
import { VisuallyHidden } from './VisuallyHidden';
import styles from './Meter.module.css';

export interface MeterProps {
  /** What is measured, e.g. "U3O1-KK04 mastery" or "Cards reviewed". */
  label: ReactNode;
  /** Current value, or null for "unseen" (no data yet), which is shown distinctly from zero. */
  value: number | null;
  /** Upper bound (default 100). */
  max?: number;
  /** `percent` prints "62%"; `count` prints "3 of 10". Default `percent`. */
  format?: 'percent' | 'count';
  /** Replaces the printed value, e.g. "62 of 100 mastery". */
  valueText?: string;
  /** Wording for the null state (default "Unseen"). */
  emptyText?: string;
  /** `meter` for a measurement such as mastery; `progress` for completion of a task. */
  kind?: 'meter' | 'progress';
  /** Keeps the label for screen readers only, e.g. inside a table row that already names it. */
  hideLabel?: boolean;
  className?: string;
}

/**
 * A labelled bar for mastery or progress. It always prints its value in words, so it never
 * relies on colour or bar length alone. The unseen state is a dashed empty track and the word
 * "Unseen", never an empty bar that reads as zero.
 */
export function Meter({
  label,
  value,
  max = 100,
  format = 'percent',
  valueText,
  emptyText = 'Unseen',
  kind = 'meter',
  hideLabel = false,
  className,
}: MeterProps) {
  const labelId = useId();
  const unseen = value === null || !Number.isFinite(value);
  const clamped = unseen ? 0 : Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  const text =
    valueText ?? (unseen ? emptyText : format === 'count' ? `${Math.round(clamped)} of ${max}` : `${Math.round(pct)}%`);
  return (
    <div className={[styles.meter, className].filter(Boolean).join(' ')}>
      <div className={styles.head}>
        {hideLabel ? (
          <VisuallyHidden id={labelId}>{label}</VisuallyHidden>
        ) : (
          <span id={labelId} className={styles.label}>
            {label}
          </span>
        )}
        <span className={styles.value} aria-hidden="true">
          {text}
        </span>
      </div>
      <div
        role={kind === 'progress' ? 'progressbar' : 'meter'}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={text}
        className={[styles.track, unseen ? styles.unseen : ''].filter(Boolean).join(' ')}
      >
        {unseen ? null : <div className={styles.fill} style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
}

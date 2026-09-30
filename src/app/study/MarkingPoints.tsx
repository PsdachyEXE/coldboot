/**
 * Self-marking pieces shared by Written and the exam simulator: the model answer and the marking
 * points as checkboxes. The score rule lives in written.ts (ticked marks, capped at the marks
 * available).
 */
import type { Ref } from 'react';
import type { MarkingPoint } from '../../content/schema';
import { Checkbox } from '../../ui/Field';
import { Markdown } from '../../ui/Markdown';
import { plural } from './format';
import styles from './Written.module.css';
import study from './study.module.css';

export interface ModelAnswerProps {
  /** Bundled content: the model answer's Markdown. */
  model: string;
  headingId: string;
  /** Focused when the answer is revealed. */
  headingRef?: Ref<HTMLHeadingElement>;
}

export function ModelAnswer({ model, headingId, headingRef }: ModelAnswerProps) {
  return (
    <section className={styles.model} aria-labelledby={headingId}>
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className={study.focusTarget}>
        Model answer
      </h3>
      <Markdown text={model} />
    </section>
  );
}

export interface MarkingPointsProps {
  points: readonly MarkingPoint[];
  ticked: ReadonlySet<number>;
  onToggle(index: number, on: boolean): void;
  /** Locks the ticks once a score is saved. */
  disabled?: boolean;
}

/** The marking points as checkboxes, each with its marks. */
export function MarkingPoints({ points, ticked, onToggle, disabled = false }: MarkingPointsProps) {
  return (
    <fieldset className={styles.points} disabled={disabled}>
      <legend className={styles.pointsLegend}>Tick the marking points your answer earned</legend>
      {points.map((p, i) => (
        <Checkbox
          key={i}
          label={
            <>
              <Markdown inline text={p.text} /> <span className={styles.pointMarks}>({plural(p.marks, 'mark')})</span>
            </>
          }
          checked={ticked.has(i)}
          onChange={(e) => onToggle(i, e.target.checked)}
        />
      ))}
    </fieldset>
  );
}

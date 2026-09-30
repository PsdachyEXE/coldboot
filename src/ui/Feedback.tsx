import { useEffect, type ReactNode } from 'react';
import { announce } from './announce';
import { useReducedMotion } from './motion';
import { playCue } from './sound';
import styles from './Feedback.module.css';

export interface FeedbackProps {
  /** The verdict. */
  correct: boolean;
  /**
   * Plain text read after the verdict by screen readers, e.g. "The answer is B." Keep it short;
   * the visible explanation goes in `children`.
   */
  summary?: string;
  /** Announce the verdict (and summary) through the polite live region when shown. Default true. */
  announce?: boolean;
  /** Play the matching sound cue when shown (only if the user turned sound on). Default true. */
  cue?: boolean;
  /** Detail shown under the verdict: the correct answer, the explanation, the mistake note. */
  children?: ReactNode;
  className?: string;
}

/**
 * Answer feedback. Correct: "✓ Correct" in --flare. Incorrect: "✗ Incorrect" in --steel on --trench
 * with a 120 ms horizontal nudge (none under reduced motion). The glyph and the word always carry
 * the meaning, never the colour alone. It announces the verdict and plays the sound cue itself, so
 * screens don't call `announce` or `playCue` for the verdict. Remount it (with a `key`) per answer.
 */
export function Feedback({ correct, summary, announce: shouldAnnounce = true, cue = true, children, className }: FeedbackProps) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (shouldAnnounce) announce(summary ? `${correct ? 'Correct' : 'Incorrect'}. ${summary}` : correct ? 'Correct' : 'Incorrect');
  }, [correct, summary, shouldAnnounce]);
  useEffect(() => {
    if (cue) playCue(correct ? 'correct' : 'incorrect');
  }, [correct, cue]);

  const cls = [styles.feedback, correct ? styles.correct : styles.incorrect, !correct && !reduced ? styles.nudge : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} data-verdict={correct ? 'correct' : 'incorrect'}>
      <p className={styles.verdict}>
        <span className={styles.glyph} aria-hidden="true">
          {correct ? '✓' : '✗'}
        </span>{' '}
        {correct ? 'Correct' : 'Incorrect'}
      </p>
      {children ? <div className={styles.detail}>{children}</div> : null}
    </div>
  );
}

/**
 * A finished daily challenge: the score, each question's result in words, the share line with a
 * "Copy share line" button (and a selected text box when the browser won't copy), and the time
 * until the next set, which starts at midnight in Melbourne.
 */
import { useEffect, useRef, useState } from 'react';
import { dailyShareText } from '../../games/daily';
import { msUntilNextSet } from '../../games/daily-game';
import { useNow } from '../../lib/useNow';
import { announce } from '../../ui/announce';
import { Button, ButtonLink } from '../../ui/Button';
import { TextArea } from '../../ui/Field';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { paths } from '../paths';
import { PhaseHeading } from '../study/parts';
import study from '../study/study.module.css';
import styles from './Daily.module.css';
import { formatNextSet } from './format';

export interface DailyResultProps {
  /** Melbourne date of the set. */
  date: string;
  results: readonly (0 | 1)[];
  total: number;
  /** True right after the last answer: focus the heading and use "complete" wording. */
  justFinished: boolean;
  /** Today's Melbourne date, which moves on at midnight. */
  today: string;
  onNewSet(): void;
}

type CopyState = 'idle' | 'copied' | 'failed';

export function DailyResult({ date, results, total, justFinished, today, onNewSet }: DailyResultProps) {
  const now = useNow(15_000);
  const [copy, setCopy] = useState<CopyState>('idle');
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const score = results.reduce<number>((s, r) => s + r, 0);
  const share = dailyShareText(date, results, total);
  const stale = today !== date;

  useEffect(() => {
    if (copy === 'failed' && fallbackRef.current) {
      fallbackRef.current.focus();
      fallbackRef.current.select();
    }
  }, [copy]);

  async function copyShare() {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(share);
      setCopy('copied');
      announce('Share line copied to the clipboard.');
    } catch {
      setCopy('failed');
    }
  }

  return (
    <section aria-labelledby="daily-result">
      <PhaseHeading level={2} focus={justFinished} id="daily-result">
        {justFinished ? 'Daily challenge complete' : "You've finished this daily challenge"}
      </PhaseHeading>
      <p className={styles.score}>
        {score} of {total} correct
      </p>
      {!justFinished ? <p>Only your first attempt at each question counts, so this set is done.</p> : null}

      <ol className={styles.results} aria-label="Your answers">
        {Array.from({ length: total }, (_, i) => {
          const r = results[i];
          return (
            <li key={i} data-result={r === 1 ? 'correct' : 'incorrect'}>
              <span className={styles.resultNumber}>
                <VisuallyHidden>Question </VisuallyHidden>
                {i + 1}
              </span>{' '}
              <span className={r === 1 ? styles.resultCorrect : styles.resultIncorrect}>
                <span aria-hidden="true">{r === 1 ? '✓' : '✗'}</span> {r === 1 ? 'Correct' : 'Incorrect'}
              </span>
            </li>
          );
        })}
      </ol>

      <h3>Share your result</h3>
      <p>A blue square is a right answer and a black square a wrong one. Nothing else about you is in it.</p>
      <figure className={styles.share}>
        <figcaption className={styles.shareCaption}>Share line</figcaption>
        <pre className={styles.sharePre}>{share}</pre>
      </figure>
      <div className={study.actions}>
        <Button variant="primary" onClick={() => void copyShare()}>
          Copy share line
        </Button>
        {copy === 'copied' ? <p className={styles.copied}>Share line copied to the clipboard.</p> : null}
      </div>
      {copy === 'failed' ? (
        <div className={styles.fallback}>
          <TextArea
            ref={fallbackRef}
            label="Share line text"
            hint="Your browser didn't allow copying. The text is selected: press Ctrl+C (or Cmd+C on a Mac) to copy it."
            value={share}
            readOnly
            rows={3}
          />
        </div>
      ) : null}

      <h3>Next set</h3>
      {stale ? (
        <>
          <p>A new set is ready for today.</p>
          <div className={study.actions}>
            <Button variant="primary" onClick={onNewSet}>
              Go to today's set
            </Button>
          </div>
        </>
      ) : (
        <p>
          The next set is ready in {formatNextSet(msUntilNextSet(date, now))}, at midnight in Melbourne.
        </p>
      )}
      <div className={study.actionsEnd}>
        <ButtonLink to={paths.home}>Go to Home</ButtonLink>
        <ButtonLink to={paths.stats}>Open Stats</ButtonLink>
      </div>
    </section>
  );
}

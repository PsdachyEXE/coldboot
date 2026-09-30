/** "Drill complete": the score, results by KK and a suggested next step. */
import type { ReactNode } from 'react';
import type { ContentIndex } from '../../content/loader';
import { ButtonLink } from '../../ui/Button';
import { KkTag } from '../../ui/Tag';
import { suggestNextStep, tallyByKk, type DrillResult } from './drill';
import { formatClockWords, plural } from './format';
import { PhaseHeading } from './parts';
import styles from './Drill.module.css';

export interface DrillResultsProps {
  result: DrillResult;
  content: ContentIndex;
  /** Heading level: 1 on the Drill screen, 2 inside Today's run. */
  level?: 1 | 2;
  title?: string;
  focus?: boolean;
  /** Show the suggested next step (the Drill screen does; Today's run has its own next step). */
  showNext?: boolean;
  children?: ReactNode;
}

export function DrillResults({ result, content, level = 1, title = 'Drill complete', focus = true, showNext = true, children }: DrillResultsProps) {
  const tallies = tallyByKk(result);
  const unanswered = result.answers.filter((a) => !a.answered).length;
  const next = suggestNextStep(result, content);
  const Sub = level === 1 ? 'h2' : 'h3';
  return (
    <section>
      <PhaseHeading level={level} focus={focus}>
        {title}
      </PhaseHeading>
      {result.total === 0 ? (
        <p>You ended the drill before answering any questions.</p>
      ) : (
        <p className={styles.score}>
          {result.correct} of {result.total} correct
        </p>
      )}
      {result.timedOut ? (
        <p>
          Time's up.{' '}
          {unanswered > 0 ? `${plural(unanswered, 'question')} ${unanswered === 1 ? 'was' : 'were'} unanswered and ${unanswered === 1 ? 'counts' : 'count'} as wrong.` : 'You answered every question.'}
        </p>
      ) : result.timed ? (
        <p>
          You finished with {formatClockWords(result.msLeft)} to spare.
          {unanswered > 0 ? ` ${plural(unanswered, 'question')} left unanswered ${unanswered === 1 ? 'counts' : 'count'} as wrong.` : ''}
        </p>
      ) : null}
      {tallies.length ? (
        <table className={styles.results}>
          <caption>Results by key knowledge</caption>
          <thead>
            <tr>
              <th scope="col">Key knowledge</th>
              <th scope="col">Correct</th>
            </tr>
          </thead>
          <tbody>
            {tallies.map((t) => (
              <tr key={t.kk}>
                <th scope="row">
                  <KkTag kk={t.kk} showTitle />
                </th>
                <td>
                  {t.correct} of {t.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {showNext ? (
        <div className={styles.nextStep}>
          <Sub>Next step</Sub>
          <p>{next.text}</p>
          <ButtonLink variant="primary" to={next.to}>
            {next.label}
          </ButtonLink>
        </div>
      ) : null}
      {children}
    </section>
  );
}

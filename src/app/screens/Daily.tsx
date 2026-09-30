/**
 * Daily challenge (Section 6.12, P1 as a screen): today's ten questions, the same set and the same
 * stored record as the terminal's `daily`, so either can start the day and the other carries on.
 * Multiple-choice questions use the Drill question; generated questions show the terminal's blocks
 * with an answer field. A finished day shows the result, the share line and when the next set is due.
 */
import type { ContentIndex } from '../../content/loader';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { DailyChallenge } from '../daily/DailyChallenge';
import { useGenerators } from '../daily/useGenerators';
import { ContentGate } from '../study/ContentGate';
import study from '../study/study.module.css';

export default function Daily() {
  return (
    <div className={study.page}>
      <ContentGate heading="Daily challenge">{(content) => <DailyReady content={content} />}</ContentGate>
    </div>
  );
}

function DailyReady({ content }: { content: ContentIndex }) {
  const { state, retry } = useGenerators();
  return (
    <>
      <h1>Daily challenge</h1>
      {state.status === 'ready' ? (
        <DailyChallenge content={content} generators={state.generators} />
      ) : state.status === 'error' ? (
        <EmptyState
          title="Today's set didn't load"
          action={
            <Button variant="primary" onClick={retry}>
              Try again
            </Button>
          }
        >
          <p role="alert">The questions from the terminal games couldn't load. Check your connection, then try again.</p>
        </EmptyState>
      ) : (
        <p role="status">Loading today's set</p>
      )}
    </>
  );
}

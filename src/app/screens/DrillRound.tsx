/**
 * A drill round: the questions, then the results with "Drill again". Drill.tsx loads this module on
 * demand, so the setup screen paints without the Markdown renderer and figures it brings.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import { freshSeed, mulberry32 } from '../../games/prng';
import { masteryNow } from '../../srs/hooks';
import { Button, ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { paths, reviewPath } from '../paths';
import type { DrillResult } from '../study/drill';
import { DrillResults } from '../study/DrillResults';
import { DrillRunner } from '../study/DrillRunner';
import { formatClockWords, plural } from '../study/format';
import { DRILL_ROUND, TIMED_ROUND, pickMcqs, scopeTitle, timedAllowance, type StudyScope } from '../study/select';
import study from '../study/study.module.css';

interface Round {
  seed: number;
  items: ReturnType<typeof pickMcqs>['items'];
}

function buildRound(content: ContentIndex, scope: StudyScope, timed: boolean): Round {
  const now = Date.now();
  const seed = freshSeed(now);
  const picked = pickMcqs(content, scope, masteryNow(now), mulberry32(seed), timed ? TIMED_ROUND : DRILL_ROUND);
  return { seed, items: picked.items };
}

export default function DrillRound({ content, scope, timed }: { content: ContentIndex; scope: StudyScope; timed: boolean }) {
  const [round, setRound] = useState(() => buildRound(content, scope, timed));
  const [result, setResult] = useState<DrillResult | null>(null);

  if (!round.items.length) return <NoQuestions content={content} scope={scope} />;

  if (result) {
    return (
      <DrillResults result={result} content={content}>
        <div className={study.actionsEnd}>
          <Button
            onClick={() => {
              setResult(null);
              setRound(buildRound(content, scope, timed));
            }}
          >
            Drill again
          </Button>
          <ButtonLink to={paths.drill}>Change drill</ButtonLink>
        </div>
      </DrillResults>
    );
  }

  const n = round.items.length;
  return (
    <>
      <h1>Drill</h1>
      <p>
        {scopeTitle(scope)}. {timed ? `Timed: ${plural(n, 'question')} in ${formatClockWords(timedAllowance(n))}.` : `${plural(n, 'question')}.`}{' '}
        <Link to={paths.drill}>Change drill</Link>
      </p>
      <DrillRunner key={round.seed} questions={round.items} timed={timed} where="Drill" onFinish={setResult} />
    </>
  );
}

function NoQuestions({ content, scope }: { content: ContentIndex; scope: StudyScope }) {
  const kk = scope.mode === 'kk' ? scope.kk : null;
  const hasCards = kk ? (content.byKk.get(kk)?.cards.length ?? 0) > 0 : content.cards.length > 0;
  if (kk === 'TERMS' && hasCards) {
    // The glossary has no multiple-choice questions by design, so none are coming.
    return (
      <>
        <h1>Drill</h1>
        <EmptyState
          title="The glossary is practised with flashcards"
          action={
            <ButtonLink variant="primary" to={reviewPath({ kk })}>
              Review the glossary
            </ButtonLink>
          }
        >
          <p>The glossary has no multiple-choice questions. Review its flashcards, or type play blitz in the terminal.</p>
        </EmptyState>
      </>
    );
  }
  return (
    <>
      <h1>Drill</h1>
      <EmptyState
        title={scope.mode === 'kk' || scope.mode === 'area' ? `No questions for ${scopeTitle(scope)} yet` : 'No multiple-choice questions yet'}
        action={
          hasCards ? (
            <ButtonLink variant="primary" to={kk ? reviewPath({ kk }) : paths.review}>
              {kk ? 'Review this key knowledge' : 'Go to Review'}
            </ButtonLink>
          ) : (
            <ButtonLink variant="primary" to={paths.drill}>
              Choose another drill
            </ButtonLink>
          )
        }
      >
        <p>
          {hasCards
            ? kk
              ? 'Review the flashcards for this key knowledge instead.'
              : 'Review flashcards instead.'
            : 'Choose another key knowledge point or area, or a mix from across the course.'}
        </p>
      </EmptyState>
    </>
  );
}

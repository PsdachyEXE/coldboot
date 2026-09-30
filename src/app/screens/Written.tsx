/**
 * Written (Section 6.5): Section B and C style short answers, self-marked against the model answer
 * and marking points. `/written?kk=`, `?area=` or `?mode=` start a round; `/written?cs=cs-01`
 * (optionally `&q=cs-01-q03`) practises a case study with its insert beside the questions.
 */
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import type { AreaId, KkId, ShortAnswer } from '../../content/schema';
import { ALL_KK_IDS, kkLabel } from '../../content/studyDesign';
import { freshSeed, mulberry32 } from '../../games/prng';
import { masteryNow } from '../../srs/hooks';
import { Button, ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { KkTag } from '../../ui/Tag';
import { paths, reviewPath, writtenPath } from '../paths';
import { CaseStudyPractice } from '../study/CaseStudyPractice';
import { ContentGate } from '../study/ContentGate';
import { plural } from '../study/format';
import { PhaseHeading } from '../study/parts';
import { ScopeForm } from '../study/ScopeForm';
import { WRITTEN_ROUND, pickShorts, scopeFromParams, scopeTitle, type StudyScope } from '../study/select';
import { WrittenQuestion } from '../study/WrittenQuestion';
import type { WrittenResult } from '../study/written';
import study from '../study/study.module.css';
import styles from '../study/Written.module.css';

export default function Written() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cs = params.get('cs');
  const { scope, invalid } = scopeFromParams(params);
  return (
    <div className={cs === null ? study.page : undefined}>
      <ContentGate heading="Written">
        {(content) =>
          cs !== null ? (
            <CaseStudyScreen
              content={content}
              csId={cs}
              questionId={params.get('q')}
              onSelect={(q) => navigate(writtenPath({ cs, q }), { replace: true })}
            />
          ) : scope ? (
            <WrittenRound key={params.toString()} content={content} scope={scope} />
          ) : (
            <WrittenSetup content={content} invalid={invalid} onStart={(s) => navigate(writtenPath(toPathOptions(s)))} />
          )
        }
      </ContentGate>
    </div>
  );
}

function toPathOptions(scope: StudyScope): { kk?: KkId; area?: AreaId; mode?: 'weak' | 'random' } {
  if (scope.mode === 'kk') return { kk: scope.kk };
  if (scope.mode === 'area') return { area: scope.area };
  return { mode: scope.mode };
}

function WrittenSetup({ content, invalid, onStart }: { content: ContentIndex; invalid: boolean; onStart(scope: StudyScope): void }) {
  const hasShort = content.short.length > 0;
  const cases = content.caseStudies;
  return (
    <>
      <h1>Written</h1>
      {invalid ? <p className={study.notice}>That link names something COLDBOOT doesn't have. Choose what to practise below instead.</p> : null}
      {!hasShort && !cases.length ? (
        <EmptyState
          title="No written questions yet"
          action={
            <ButtonLink variant="primary" to={paths.drill}>
              Go to Drill
            </ButtonLink>
          }
        >
          <p>This version of COLDBOOT has no short-answer questions or case studies yet. Practise multiple-choice questions in a drill instead.</p>
        </EmptyState>
      ) : (
        <>
          <p className={study.lead}>Sections B and C style questions. Write your answer, then mark it against the model answer and marking points.</p>
          {hasShort ? (
            <ScopeForm content={content} kind="short" legend="What to practise" submitLabel="Start written practice" onSubmit={onStart} />
          ) : (
            <p>There are no Section B short answers yet. Practise a case study below.</p>
          )}
          {cases.length ? (
            <section aria-labelledby="case-studies">
              <h2 id="case-studies">Section C case studies</h2>
              <p>Each case study comes with an insert. On a wide screen it sits beside the questions, as the exam's detachable insert would.</p>
              <ul className={styles.caseList}>
                {cases.map((c) => (
                  <li key={c.id}>
                    <Link to={writtenPath({ cs: c.id })}>Practise {c.title}</Link>
                    <p className={study.small}>
                      {plural(c.questions.length, 'question')}, {plural(c.totalMarks, 'mark')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}

function WrittenRound({ content, scope }: { content: ContentIndex; scope: StudyScope }) {
  const build = () => {
    const now = Date.now();
    const seed = freshSeed(now);
    return { seed, items: pickShorts(content, scope, masteryNow(now), mulberry32(seed), WRITTEN_ROUND).items };
  };
  const [round, setRound] = useState(build);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<WrittenResult[]>([]);
  const [finished, setFinished] = useState(false);

  if (!round.items.length) {
    const kk = scope.mode === 'kk' ? scope.kk : null;
    return (
      <>
        <h1>Written</h1>
        <EmptyState
          title={kk || scope.mode === 'area' ? `No short answers for ${scopeTitle(scope)} yet` : 'No short answers yet'}
          action={
            <ButtonLink variant="primary" to={paths.written}>
              Choose other questions
            </ButtonLink>
          }
        >
          <p>Choose another key knowledge point or area, or practise a case study.</p>
        </EmptyState>
      </>
    );
  }

  if (finished) {
    return (
      <WrittenComplete items={round.items} results={results}>
        <div className={study.actionsEnd}>
          <Button
            onClick={() => {
              setRound(build());
              setIndex(0);
              setResults([]);
              setFinished(false);
            }}
          >
            Practise again
          </Button>
          <ButtonLink to={paths.written}>Change questions</ButtonLink>
        </div>
      </WrittenComplete>
    );
  }

  const item = round.items[index];
  const last = index === round.items.length - 1;
  const scored = results.some((r) => r.itemId === item.id);
  return (
    <>
      <h1>Written</h1>
      <p>
        {scopeTitle(scope)}. {plural(round.items.length, 'question')}. <Link to={paths.written}>Change questions</Link>
      </p>
      <WrittenQuestion
        key={`${round.seed}:${item.id}`}
        item={item}
        position={`Question ${index + 1} of ${round.items.length}`}
        where="Written"
        onScored={(r) => setResults((list) => [...list, r])}
        next={{ label: last ? 'Finish practice' : 'Next question', onNext: () => (last ? setFinished(true) : setIndex((i) => i + 1)) }}
        autoFocus={index > 0}
      />
      {!(last && scored) ? (
        <p>
          <Button variant="quiet" size="small" onClick={() => setFinished(true)}>
            End practice now
          </Button>
        </p>
      ) : null}
    </>
  );
}

function WrittenComplete({ items, results, children }: { items: ShortAnswer[]; results: WrittenResult[]; children: ReactNode }) {
  const earned = results.reduce((s, r) => s + r.earned, 0);
  const marks = results.reduce((s, r) => s + r.marks, 0);
  const worst = [...results].sort((a, b) => a.score - b.score || (ALL_KK_IDS.indexOf(a.kk[0]) - ALL_KK_IDS.indexOf(b.kk[0])))[0];
  const byId = new Map(items.map((i) => [i.id, i]));
  return (
    <section>
      <PhaseHeading focus>Written practice complete</PhaseHeading>
      {results.length === 0 ? (
        <p>You ended the practice before marking any answers.</p>
      ) : (
        <>
          <p className={study.lead}>
            {earned} of {plural(marks, 'mark')}
          </p>
          <ul className={styles.resultList} aria-label="Marks by question">
            {results.map((r, i) => {
              const item = byId.get(r.itemId);
              return (
                <li key={r.itemId}>
                  <span>
                    Question {i + 1}: {item ? `${item.commandTerm.charAt(0).toUpperCase()}${item.commandTerm.slice(1)}, ` : ''}
                    <KkTag kk={r.kk[0]} />
                  </span>
                  <span className={styles.resultMarks}>
                    {r.earned} of {r.marks}
                  </span>
                </li>
              );
            })}
          </ul>
          {worst && worst.score < 1 ? (
            <div>
              <h2>Next step</h2>
              <p>Review the flashcards for {kkLabel(worst.kk[0])}, where your answers dropped the most marks.</p>
              <ButtonLink variant="primary" to={reviewPath({ kk: worst.kk[0] })}>
                Review this key knowledge
              </ButtonLink>
            </div>
          ) : null}
        </>
      )}
      {children}
    </section>
  );
}

function CaseStudyScreen({
  content,
  csId,
  questionId,
  onSelect,
}: {
  content: ContentIndex;
  csId: string;
  questionId: string | null;
  onSelect(q: string): void;
}) {
  const cs = content.caseStudies.find((c) => c.id === csId);
  if (!cs) {
    return (
      <div className={study.page}>
        <h1>Written</h1>
        <EmptyState
          title="Case study not found"
          action={
            <ButtonLink variant="primary" to={paths.written}>
              Go to Written
            </ButtonLink>
          }
        >
          <p>This version of COLDBOOT has no case study with that name. Choose one from the Written screen.</p>
        </EmptyState>
      </div>
    );
  }
  return (
    <>
      <h1>{cs.title}</h1>
      <p>
        Section C practice: {plural(cs.questions.length, 'question')}, {plural(cs.totalMarks, 'mark')}. <Link to={paths.written}>Choose other questions</Link>
      </p>
      <CaseStudyPractice key={cs.id} cs={cs} questionId={questionId} onSelect={onSelect} />
    </>
  );
}

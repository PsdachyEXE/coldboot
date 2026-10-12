/**
 * Written (Section 6.5): Section B and C style short answers, self-marked against the model answer
 * and marking points. `/written?kk=`, `?area=` or `?mode=` start a round; `/written?cs=cs-01`
 * (optionally `&q=cs-01-q03`) practises a case study with its insert beside the questions.
 */
import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { AreaId, KkId } from '../../content/schema';
import { useContentSummary } from '../../content/store';
import { whenIdle } from '../../lib/idle';
import { ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { lazyComponent } from '../lazyComponent';
import { paths, writtenPath } from '../paths';
import { ContentErrorNotice, ContentGate } from '../study/ContentGate';
import { plural } from '../study/format';
import { ScopeForm } from '../study/ScopeForm';
import { scopeFromParams, type StudyScope } from '../study/select';
import study from '../study/study.module.css';
import styles from '../study/Written.module.css';

// The practice screens are their own chunk (they bring the Markdown renderer and figures), so the
// setup paints without them.
// Exported so tests can preload them.
const practice = () => import('./WrittenPractice');
// eslint-disable-next-line react-refresh/only-export-components -- a component, built by lazyComponent
export const WrittenRound = lazyComponent(async () => ({ default: (await practice()).WrittenRound }));
// eslint-disable-next-line react-refresh/only-export-components -- a component, built by lazyComponent
export const CaseStudyScreen = lazyComponent(async () => ({ default: (await practice()).CaseStudyScreen }));

export default function Written() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cs = params.get('cs');
  const { scope, invalid } = scopeFromParams(params);
  return (
    <div className={cs === null ? study.page : undefined}>
      {cs !== null ? (
        <ContentGate heading="Written">
          {(content) => (
            <CaseStudyScreen
              content={content}
              csId={cs}
              questionId={params.get('q')}
              onSelect={(q) => navigate(writtenPath({ cs, q }), { replace: true })}
            />
          )}
        </ContentGate>
      ) : scope ? (
        <ContentGate heading="Written">{(content) => <WrittenRound key={params.toString()} content={content} scope={scope} />}</ContentGate>
      ) : (
        // The setup needs only counts, so it paints before the content chunks arrive. `started`
        // tells the round to put focus on its first question, as a drill does.
        <WrittenSetup invalid={invalid} onStart={(s) => navigate(writtenPath(toPathOptions(s)), { state: { started: true } })} />
      )}
    </div>
  );
}

function toPathOptions(scope: StudyScope): { kk?: KkId; area?: AreaId; mode?: 'weak' | 'random' } {
  if (scope.mode === 'kk') return { kk: scope.kk };
  if (scope.mode === 'area') return { area: scope.area };
  return { mode: scope.mode };
}

function WrittenSetup({ invalid, onStart }: { invalid: boolean; onStart(scope: StudyScope): void }) {
  const summary = useContentSummary();
  // Fetch the practice screens while the student chooses.
  useEffect(() => whenIdle(() => void Promise.all([WrittenRound.load(), CaseStudyScreen.load()]).catch(() => {})), []);
  const hasShort = summary.total.short > 0;
  const cases = summary.caseStudies;
  return (
    <>
      <h1>Written</h1>
      {invalid ? <p className={study.notice}>That link names something COLDBOOT doesn't have. Choose what to practise below instead.</p> : null}
      <ContentErrorNotice />
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
            <ScopeForm summary={summary} kind="short" legend="What to practise" submitLabel="Start written practice" onSubmit={onStart} />
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
                      {plural(c.questions, 'question')}, {plural(c.totalMarks, 'mark')}
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

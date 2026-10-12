/**
 * Drill (Section 6.4): Section A style multiple-choice rounds by KK, by area of study, from the
 * weakest KKs, or at random, optionally timed at exam pace. `/drill?kk=`, `?area=`, `?mode=weak`,
 * `?mode=random` and `&timed=1` (see drillPath) start a round directly; `/drill` shows the setup.
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useContentSummary } from '../../content/store';
import { whenIdle } from '../../lib/idle';
import { ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { lazyComponent } from '../lazyComponent';
import { drillPath, paths } from '../paths';
import { ContentErrorNotice, ContentGate } from '../study/ContentGate';
import { ScopeForm } from '../study/ScopeForm';
import { scopeFromParams, type StudyScope } from '../study/select';
import study from '../study/study.module.css';

/**
 * The round is its own chunk (it brings the Markdown renderer and figures), so the setup paints
 * without it. Exported so tests can preload it.
 */
// eslint-disable-next-line react-refresh/only-export-components -- a component, built by lazyComponent
export const DrillRound = lazyComponent(() => import('./DrillRound'));

export default function Drill() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { scope, invalid } = scopeFromParams(params);
  const timed = params.get('timed') === '1';
  return (
    <div className={study.page}>
      {scope ? (
        <ContentGate heading="Drill">
          {(content) => <DrillRound key={params.toString()} content={content} scope={scope} timed={timed} />}
        </ContentGate>
      ) : (
        // The setup needs only counts, so it paints before the content chunks arrive.
        <DrillSetup invalid={invalid} initialTimed={timed} onStart={(s, t) => navigate(drillPath({ ...toPathOptions(s), timed: t }))} />
      )}
    </div>
  );
}

function toPathOptions(scope: StudyScope): Parameters<typeof drillPath>[0] {
  if (scope.mode === 'kk') return { kk: scope.kk };
  if (scope.mode === 'area') return { area: scope.area };
  return { mode: scope.mode };
}

function DrillSetup({ invalid, initialTimed, onStart }: { invalid: boolean; initialTimed: boolean; onStart(scope: StudyScope, timed: boolean): void }) {
  const summary = useContentSummary();
  // Fetch the round while the student chooses.
  useEffect(() => whenIdle(() => void DrillRound.load().catch(() => {})), []);
  return (
    <>
      <h1>Drill</h1>
      {invalid ? <p className={study.notice}>That drill link names something COLDBOOT doesn't have. Choose a drill below instead.</p> : null}
      <ContentErrorNotice />
      {summary.total.mcq === 0 ? (
        <EmptyState
          title="No multiple-choice questions yet"
          action={
            <ButtonLink variant="primary" to={paths.review}>
              Go to Review
            </ButtonLink>
          }
        >
          <p>This version of COLDBOOT has no multiple-choice questions yet. Review flashcards instead, or play a game in the terminal.</p>
        </EmptyState>
      ) : (
        <>
          <p className={study.lead}>Section A style multiple-choice questions, with the reasoning behind every answer.</p>
          <ScopeForm
            summary={summary}
            kind="mcq"
            legend="What to drill"
            submitLabel="Start drill"
            timedOption
            initialTimed={initialTimed}
            onSubmit={onStart}
          />
        </>
      )}
    </>
  );
}

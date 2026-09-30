/**
 * A marked paper's report (`/exam?report=<id>`), built from its history summary: the score by
 * section, the score by KK weakest first, the time used, and the weakest KKs, each with a focused
 * drill. Reachable again from Past papers on the start screen.
 */
import { useLocation } from 'react-router';
import { drillPath, paths } from '../app/paths';
import { plural } from '../app/study/format';
import { PhaseHeading } from '../app/study/parts';
import study from '../app/study/study.module.css';
import type { KkId } from '../content/schema';
import { kkLabel } from '../content/studyDesign';
import { ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Meter } from '../ui/Meter';
import { KkTag } from '../ui/Tag';
import { SECTION_KIND, SECTION_LETTER, formatDate, modeName } from './links';
import { sortKkTallies, weakestKks, type KkTally } from './marking';
import { SECTION_IDS, useExam } from './store';
import { formatDuration } from './timer';
import styles from './Exam.module.css';

function percent(earned: number, available: number): number {
  return available ? Math.round((earned / available) * 100) : 0;
}

export function ExamReport({ id }: { id: string }) {
  const entry = useExam((s) => s.history.find((h) => h.id === id));
  const location = useLocation();
  const fresh = (location.state as { fresh?: boolean } | null)?.fresh === true;

  if (!entry) {
    return (
      <div className={styles.column}>
        <PhaseHeading>Paper report</PhaseHeading>
        <EmptyState
          title="Report not found"
          action={
            <ButtonLink variant="primary" to={paths.exam}>
              Go to Exam
            </ButtonLink>
          }
        >
          <p>COLDBOOT keeps the reports of your last 20 marked papers. Choose one from Past papers on the Exam screen.</p>
        </EmptyState>
      </div>
    );
  }

  const sections = SECTION_IDS.filter((s) => entry.sections[s][1] > 0);
  const earned = sections.reduce((n, s) => n + entry.sections[s][0], 0);
  const available = sections.reduce((n, s) => n + entry.sections[s][1], 0);
  const byKk: KkTally[] = sortKkTallies(entry.kk.map(([kk, e, a]) => ({ kk: kk as KkId, earned: e, available: a })));
  const weakest = weakestKks(byKk);

  return (
    <div className={styles.column}>
      <PhaseHeading focus>Paper report</PhaseHeading>
      <p className={study.lead}>
        {modeName(entry.mode)}, {formatDate(entry.startedAt)}.{fresh ? ' Marking complete: every answer you gave is now recorded toward your mastery.' : ''}
      </p>
      <p className={styles.score}>
        {earned} of {plural(available, 'mark')} ({percent(earned, available)}%)
      </p>

      <h2>By section</h2>
      <ul className={styles.meters}>
        {sections.map((s) => (
          <li key={s}>
            <Meter
              label={`Section ${SECTION_LETTER[s]}, ${SECTION_KIND[s]}`}
              value={entry.sections[s][0]}
              max={entry.sections[s][1]}
              format="count"
              valueText={`${entry.sections[s][0]} of ${entry.sections[s][1]}`}
            />
          </li>
        ))}
      </ul>

      <h2>Time</h2>
      <p>
        You used {formatDuration(entry.usedMs)} of the {formatDuration(entry.allowedMs)} allowed, reading time included.
        {entry.autoSubmitted ? ' Time ran out, so the paper was submitted automatically.' : ''}
      </p>

      <h2>Weakest key knowledge</h2>
      {weakest.length ? (
        <>
          <p>Where this paper dropped the most marks. A focused drill is a good next step.</p>
          <ul className={styles.weak}>
            {weakest.map((t) => (
              <li key={t.kk}>
                <span className={styles.weakText}>
                  <KkTag kk={t.kk} showTitle />
                  <span className={styles.weakMarks}>
                    {t.earned} of {plural(t.available, 'mark')}
                  </span>
                </span>
                <ButtonLink to={drillPath({ kk: t.kk })} aria-label={`Drill ${kkLabel(t.kk)}`}>
                  Drill {t.kk === 'PSM' || t.kk === 'TERMS' ? kkLabel(t.kk) : t.kk}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>You didn't drop a mark on any key knowledge in this paper. Try a full paper, or review from Home.</p>
      )}

      <h2>By key knowledge</h2>
      <p className={study.small}>Weakest first. A question tagged with two key knowledge points counts toward both.</p>
      <ul className={styles.meters}>
        {byKk.map((t) => (
          <li key={t.kk}>
            <Meter
              label={t.kk === 'PSM' || t.kk === 'TERMS' ? kkLabel(t.kk) : <KkTag kk={t.kk} showTitle />}
              value={t.earned}
              max={t.available}
              format="count"
              valueText={`${t.earned} of ${plural(t.available, 'mark')}`}
            />
          </li>
        ))}
      </ul>

      <div className={study.actionsEnd}>
        <ButtonLink variant="primary" to={paths.exam}>
          Back to Exam
        </ButtonLink>
      </div>
    </div>
  );
}

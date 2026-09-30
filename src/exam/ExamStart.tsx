/**
 * The exam's start screen: the rules and timing, "Start full paper" and "Start mini paper"
 * (`/exam?mini=1` puts the mini paper first), the paper in progress when there is one, and the
 * reports of past papers.
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { paths } from '../app/paths';
import { plural, timeOfDay } from '../app/study/format';
import { PhaseHeading } from '../app/study/parts';
import type { ContentIndex } from '../content/loader';
import { freshSeed } from '../games/prng';
import { studyDay } from '../lib/time';
import { useNow } from '../lib/useNow';
import { announce } from '../ui/announce';
import { Button, ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Panel } from '../ui/Panel';
import { examActions } from './actions';
import { DiscardDialog } from './ExamParts';
import { examReportPath, examSitPath, formatDate, modeName } from './links';
import { BLUEPRINTS, assemblePaper } from './paper';
import { paperTiming, useExam, type ExamMode, type ExamPaper, type ExamSummary } from './store';
import { FULL_TIMING, MINI_TIMING, formatDuration, formatTimerWords, timerState } from './timer';
import styles from './Exam.module.css';
import study from '../app/study/study.module.css';

function total(summary: ExamSummary): [number, number] {
  const { a, b, c } = summary.sections;
  return [a[0] + b[0] + c[0], a[1] + b[1] + c[1]];
}

export function ExamStart({ content, mini }: { content: ContentIndex; mini: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const discarded = (location.state as { discarded?: boolean } | null)?.discarded === true;
  const paper = useExam((s) => s.paper);
  const history = useExam((s) => s.history);

  const start = (mode: ExamMode) => {
    const now = Date.now();
    const last = history[history.length - 1]?.caseStudyId;
    const assembled = assemblePaper(content, mode, freshSeed(now), { avoidCaseStudies: last ? [last] : [] });
    const timing = mode === 'full' ? FULL_TIMING : MINI_TIMING;
    if (!examActions.start({ ...assembled, timing }, now)) return;
    announce(`Reading time has started: ${formatTimerWords(timing.readingMs)}. Read the questions and plan your answers; you can answer once writing time starts.`);
    navigate(examSitPath);
  };

  const empty = !content.mcq.length && !content.short.length && !content.caseStudies.length;
  const thin: string[] = [];
  if (!empty) {
    if (content.mcq.length < BLUEPRINTS.full.mcq) thin.push(`There are only ${plural(content.mcq.length, 'multiple-choice question')} so far, so Section A will be shorter.`);
    if (!content.caseStudies.length) thin.push("There's no case study yet, so papers have no Section C.");
  }

  const full = (
    <section className={styles.choice} aria-labelledby="exam-full">
      <h2 id="exam-full">Full paper</h2>
      <p>Like the real exam: 15 minutes of reading time, then 2 hours of writing time.</p>
      <ul>
        <li>Section A: 20 multiple-choice questions, 20 marks</li>
        <li>Section B: short-answer questions, 20 marks</li>
        <li>Section C: a case study with its insert, about 60 marks</li>
      </ul>
      <Button variant={mini ? 'secondary' : 'primary'} onClick={() => start('full')}>
        Start full paper
      </Button>
    </section>
  );
  const miniPaper = (
    <section className={styles.choice} aria-labelledby="exam-mini">
      <h2 id="exam-mini">Mini paper</h2>
      <p>30 minutes: 3 minutes of reading time, then 27 minutes of writing time. Short enough for most days.</p>
      <ul>
        <li>Section A: 10 multiple-choice questions</li>
        <li>Section B: 1 short-answer question</li>
        <li>Section C: 2 to 4 questions on a case study, 10 to 15 marks, with its insert</li>
      </ul>
      <Button variant={mini ? 'primary' : 'secondary'} onClick={() => start('mini')}>
        Start mini paper
      </Button>
    </section>
  );

  return (
    <div className={styles.column}>
      <PhaseHeading focus>Exam</PhaseHeading>
      {discarded ? (
        <p role="status" className={study.notice}>
          Paper discarded. Nothing from it was recorded.
        </p>
      ) : null}
      <p className={study.lead}>Sit a practice paper under exam conditions, then mark it and see where you dropped marks.</p>

      {empty ? (
        <EmptyState
          title="No exam questions yet"
          action={
            <ButtonLink variant="primary" to={paths.home}>
              Go to Home
            </ButtonLink>
          }
        >
          <p>This version of COLDBOOT has no questions to set a paper from. Review flashcards from Home instead.</p>
        </EmptyState>
      ) : (
        <>
          {paper ? <InProgress paper={paper} /> : null}

          <h2>How it works</h2>
          <ul>
            <li>During reading time you can move between questions and read the case study insert, but you can't answer yet.</li>
            <li>The clock runs from the moment you start, even if you leave this screen or close COLDBOOT. There's no pause.</li>
            <li>Your answers save as you go. When writing time ends, your paper is submitted for you.</li>
            <li>
              Multiple-choice questions are marked for you. You mark your written answers against the marking points, then see your report by
              section and by key knowledge.
            </li>
          </ul>

          {thin.length ? (
            <div className={study.notice}>
              {thin.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
          ) : null}

          {paper ? (
            <p>To start another paper, finish or discard the one in progress.</p>
          ) : mini ? (
            <>
              {miniPaper}
              {full}
            </>
          ) : (
            <>
              {full}
              {miniPaper}
            </>
          )}
        </>
      )}

      <h2>Past papers</h2>
      {history.length ? (
        <ul className={styles.history}>
          {[...history].reverse().map((h) => {
            const [earned, available] = total(h);
            return (
              <li key={h.id}>
                <Link to={examReportPath(h.id)}>
                  {modeName(h.mode)}, {formatDate(h.startedAt)} at {timeOfDay(h.startedAt)}
                </Link>
                <span className={styles.historyScore}>
                  {earned} of {available}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No marked papers yet. When you finish marking a paper, its report is kept here so you can come back to it.</p>
      )}
    </div>
  );
}

function InProgress({ paper }: { paper: ExamPaper }) {
  const navigate = useNavigate();
  const [discarding, setDiscarding] = useState(false);
  const now = useNow(15_000);
  const state = timerState(paper, paperTiming(paper), now);
  const toMark = state.phase === 'submitted';
  const started = studyDay(paper.startedAt) === studyDay(now) ? `today at ${timeOfDay(paper.startedAt)}` : `on ${formatDate(paper.startedAt)}`;
  const status =
    state.phase === 'reading'
      ? `Reading time: ${formatDuration(state.phaseLeft)} left.`
      : state.phase === 'writing'
        ? `Writing time: ${formatDuration(state.phaseLeft)} left.`
        : state.expired
          ? 'Time ran out, so it has been submitted. Mark it to see your report.'
          : 'Submitted. Mark it to see your report.';
  return (
    <Panel as="section" bordered className={styles.resume} aria-labelledby="exam-resume">
      <h2 id="exam-resume">{toMark ? 'Paper to mark' : 'Paper in progress'}</h2>
      <p>
        {modeName(paper.mode)}, started {started}. {status}
      </p>
      <div className={study.actions}>
        <ButtonLink variant="primary" to={examSitPath}>
          {toMark ? 'Mark your paper' : 'Resume paper'}
        </ButtonLink>
        <Button variant="quiet" onClick={() => setDiscarding(true)}>
          Stop and discard this paper
        </Button>
      </div>
      <DiscardDialog open={discarding} onClose={() => setDiscarding(false)} onDiscard={() => navigate(paths.exam, { replace: true, state: { discarded: true } })} />
    </Panel>
  );
}

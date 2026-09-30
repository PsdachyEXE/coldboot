/**
 * The paper in progress. The phase comes from the timer state machine: the page re-reads the clock
 * at each phase boundary (and whenever the ticking clock notices one first), stores the automatic
 * submission when writing time runs out, and hands a submitted paper to marking.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '../app/paths';
import { CASE_WIDE_QUERY, CaseStudyLayout, QuestionFigureRefs } from '../app/study/CaseInsert';
import { plural } from '../app/study/format';
import { PhaseHeading } from '../app/study/parts';
import type { ContentIndex } from '../content/loader';
import { isMcq } from '../content/schema';
import { announce } from '../ui/announce';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { openReport } from '../ui/report';
import { useMediaQuery } from '../ui/useMediaQuery';
import { examActions } from './actions';
import { ExamClock, SaveStatus } from './ExamBar';
import { ExamMarking } from './ExamMarking';
import { DiscardDialog, FlagIcon, QuestionList, SectionTabs } from './ExamParts';
import { ExamMcq, ExamShort } from './ExamQuestion';
import { EXAM_PANEL_ID, neighbours, sectionMarks, sectionTabs, tabId, usePaperTimer, usePosition, useQuestionNav, useStickyOffset } from './hooks';
import { SECTION_KIND, SECTION_LETTER, modeName, numberList } from './links';
import { resolvePaper, type ResolvedPaper } from './marking';
import { isAnswered, type ExamPaper, type SectionId } from './store';
import { formatTimerWords, type TimerState } from './timer';
import styles from './Exam.module.css';

export function PaperView({ paper, content }: { paper: ExamPaper; content: ContentIndex }) {
  const { sections, caseStudyId } = paper;
  const resolved = useMemo(() => resolvePaper({ sections, caseStudyId }, content), [sections, caseStudyId, content]);
  const [state, refresh] = usePaperTimer(paper);

  // Writing time ran out (perhaps while the tab was closed): store the automatic submission.
  useEffect(() => {
    if (!state.expired) return;
    examActions.submit();
    announce("Time's up. Your paper has been submitted.", 'assertive');
  }, [state.expired]);

  // Say so when writing time starts while the student is here (not after a reload).
  const previous = useRef(state.phase);
  useEffect(() => {
    if (previous.current === 'reading' && state.phase === 'writing') {
      announce(`Reading time is over. Writing time has started: you have ${formatTimerWords(paper.writingMs)}.`, 'assertive');
    }
    previous.current = state.phase;
  }, [state.phase, paper.writingMs]);

  if (state.phase === 'submitted') return <ExamMarking paper={paper} resolved={resolved} />;
  return <ExamSitting paper={paper} resolved={resolved} phase={state.phase} refresh={refresh} />;
}

interface SittingProps {
  paper: ExamPaper;
  resolved: ResolvedPaper;
  phase: TimerState['phase'];
  refresh(): void;
}

function ExamSitting({ paper, resolved, phase, refresh }: SittingProps) {
  const navigate = useNavigate();
  const wide = useMediaQuery(CASE_WIDE_QUERY);
  const [dialog, setDialog] = useState<'submit' | 'discard' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useStickyOffset(rootRef, barRef);

  const { sections, section, items, index, item } = usePosition(paper, resolved);
  const { go, select } = useQuestionNav(`${section}:${index}`, headingRef);
  const locked = phase === 'reading';

  const refs = useMemo(() => new Set(item && resolved.caseStudy && section === 'c' ? ((item as { figureRefs?: string[] }).figureRefs ?? []) : []), [item, resolved.caseStudy, section]);

  if (!item) {
    return (
      <div className={styles.column}>
        <h1>{modeName(paper.mode)}</h1>
        <p>None of this paper's questions are in this version of COLDBOOT any more. Discard it and start another.</p>
        <Button variant="primary" onClick={() => setDialog('discard')}>
          Stop and discard this paper
        </Button>
        <DiscardDialog open={dialog === 'discard'} onClose={() => setDialog(null)} onDiscard={() => navigate(paths.exam, { replace: true, state: { discarded: true } })} />
      </div>
    );
  }

  const answeredIn = (s: SectionId) => resolved.sections[s].filter((it) => isAnswered(paper.answers[it.id])).length;
  const flagged = paper.flags.includes(item.id);
  const { prev, next } = neighbours(sections, resolved, section, index);
  const answer = paper.answers[item.id];
  const caseQuestion = section === 'c';

  const question = (
    <section className={styles.question} aria-labelledby="exam-question-heading">
      <div className={styles.qhead}>
        <h2 id="exam-question-heading" ref={headingRef} tabIndex={-1} className={styles.qtitle}>
          Question {index + 1} <span className={styles.qmarks}>of {items.length}</span>
          {isMcq(item) ? <span className={styles.qmarks}> (1 mark)</span> : null}
        </h2>
        <Button size="small" onClick={() => examActions.toggleFlag(item.id)}>
          {flagged ? 'Remove flag' : 'Flag for review'}
        </Button>
      </div>
      {flagged ? (
        <p className={styles.flagged}>
          <FlagIcon /> Flagged for review
        </p>
      ) : null}
      {caseQuestion && resolved.caseStudy ? <QuestionFigureRefs cs={resolved.caseStudy} figureRefs={(item as { figureRefs?: string[] }).figureRefs} wide={wide} /> : null}
      {isMcq(item) ? (
        <ExamMcq
          key={item.id}
          mcq={item}
          chosen={typeof answer === 'number' ? answer : undefined}
          locked={locked}
          caseQuestion={caseQuestion}
          onChoose={(i) => examActions.answer(item.id, i)}
          onClear={() => examActions.clearAnswer(item.id)}
        />
      ) : (
        <ExamShort
          key={item.id}
          item={item}
          value={typeof answer === 'string' ? answer : ''}
          locked={locked}
          caseQuestion={caseQuestion}
          onChange={(text) => examActions.answer(item.id, text)}
        />
      )}
      <nav className={styles.qnav} aria-label="Previous and next question">
        {prev ? <Button onClick={() => go(prev.section, prev.index)}>{prev.label}</Button> : null}
        {next ? (
          <Button className={styles.qnavNext} onClick={() => go(next.section, next.index)}>
            {next.label}
          </Button>
        ) : (
          <p className={styles.qnavNext}>{locked ? 'This is the last question.' : 'This is the last question. Submit your paper when you are ready.'}</p>
        )}
      </nav>
      <p>
        <Button variant="quiet" size="small" onClick={() => openReport({ itemId: item.id, where: 'Exam' })}>
          Report a problem
        </Button>
      </p>
    </section>
  );

  const panel = (
    <div>
      <p className={styles.sectionIntro}>
        Section {SECTION_LETTER[section]}, {SECTION_KIND[section]}: {plural(items.length, 'question')}, {plural(sectionMarks(items), 'mark')}.{' '}
        {answeredIn(section)} answered.
      </p>
      <QuestionList
        section={section}
        items={items.map((it) => {
          const answered = isAnswered(paper.answers[it.id]);
          const isFlagged = paper.flags.includes(it.id);
          return { id: it.id, answered, flagged: isFlagged, spoken: [answered ? 'answered' : 'not answered', isFlagged ? 'flagged' : ''].filter(Boolean).join(', ') };
        })}
        current={index}
        onGo={(i) => go(section, i)}
      />
      <p className={styles.legend}>
        <span>Solid box: answered</span>
        <span>Dashed box: not answered</span>
        <span>
          <FlagIcon /> Flagged for review
        </span>
      </p>
      {question}
    </div>
  );

  return (
    <div className={styles.page} ref={rootRef}>
      <PhaseHeading focus>{modeName(paper.mode)}</PhaseHeading>
      <div className={styles.bar} ref={barRef}>
        <ExamClock paper={paper} phase={phase} onPhaseChange={refresh} />
        <div className={styles.barActions}>
          <SaveStatus />
          {locked ? null : (
            <Button variant="primary" onClick={() => setDialog('submit')}>
              Submit paper
            </Button>
          )}
        </div>
      </div>
      {locked ? (
        <div className={styles.notice} role="status">
          <p className={styles.noticeTitle}>Reading time</p>
          <p>Read the questions and the insert, and plan your answers. You can't answer yet: the answer boxes unlock when writing time starts.</p>
        </div>
      ) : null}
      {resolved.missing.length ? (
        <p className={styles.notice}>
          {plural(resolved.missing.length, 'question')} from this paper {resolved.missing.length === 1 ? 'is' : 'are'} no longer in COLDBOOT, so{' '}
          {resolved.missing.length === 1 ? 'it has' : 'they have'} been left out.
        </p>
      ) : null}
      <SectionTabs tabs={sectionTabs(sections, resolved)} current={section} onSelect={select} />
      <div role="tabpanel" id={EXAM_PANEL_ID} aria-labelledby={tabId(section)}>
        {caseQuestion && resolved.caseStudy ? (
          <CaseStudyLayout cs={resolved.caseStudy} refs={refs} wide={wide}>
            {panel}
          </CaseStudyLayout>
        ) : (
          panel
        )}
      </div>
      <div className={styles.footer}>
        <Button variant="quiet" size="small" onClick={() => setDialog('discard')}>
          Stop and discard this paper
        </Button>
      </div>
      <SubmitDialog open={dialog === 'submit'} paper={paper} resolved={resolved} sections={sections} onClose={() => setDialog(null)} />
      <DiscardDialog open={dialog === 'discard'} onClose={() => setDialog(null)} onDiscard={() => navigate(paths.exam, { replace: true, state: { discarded: true } })} />
    </div>
  );
}

function SubmitDialog({
  open,
  paper,
  resolved,
  sections,
  onClose,
}: {
  open: boolean;
  paper: ExamPaper;
  resolved: ResolvedPaper;
  sections: readonly SectionId[];
  onClose(): void;
}) {
  const unanswered = sections
    .map((s) => ({
      s,
      numbers: resolved.sections[s].flatMap((it, i) => (isAnswered(paper.answers[it.id]) ? [] : [i + 1])),
    }))
    .filter((u) => u.numbers.length > 0);
  const total = unanswered.reduce((n, u) => n + u.numbers.length, 0);
  const flags = paper.flags.length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Submit your paper?"
      actions={
        <>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              examActions.submit();
            }}
          >
            Submit paper
          </Button>
          <Button onClick={onClose}>Keep writing</Button>
        </>
      }
    >
      {total === 0 ? (
        <p>You've answered every question.</p>
      ) : (
        <>
          <p>
            <strong>You haven't answered {plural(total, 'question')}:</strong>
          </p>
          <ul>
            {unanswered.map((u) => (
              <li key={u.s}>
                Section {SECTION_LETTER[u.s]}, {u.numbers.length === 1 ? 'question' : 'questions'} {numberList(u.numbers)}
              </li>
            ))}
          </ul>
        </>
      )}
      {flags ? <p>You flagged {plural(flags, 'question')} for review.</p> : null}
      <p>Once you submit, your answers can't be changed. Next you mark the paper.</p>
    </Dialog>
  );
}

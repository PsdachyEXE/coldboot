/**
 * Marking a submitted paper. MCQs are marked automatically; written answers are self-marked by
 * ticking marking points, as in Written. "Finish marking" records every answered item as an
 * attempt, files the summary in history and opens the report.
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '../app/paths';
import { CASE_WIDE_QUERY, CaseStudyLayout, QuestionFigureRefs } from '../app/study/CaseInsert';
import { plural } from '../app/study/format';
import { KkTagList, PhaseHeading } from '../app/study/parts';
import { isMcq } from '../content/schema';
import { recordAttempt } from '../state/record';
import { announce } from '../ui/announce';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { openReport } from '../ui/report';
import { useMediaQuery } from '../ui/useMediaQuery';
import { examActions } from './actions';
import { DiscardDialog, QuestionList, SectionTabs, type QuestionState } from './ExamParts';
import { McqReview, ShortMarking } from './ExamQuestion';
import { EXAM_PANEL_ID, neighbours, sectionTabs, tabId, usePosition, useQuestionNav, useStickyOffset } from './hooks';
import { SECTION_KIND, SECTION_LETTER, examReportPath } from './links';
import { attemptsFor, markPaper, summarise, type ItemMark, type ResolvedPaper } from './marking';
import { examPersistence, type ExamPaper, type SectionId } from './store';
import styles from './Exam.module.css';

function listState(m: ItemMark): QuestionState {
  if (m.kind === 'mcq') {
    return {
      id: m.itemId,
      answered: m.answered,
      flagged: false,
      sub: m.answered ? (m.earned ? '✓' : '✗') : '–',
      spoken: m.answered ? (m.earned ? 'correct' : 'incorrect') : 'not answered',
    };
  }
  return {
    id: m.itemId,
    answered: m.answered,
    flagged: false,
    sub: `${m.earned}/${m.available}`,
    spoken: `${m.earned} of ${plural(m.available, 'mark')}${m.answered ? '' : ', not answered'}`,
  };
}

export function ExamMarking({ paper, resolved }: { paper: ExamPaper; resolved: ResolvedPaper }) {
  const navigate = useNavigate();
  const wide = useMediaQuery(CASE_WIDE_QUERY);
  const [dialog, setDialog] = useState<'finish' | 'discard' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const finished = useRef(false);
  useStickyOffset(rootRef, barRef);

  const { answers, ticks } = paper;
  const marks = useMemo(() => markPaper({ answers, ticks }, resolved), [answers, ticks, resolved]);
  const byItem = useMemo(() => new Map(marks.items.map((m) => [m.itemId, m])), [marks]);
  const { sections, section, items, index, item } = usePosition(paper, resolved);
  const { go, select } = useQuestionNav(`${section}:${index}`, headingRef);
  const caseQuestion = section === 'c';
  const refs = useMemo(() => new Set(item && caseQuestion ? ((item as { figureRefs?: string[] }).figureRefs ?? []) : []), [item, caseQuestion]);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const now = Date.now();
    const summary = summarise(paper, marks, now);
    for (const attempt of attemptsFor(marks, summary.usedMs, now)) recordAttempt(attempt);
    examActions.finish(summary);
    examPersistence.flush();
    announce('Marking complete. Your report is ready.');
    navigate(examReportPath(summary.id), { replace: true, state: { fresh: true } });
  };

  const unmarked = marks.items.filter((m) => m.kind === 'short' && m.answered && !paper.ticks[m.itemId]?.length).length;
  const [earned, available] = marks.sections[section];

  const question = item ? (
    <section className={styles.question} aria-labelledby="exam-question-heading">
      <div className={styles.qhead}>
        <h2 id="exam-question-heading" ref={headingRef} tabIndex={-1} className={styles.qtitle}>
          Question {index + 1} <span className={styles.qmarks}>of {items.length}</span>
          {isMcq(item) ? <span className={styles.qmarks}> (1 mark)</span> : null}
        </h2>
      </div>
      {caseQuestion && resolved.caseStudy ? <QuestionFigureRefs cs={resolved.caseStudy} figureRefs={(item as { figureRefs?: string[] }).figureRefs} wide={wide} /> : null}
      {isMcq(item) ? (
        <>
          <McqReview key={item.id} mcq={item} chosen={typeof answers[item.id] === 'number' ? (answers[item.id] as number) : undefined} caseQuestion={caseQuestion} />
          <KkTagList kks={item.kk} />
        </>
      ) : (
        <ShortMarking
          key={item.id}
          item={item}
          answer={typeof answers[item.id] === 'string' ? (answers[item.id] as string) : undefined}
          ticked={ticks[item.id] ?? []}
          caseQuestion={caseQuestion}
          onTicks={(t) => examActions.setTicks(item.id, t)}
        />
      )}
      <QuestionSteps steps={neighbours(sections, resolved, section, index)} go={go} />
      <p>
        <Button variant="quiet" size="small" onClick={() => openReport({ itemId: item.id, where: 'Exam marking' })}>
          Report a problem
        </Button>
      </p>
    </section>
  ) : null;

  const panel = (
    <div>
      <p className={styles.sectionIntro}>
        Section {SECTION_LETTER[section]}, {SECTION_KIND[section]}: {earned} of {plural(available, 'mark')}.
      </p>
      <QuestionList
        section={section}
        items={items.map((it) => listState(byItem.get(it.id)!))}
        current={index}
        onGo={(i) => go(section, i)}
      />
      <p className={styles.legend}>
        {items.some(isMcq) ? (
          <>
            <span>✓ correct</span>
            <span>✗ incorrect</span>
            <span>– not answered</span>
          </>
        ) : null}
        {items.some((it) => !isMcq(it)) ? (
          <>
            <span>2/3: marks from your ticks</span>
            <span>Dashed box: not answered</span>
          </>
        ) : null}
      </p>
      {question}
    </div>
  );

  return (
    <div className={styles.page} ref={rootRef}>
      <PhaseHeading focus>Mark your paper</PhaseHeading>
      {paper.autoSubmitted ? (
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>Time's up</p>
          <p>Your paper was submitted automatically when writing time ended.</p>
        </div>
      ) : null}
      <p className={styles.column}>
        Multiple-choice questions are marked for you. For each written answer, compare it with the model answer and tick the marking points it
        earned. Then finish marking to see your report.
      </p>
      <div className={styles.bar} ref={barRef}>
        <p className={styles.tally}>
          Marks so far:{' '}
          <strong>
            {marks.total[0]} of {marks.total[1]}
          </strong>
        </p>
        <div className={styles.barActions}>
          <Button variant="primary" onClick={() => setDialog('finish')}>
            Finish marking
          </Button>
        </div>
      </div>
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
      <Dialog
        open={dialog === 'finish'}
        onClose={() => setDialog(null)}
        title="Finish marking?"
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => {
                setDialog(null);
                finish();
              }}
            >
              Finish marking
            </Button>
            <Button onClick={() => setDialog(null)}>Keep marking</Button>
          </>
        }
      >
        {unmarked ? (
          <p>
            <strong>
              {plural(unmarked, 'written answer')} {unmarked === 1 ? 'has' : 'have'} no marking points ticked, so {unmarked === 1 ? 'it scores' : 'they score'} 0.
            </strong>
          </p>
        ) : (
          <p>Every written answer has been marked.</p>
        )}
        <p>
          Your report shows your marks by section and by key knowledge. Every answer you gave is recorded toward your mastery, and the marks can't be
          changed afterwards.
        </p>
      </Dialog>
      <DiscardDialog open={dialog === 'discard'} onClose={() => setDialog(null)} onDiscard={() => navigate(paths.exam, { replace: true, state: { discarded: true } })} />
    </div>
  );
}

function QuestionSteps({ steps, go }: { steps: ReturnType<typeof neighbours>; go(section: SectionId, index: number): void }) {
  const { prev, next } = steps;
  return (
    <nav className={styles.qnav} aria-label="Previous and next question">
      {prev ? <Button onClick={() => go(prev.section, prev.index)}>{prev.label}</Button> : null}
      {next ? (
        <Button className={styles.qnavNext} onClick={() => go(next.section, next.index)}>
          {next.label}
        </Button>
      ) : (
        <p className={styles.qnavNext}>This is the last question. Finish marking when you are ready.</p>
      )}
    </nav>
  );
}

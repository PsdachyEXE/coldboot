/**
 * The paper's clock and save state. The clock ticks every second in Martian Mono; the warnings at
 * 30, 10, 5 and 1 minutes left are spoken once each (remembered in the store, so a reload doesn't
 * repeat them) and stay visible until the next one.
 */
import { useEffect, useRef, useState } from 'react';
import { useNow } from '../lib/useNow';
import { useStorageHealth } from '../state/storage';
import { announce } from '../ui/announce';
import { examPersistence, paperTiming, useExam, type ExamPaper } from './store';
import { activeWarning, formatTimer, formatTimerWords, timerState, warningText, warningsDue, type TimerPhase } from './timer';
import styles from './Exam.module.css';

export interface ExamClockProps {
  paper: ExamPaper;
  /** The phase the page is showing; when the clock sees another, it calls `onPhaseChange`. */
  phase: TimerPhase;
  onPhaseChange(): void;
}

export function ExamClock({ paper, phase, onPhaseChange }: ExamClockProps) {
  const now = useNow(1000);
  const timing = paperTiming(paper);
  const state = timerState(paper, timing, now);
  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  });

  // A background tab may have slowed the page's own boundary timer: catch up here.
  useEffect(() => {
    if (state.phase !== phase) onPhaseChangeRef.current();
  }, [state.phase, phase]);

  const due = warningsDue(state, timing, paper.warned);
  useEffect(() => {
    if (!due.marks.length) return;
    useExam.getState().noteWarned(due.marks);
    if (due.announce !== null) announce(warningText(due.announce, due.late), 'assertive');
  }, [due.marks, due.announce, due.late]);

  if (state.phase !== 'reading' && state.phase !== 'writing') return null;
  const reading = state.phase === 'reading';
  const label = reading ? 'Reading time' : 'Writing time';
  const warning = activeWarning(state, timing);
  return (
    <>
      <p className={styles.clock} role="timer" aria-label={`${label} left: ${formatTimerWords(state.phaseLeft)}`}>
        <span className={styles.clockLabel}>{label}</span>
        <span className={styles.clockTime} data-low={!reading && state.phaseLeft <= 5 * 60_000 ? 'true' : 'false'}>
          {formatTimer(state.phaseLeft)}
        </span>
      </p>
      {warning !== null ? <p className={styles.warning}>{warningText(warning, true)}</p> : null}
    </>
  );
}

/**
 * "Saved" once a change has reached storage, "Saving" just after one, and a plain warning when the
 * browser isn't saving. Only answers and flags count as changes (moving between questions is saved
 * too, but saying so on every move would be noise).
 */
export function SaveStatus() {
  const ok = useStorageHealth((s) => s.ok);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useExam.subscribe((s, prev) => {
      if (s.paper?.answers === prev.paper?.answers && s.paper?.flags === prev.paper?.flags) return;
      setSaving(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        examPersistence.flush();
        setSaving(false);
      }, 600);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      examPersistence.flush();
    };
  }, []);
  if (!ok) {
    return (
      <p className={styles.save} data-state="problem">
        Not saving: keep this tab open until you submit
      </p>
    );
  }
  return <p className={styles.save}>{saving ? 'Saving' : 'Saved'}</p>;
}

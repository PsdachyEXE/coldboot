/**
 * One short answer (Written, Section B and C style). Shows the command term, the marks and a
 * suggested length; the student writes in a plain text area (kept as a draft in sessionStorage),
 * then reveals the model answer and ticks the marking points they earned. The score is the ticked
 * marks, capped at the marks available, over the marks available.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { suggestedLength } from '../../content/commandTerms';
import type { ShortAnswer } from '../../content/schema';
import { recordAttempt } from '../../state/record';
import { announce } from '../../ui/announce';
import { Button } from '../../ui/Button';
import { TextArea } from '../../ui/Field';
import { Markdown } from '../../ui/Markdown';
import { openReport } from '../../ui/report';
import { clearDraft, readDraft, writeDraft } from './drafts';
import { plural } from './format';
import { ItemFigures } from './ItemFigures';
import { MarkingPoints, ModelAnswer } from './MarkingPoints';
import { KkTagList, MistakeNote } from './parts';
import styles from './Written.module.css';
import study from './study.module.css';
import { markScore, tickedMarks, type WrittenResult } from './written';

export interface WrittenQuestionProps {
  item: ShortAnswer;
  position?: string;
  where: string;
  onScored?(result: WrittenResult): void;
  next?: { label: string; onNext(): void };
  autoFocus?: boolean;
  /** A score saved earlier in this session (case study navigation): shown as already marked. */
  saved?: WrittenResult | null;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WrittenQuestion({ item, position, where, onScored, next, autoFocus = false, saved = null }: WrittenQuestionProps) {
  const [answer, setAnswer] = useState(() => saved?.answer ?? readDraft(item.id));
  const [phase, setPhase] = useState<'writing' | 'marking' | 'scored'>(saved ? 'scored' : 'writing');
  const [ticked, setTicked] = useState<Set<number>>(() => new Set(saved?.ticked ?? []));
  const [result, setResult] = useState<WrittenResult | null>(saved);
  const [shownAt] = useState(() => Date.now());
  const promptId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const modelRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const savedOnce = useRef(saved !== null);

  useEffect(() => {
    if (autoFocus) regionRef.current?.focus();
  }, [autoFocus]);

  const onChange = (text: string) => {
    setAnswer(text);
    writeDraft(item.id, text);
  };

  const reveal = () => setPhase('marking');
  useEffect(() => {
    if (phase === 'marking') modelRef.current?.focus();
  }, [phase]);

  const toggle = (i: number, on: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(i);
      else next.delete(i);
      return next;
    });

  const { earned, score } = markScore(item, ticked);

  const save = () => {
    if (savedOnce.current) return;
    savedOnce.current = true;
    const now = Date.now();
    recordAttempt({ itemId: item.id, kk: item.kk, score, timestamp: now, ms: now - shownAt });
    clearDraft(item.id);
    const r: WrittenResult = { itemId: item.id, kk: [...item.kk], ticked: [...ticked].sort((a, b) => a - b), answer, earned, marks: item.marks, score };
    setResult(r);
    setPhase('scored');
    announce(`Score saved: ${earned} of ${plural(item.marks, 'mark')}.`);
    onScored?.(r);
  };

  useEffect(() => {
    if (phase === 'scored' && !saved) nextRef.current?.focus();
  }, [phase, saved]);

  return (
    <section ref={regionRef} tabIndex={-1} aria-labelledby={promptId} className={styles.question}>
      {position ? <p className={study.progress}>{position}</p> : null}
      <p className={styles.meta}>
        <strong>{capitalise(item.commandTerm)}</strong> <span className={styles.marks}>({plural(item.marks, 'mark')})</span>
      </p>
      <ItemFigures figures={item.figures} />
      <div id={promptId} className={styles.prompt}>
        <Markdown text={item.prompt} />
      </div>

      <TextArea
        label="Your answer"
        hint={`Suggested length: ${suggestedLength(item.marks)}`}
        rows={Math.min(14, 4 + item.marks * 2)}
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        readOnly={phase !== 'writing'}
        spellCheck
        width="full"
        className={styles.answer}
      />

      {phase === 'writing' ? (
        <div className={study.actions}>
          <Button variant="primary" onClick={reveal}>
            Show model answer
          </Button>
          {answer.trim() === '' ? <span className={study.keys}>Write your answer first; it stays here if you leave and come back.</span> : null}
        </div>
      ) : (
        <>
          <ModelAnswer model={item.model} headingId={`${promptId}-model`} headingRef={modelRef} />
          <MarkingPoints points={item.points} ticked={ticked} onToggle={toggle} disabled={phase === 'scored'} />

          {phase === 'marking' ? (
            <>
              <p className={styles.tally}>
                Your mark: {earned} of {plural(item.marks, 'mark')}
                {tickedMarks(item, ticked) > item.marks ? ' (capped at the marks available)' : ''}
              </p>
              <div className={study.actions}>
                <Button variant="primary" onClick={save}>
                  Save score
                </Button>
              </div>
            </>
          ) : result ? (
            <>
              <p className={styles.saved}>
                Score saved: {result.earned} of {plural(result.marks, 'mark')}.
              </p>
              {item.mistake ? <MistakeNote text={item.mistake} /> : null}
              <KkTagList kks={item.kk} />
              <div className={study.actions}>
                {next ? (
                  <Button ref={nextRef} variant="primary" onClick={next.onNext}>
                    {next.label}
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </>
      )}
      <p>
        <Button variant="quiet" size="small" onClick={() => openReport({ itemId: item.id, where })}>
          Report a problem
        </Button>
      </p>
    </section>
  );
}

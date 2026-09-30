/**
 * The exam's question bodies. While sitting: MCQ options as radios and written answers in a text
 * area, both locked during reading time. While marking: MCQs auto-marked with the answer, the
 * explanation and why each distractor is wrong; written answers beside the model answer with the
 * marking points to tick (the same pieces Written uses).
 */
import { useId } from 'react';
import { ItemFigures } from '../app/study/ItemFigures';
import { MarkingPoints, ModelAnswer } from '../app/study/MarkingPoints';
import { KkTagList, MistakeNote } from '../app/study/parts';
import { plural } from '../app/study/format';
import { markScore, tickedMarks } from '../app/study/written';
import drill from '../app/study/Drill.module.css';
import written from '../app/study/Written.module.css';
import { suggestedLength } from '../content/commandTerms';
import type { Mcq, ShortAnswer } from '../content/schema';
import { LETTERS } from '../games/answers';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/Field';
import { Feedback } from '../ui/Feedback';
import { Markdown } from '../ui/Markdown';
import { VisuallyHidden } from '../ui/VisuallyHidden';
import { isAnswered } from './store';
import styles from './Exam.module.css';

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface ExamMcqProps {
  mcq: Mcq;
  chosen: number | undefined;
  /** Reading time: the options can be read but not chosen. */
  locked: boolean;
  onChoose(index: number): void;
  onClear(): void;
}

/** An MCQ while sitting the paper: choose an option (no feedback until the paper is marked). */
export function ExamMcq({ mcq, chosen, locked, onChoose, onClear }: ExamMcqProps) {
  const name = useId();
  return (
    <>
      <ItemFigures figures={mcq.figures} />
      <div className={drill.stem}>
        <Markdown text={mcq.stem} />
      </div>
      <fieldset className={[drill.options, locked ? styles.locked : ''].filter(Boolean).join(' ')} disabled={locked}>
        <legend className={drill.legend}>
          <VisuallyHidden>{locked ? 'Options (you can choose once writing time starts)' : 'Choose an answer'}</VisuallyHidden>
        </legend>
        {mcq.options.map((option, i) => (
          <label key={i} className={drill.option} data-state={chosen === i ? 'selected' : 'idle'}>
            <input type="radio" name={name} value={i} checked={chosen === i} onChange={() => onChoose(i)} className={drill.radio} />
            <span className={drill.letter} aria-hidden="true">
              {LETTERS[i]}
            </span>
            <span className={drill.optionBody}>
              <VisuallyHidden>{`${LETTERS[i]}. `}</VisuallyHidden>
              <Markdown inline text={option} />
            </span>
          </label>
        ))}
      </fieldset>
      {chosen !== undefined && !locked ? (
        <p className={styles.clear}>
          <Button variant="quiet" size="small" onClick={onClear}>
            Clear answer
          </Button>
        </p>
      ) : null}
    </>
  );
}

/** An MCQ once the paper is submitted: marked, with the answer, the explanation and why each distractor is wrong. */
export function McqReview({ mcq, chosen }: { mcq: Mcq; chosen: number | undefined }) {
  const name = useId();
  const answered = chosen !== undefined;
  const correct = chosen === mcq.answer;
  const letter = LETTERS[mcq.answer];
  return (
    <>
      <ItemFigures figures={mcq.figures} />
      <div className={drill.stem}>
        <Markdown text={mcq.stem} />
      </div>
      <fieldset className={drill.options} disabled>
        <legend className={drill.legend}>
          <VisuallyHidden>Options</VisuallyHidden>
        </legend>
        {mcq.options.map((option, i) => {
          const isAnswer = i === mcq.answer;
          const isChosen = i === chosen;
          return (
            <label key={i} className={drill.option} data-state={isAnswer ? 'answer' : isChosen ? 'wrong' : 'other'}>
              <input type="radio" name={name} value={i} checked={isChosen} readOnly className={drill.radio} aria-describedby={isAnswer ? undefined : `${name}-why-${i}`} />
              <span className={drill.letter} aria-hidden="true">
                {LETTERS[i]}
              </span>
              <span className={drill.optionBody}>
                <VisuallyHidden>{`${LETTERS[i]}. `}</VisuallyHidden>
                <Markdown inline text={option} />
                {isAnswer || isChosen ? (
                  <span className={drill.mark} data-mark={isAnswer ? 'answer' : 'wrong'}>
                    <span aria-hidden="true">{isAnswer ? '✓' : '✗'}</span> {isAnswer ? (isChosen ? 'Your answer is correct' : 'Correct answer') : 'Your answer'}
                  </span>
                ) : null}
                {!isAnswer ? (
                  <span className={drill.why} id={`${name}-why-${i}`}>
                    <Markdown inline text={mcq.whyWrong[i]} />
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>
      {answered ? (
        <Feedback correct={correct} announce={false} cue={false} className={drill.feedback}>
          <p>
            The answer is <strong>{letter}</strong>: <Markdown inline text={mcq.options[mcq.answer]} />
          </p>
          <Markdown text={mcq.explanation} />
        </Feedback>
      ) : (
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>Not answered, so no mark</p>
          <p>
            The answer is <strong>{letter}</strong>: <Markdown inline text={mcq.options[mcq.answer]} />
          </p>
          <Markdown text={mcq.explanation} />
        </div>
      )}
    </>
  );
}

function ShortMeta({ item }: { item: ShortAnswer }) {
  return (
    <p className={written.meta}>
      <strong>{capitalise(item.commandTerm)}</strong> <span className={written.marks}>({plural(item.marks, 'mark')})</span>
    </p>
  );
}

export interface ExamShortProps {
  item: ShortAnswer;
  value: string;
  locked: boolean;
  onChange(text: string): void;
}

/** A written answer while sitting the paper. The hint sizes the answer from the marks. */
export function ExamShort({ item, value, locked, onChange }: ExamShortProps) {
  return (
    <>
      <ShortMeta item={item} />
      <ItemFigures figures={item.figures} />
      <div className={written.prompt}>
        <Markdown text={item.prompt} />
      </div>
      <TextArea
        label="Your answer"
        hint={`Suggested length: ${suggestedLength(item.marks)}${locked ? ' You can write once writing time starts.' : ''}`}
        rows={Math.min(14, 4 + item.marks * 2)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        spellCheck
        width="full"
        className={written.answer}
      />
    </>
  );
}

export interface ShortMarkingProps {
  item: ShortAnswer;
  answer: string | undefined;
  ticked: readonly number[];
  onTicks(ticked: number[]): void;
}

/** A written answer being self-marked: the answer as written, the model answer and the marking points. */
export function ShortMarking({ item, answer, ticked, onTicks }: ShortMarkingProps) {
  const headingId = useId();
  const answered = isAnswered(answer);
  const set = new Set(ticked);
  const { earned } = markScore(item, set);
  const toggle = (i: number, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(i);
    else next.delete(i);
    onTicks([...next]);
  };
  return (
    <>
      <ShortMeta item={item} />
      <ItemFigures figures={item.figures} />
      <div className={written.prompt}>
        <Markdown text={item.prompt} />
      </div>
      <h3 className={styles.subhead}>Your answer</h3>
      {answered ? <div className={styles.yourAnswer}>{answer}</div> : <p>You didn't answer this question, so it scores 0.</p>}
      <ModelAnswer model={item.model} headingId={`${headingId}-model`} />
      <MarkingPoints points={item.points} ticked={set} onToggle={toggle} disabled={!answered} />
      {answered ? (
        <p className={written.tally}>
          Your mark: {earned} of {plural(item.marks, 'mark')}
          {tickedMarks(item, set) > item.marks ? ' (capped at the marks available)' : ''}
        </p>
      ) : null}
      {item.mistake ? <MistakeNote text={item.mistake} /> : null}
      <KkTagList kks={item.kk} />
    </>
  );
}

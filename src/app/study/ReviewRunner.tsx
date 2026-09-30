/**
 * A review session over a fixed queue, used by the Review screen and step 1 of Today's run.
 *
 * Space flips (the "Show answer" button does the same), 1 to 4 rate Again, Hard, Good or Easy, and
 * R reports the card. Each rating stores the SM-2 schedule, counts a new card toward the day's limit
 * the first time it is rated, and records the attempt. A card rated Again comes back 10 minutes
 * later in the same session; when only those cards are left, the runner shows the wait and offers
 * to finish now.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ContentIndex } from '../../content/loader';
import type { Card } from '../../content/schema';
import { studyDay } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import { useExamAt } from '../../srs/hooks';
import { directionFor, type QueueEntry } from '../../srs/queue';
import { RATINGS, RATING_LABELS, RATING_SCORE, schedule, type Rating, type ScheduleResult } from '../../srs/sm2';
import { recordAttempt } from '../../state/record';
import { useSrs } from '../../state/srs';
import { Button } from '../../ui/Button';
import { Kbd } from '../../ui/Kbd';
import { useReducedMotion } from '../../ui/motion';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { openReport } from '../../ui/report';
import { formatInterval, formatWait, plural } from './format';
import { capNote } from './ratings';
import { isActivatingTarget, useShortcuts } from './keys';
import { ReviewCard } from './ReviewCard';
import styles from './Review.module.css';
import study from './study.module.css';

export interface ReviewSummary {
  /** Ratings given, counting a card rated Again and then again later twice. */
  ratings: number;
  /** Distinct cards rated. */
  cards: number;
  /** New cards rated for the first time. */
  newCards: number;
  /** Ratings of Again. */
  again: number;
  /** True when the student finished before the queue was empty. */
  finishedEarly: boolean;
}

interface Pending extends QueueEntry {
  /** Epoch ms from which the entry can be shown (0 for the original queue). */
  availableAt: number;
  /** Unique per appearance, for React keys and focus. */
  seq: number;
}

interface RunnerState {
  current: Pending | null;
  rest: Pending[];
  flipped: boolean;
  shownAt: number;
  ratings: number;
  cardIds: string[];
  newCards: number;
  again: number;
  nextSeq: number;
}

/**
 * Takes the next entry to show out of `rest`: a card rated Again whose 10 minutes are up comes
 * first (they are appended in the order they fall due), then the next card of the original queue.
 */
function promote(rest: Pending[], now: number): { current: Pending | null; rest: Pending[] } {
  let i = rest.findIndex((e) => e.availableAt > 0 && e.availableAt <= now);
  if (i === -1) i = rest.findIndex((e) => e.availableAt <= now);
  if (i === -1) return { current: null, rest };
  return { current: rest[i], rest: [...rest.slice(0, i), ...rest.slice(i + 1)] };
}

function cardOf(content: ContentIndex, id: string): Card | null {
  const entry = content.byId.get(id);
  return entry?.kind === 'card' ? entry.item : null;
}

export interface ReviewRunnerProps {
  content: ContentIndex;
  queue: readonly QueueEntry[];
  /** Context for content reports. */
  where: string;
  onFinish(summary: ReviewSummary): void;
  /** Focus the first card when the runner mounts (after a button press, not on page load). */
  autoFocus?: boolean;
}

export function ReviewRunner({ content, queue, where, onFinish, autoFocus = true }: ReviewRunnerProps) {
  const examAt = useExamAt();
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<RunnerState>(() => {
    const pending = queue
      .filter((e) => cardOf(content, e.cardId))
      .map((e, i): Pending => ({ ...e, availableAt: 0, seq: i }));
    return {
      ...promote(pending, 0),
      flipped: false,
      shownAt: Date.now(),
      ratings: 0,
      cardIds: [],
      newCards: 0,
      again: 0,
      nextSeq: pending.length,
    };
  });
  const { current, rest, flipped } = state;
  const card = current ? cardOf(content, current.cardId) : null;

  // Report the summary once, when nothing is left.
  const finished = useRef(false);
  const summaryOf = (s: RunnerState, early: boolean): ReviewSummary => ({
    ratings: s.ratings,
    cards: s.cardIds.length,
    newCards: s.newCards,
    again: s.again,
    finishedEarly: early,
  });
  const finish = (early: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(summaryOf(state, early));
  };
  const empty = !current && rest.length === 0;
  useEffect(() => {
    if (empty && !finished.current) {
      finished.current = true;
      onFinish(summaryOf(state, false));
    }
  });

  // Focus the card when it changes or flips, so the new content is read and keys land on it.
  const focusKey = current ? `${current.seq}:${flipped}` : 'none';
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (!autoFocus) return;
    }
    if (current) cardRef.current?.focus();
  }, [focusKey, current, autoFocus]);

  const flip = () => setState((s) => (s.current && !s.flipped ? { ...s, flipped: true } : s));

  // Guards against a second rating of the same appearance (a fast double key press).
  const ratedSeq = useRef(-1);
  const rate = (rating: Rating) => {
    if (!current || !card || !flipped || ratedSeq.current === current.seq) return;
    ratedSeq.current = current.seq;
    const now = Date.now();
    const srs = useSrs.getState();
    const result = schedule(srs.cards[card.id], rating, now, { examAt });
    srs.setCard(card.id, result.next);
    if (current.isNew) srs.noteIntroduced(studyDay(now));
    recordAttempt({ itemId: card.id, kk: card.kk, score: RATING_SCORE[rating], timestamp: now, ms: now - state.shownAt }, { review: true });
    setState((s) => {
      const requeued: Pending[] =
        result.requeueAfterMs !== null
          ? [{ cardId: card.id, isNew: false, direction: directionFor(card, result.next.reps), availableAt: now + result.requeueAfterMs, seq: s.nextSeq }]
          : [];
      const next = promote([...s.rest, ...requeued], now);
      return {
        ...next,
        flipped: false,
        shownAt: now,
        ratings: s.ratings + 1,
        cardIds: s.cardIds.includes(card.id) ? s.cardIds : [...s.cardIds, card.id],
        newCards: s.newCards + (current.isNew ? 1 : 0),
        again: s.again + (rating === 1 ? 1 : 0),
        nextSeq: s.nextSeq + requeued.length,
      };
    });
  };

  const wake = useCallback(() => setState((s) => (s.current ? s : { ...s, ...promote(s.rest, Date.now()), shownAt: Date.now() })), []);

  const report = () => {
    if (card) openReport({ itemId: card.id, where });
  };

  useShortcuts((e) => {
    if (!current) return;
    if (e.key === ' ' || e.key === 'Spacebar') {
      if (isActivatingTarget(e.target)) return;
      if (!flipped) {
        e.preventDefault();
        flip();
      }
      return;
    }
    if (flipped && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      rate(Number(e.key) as Rating);
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      report();
    }
  }, !empty);

  if (empty) return null;

  if (!current || !card) {
    const wakeAt = Math.min(...rest.map((e) => e.availableAt));
    return (
      <WaitPanel
        wakeAt={wakeAt}
        waiting={rest.length}
        onReady={wake}
        onFinish={() => finish(true)}
      />
    );
  }

  const remaining = rest.length + 1;
  const done = state.ratings;
  const position = `Card ${done + 1} of ${done + remaining}`;
  const prev = useSrs.getState().cards[card.id];
  const previews = RATINGS.map((r) => schedule(prev, r, state.shownAt, { examAt }));

  return (
    <div className={styles.runner}>
      <ReviewCard
        key={current.seq}
        ref={cardRef}
        card={card}
        direction={current.direction}
        flipped={flipped}
        isNew={current.isNew}
        position={position}
        animate={!reduced}
      />
      {flipped ? (
        <RatingButtons previews={previews} now={state.shownAt} onRate={rate} />
      ) : (
        <div className={study.actions}>
          <Button variant="primary" onClick={flip} aria-keyshortcuts="Space">
            Show answer
          </Button>
          <span className={study.keys}>
            or press <Kbd>Space</Kbd>
          </span>
        </div>
      )}
      <div className={styles.runnerFoot}>
        <Button variant="quiet" size="small" onClick={report} aria-keyshortcuts="R">
          Report a problem
          <span className={study.keyOnly} aria-hidden="true">
            <Kbd>R</Kbd>
          </span>
        </Button>
        <Button variant="quiet" size="small" onClick={() => finish(true)}>
          Finish review
        </Button>
      </div>
    </div>
  );
}

function RatingButtons({ previews, now, onRate }: { previews: ScheduleResult[]; now: number; onRate(r: Rating): void }) {
  const questionId = useId();
  const noteId = useId();
  const note = capNote(previews, now);
  return (
    <div className={styles.rateBlock}>
      <p className={styles.rateQuestion} id={questionId}>
        How well did you recall it?
      </p>
      <div className={styles.rates} role="group" aria-labelledby={questionId} aria-describedby={note ? noteId : undefined}>
        {RATINGS.map((r, i) => {
          const res = previews[i];
          const when = res.requeueAfterMs !== null ? formatWait(res.requeueAfterMs) : formatInterval(res.next.interval);
          return (
            <Button key={r} className={styles.rate} onClick={() => onRate(r)} aria-keyshortcuts={String(r)} data-rating={r}>
              <span className={styles.rateLabel}>{RATING_LABELS[r]}</span>
              <VisuallyHidden>, comes back in</VisuallyHidden>{' '}
              <span className={styles.rateWhen}>{when}</span>
              <span className={`${styles.rateKey} ${study.keyOnly}`} aria-hidden="true">
                <Kbd>{r}</Kbd>
              </span>
            </Button>
          );
        })}
      </div>
      {note ? (
        <p className={study.hint} id={noteId}>
          {note}
        </p>
      ) : null}
      <p className={study.hint}>
        <span className={study.keyOnly}>
          Press <Kbd>1</Kbd> to <Kbd>4</Kbd> to rate.{' '}
        </span>
        The time on each rating is when the card comes back.
      </p>
    </div>
  );
}

function WaitPanel({ wakeAt, waiting, onReady, onFinish }: { wakeAt: number; waiting: number; onReady(): void; onFinish(): void }) {
  const now = useNow(1000);
  const titleId = useId();
  const ready = now >= wakeAt;
  useEffect(() => {
    if (ready) onReady();
  }, [ready, onReady]);
  // Wake exactly on time as well, since a background tab may slow the 1 s tick.
  useEffect(() => {
    const t = setTimeout(onReady, Math.max(0, wakeAt - Date.now()) + 20);
    return () => clearTimeout(t);
  }, [wakeAt, onReady]);
  return (
    <section className={styles.wait} aria-labelledby={titleId}>
      <h2 id={titleId}>Next card in {formatWait(wakeAt - now)}</h2>
      <p>
        {waiting === 1 ? 'The card' : `The ${plural(waiting, 'card')}`} you rated Again {waiting === 1 ? 'comes' : 'come'} back 10 minutes after you
        rated {waiting === 1 ? 'it' : 'them'}. Wait here, or finish now: {waiting === 1 ? "it's" : "they're"} due again tomorrow either way.
      </p>
      <div className={study.actions}>
        <Button variant="primary" onClick={onFinish}>
          Finish now
        </Button>
      </div>
    </section>
  );
}

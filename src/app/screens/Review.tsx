/**
 * Review (Section 6.3): flashcards scheduled by SM-2. "Start review" runs the queue (due cards,
 * then new cards coverage-first) and ends at "Review complete". `/review?kk=U3O1-KK04` focuses the
 * queue on one KK.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import type { KkId } from '../../content/schema';
import { kkLabel } from '../../content/studyDesign';
import { useNow } from '../../lib/useNow';
import { masteryNow, useDueSummary, useMastery } from '../../srs/hooks';
import type { QueueEntry } from '../../srs/queue';
import { useSettings } from '../../state/settings';
import { useSrs } from '../../state/srs';
import { Button, ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Kbd } from '../../ui/Kbd';
import { drillPath, paths } from '../paths';
import { ContentGate } from '../study/ContentGate';
import { describeDue, plural } from '../study/format';
import { PhaseHeading } from '../study/parts';
import { ReviewRunner, type ReviewSummary } from '../study/ReviewRunner';
import { reviewQueue } from '../study/reviewQueue';
import { isKnownKk } from '../study/select';
import study from '../study/study.module.css';

export default function Review() {
  const [params] = useSearchParams();
  const kkParam = params.get('kk');
  const kk = isKnownKk(kkParam) ? kkParam : null;
  return (
    <div className={study.page}>
      <ContentGate heading="Review">
        {(content) => <ReviewScreen key={kkParam ?? ''} content={content} kk={kk} invalid={kkParam !== null && !kk} />}
      </ContentGate>
    </div>
  );
}

type Phase = { name: 'start' } | { name: 'active'; queue: QueueEntry[] } | { name: 'complete'; summary: ReviewSummary };

function ReviewScreen({ content, kk, invalid }: { content: ContentIndex; kk: KkId | null; invalid: boolean }) {
  const [phase, setPhase] = useState<Phase>({ name: 'start' });
  const now = useNow(60_000);
  const mastery = useMastery();
  const cards = useSrs((s) => s.cards);
  const introduced = useSrs((s) => s.introduced);
  const limit = useSettings((s) => s.newCardLimit);
  const queue = useMemo(() => reviewQueue(content, { cards, introduced }, limit, mastery, now, kk), [content, cards, introduced, limit, mastery, now, kk]);

  const start = () => {
    const t = Date.now();
    setPhase({ name: 'active', queue: reviewQueue(content, useSrs.getState(), useSettings.getState().newCardLimit, masteryNow(t), t, kk) });
  };

  if (phase.name === 'active') {
    return (
      <>
        <h1>Review</h1>
        {kk ? <FocusLine kk={kk} /> : null}
        <ReviewRunner content={content} queue={phase.queue} where="Review" onFinish={(summary) => setPhase({ name: 'complete', summary })} />
      </>
    );
  }
  if (phase.name === 'complete') return <ReviewComplete summary={phase.summary} kk={kk} />;

  const due = queue.filter((e) => !e.isNew).length;
  const fresh = queue.length - due;
  return (
    <>
      <h1>Review</h1>
      {invalid ? (
        <p className={study.notice}>That link names key knowledge COLDBOOT doesn't have, so this review covers every key knowledge point.</p>
      ) : null}
      {kk ? <FocusLine kk={kk} /> : null}
      {queue.length === 0 ? (
        <NothingToReview content={content} kk={kk} now={now} />
      ) : (
        <>
          <p className={study.lead}>{readyLine(due, fresh)}</p>
          <div className={study.actions}>
            <Button variant="primary" onClick={start}>
              Start review
            </Button>
          </div>
          <p className={study.keys}>
            <Kbd>Space</Kbd> shows the answer, <Kbd>1</Kbd> to <Kbd>4</Kbd> rate it, and <Kbd>R</Kbd> reports a problem with the card.
          </p>
        </>
      )}
    </>
  );
}

function readyLine(due: number, fresh: number): string {
  const dueText = `${plural(due, 'card')} ${due === 1 ? 'is' : 'are'} due`;
  const newText = `${plural(fresh, 'new card')} ${fresh === 1 ? 'is' : 'are'} ready`;
  if (due && fresh) return `${dueText} and ${newText}.`;
  return `${due ? dueText : newText}.`;
}

function FocusLine({ kk }: { kk: KkId }) {
  return (
    <p>
      Only the cards for {kkLabel(kk)}. <Link to={paths.review}>Review every key knowledge point</Link>
    </p>
  );
}

function NothingToReview({ content, kk, now }: { content: ContentIndex; kk: KkId | null; now: number }) {
  const { nextDue, newRemaining } = useDueSummary(now);
  const limit = useSettings((s) => s.newCardLimit);
  const srsCards = useSrs((s) => s.cards);
  const inScope = kk ? (content.byKk.get(kk)?.cards ?? []) : content.cards.map((c) => c.id);
  // Offer a drill only where there are questions to drill; otherwise the map shows what there is.
  const canDrill = kk ? (content.byKk.get(kk)?.mcq.length ?? 0) > 0 : content.mcq.length > 0;
  const drill = !canDrill ? paths.map : kk ? drillPath({ kk }) : paths.drill;
  const drillLabel = !canDrill ? 'Open the syllabus map' : kk ? 'Drill this key knowledge' : 'Go to Drill';

  if (inScope.length === 0) {
    return (
      <EmptyState
        title="No flashcards yet"
        action={
          <ButtonLink variant="primary" to={drill}>
            {drillLabel}
          </ButtonLink>
        }
      >
        <p>
          {kk ? `There are no flashcards for ${kkLabel(kk)} yet.` : 'This version of COLDBOOT has no flashcards yet.'}{' '}
          {canDrill
            ? kk
              ? 'Practise its multiple-choice questions in a drill instead.'
              : 'Practise multiple-choice questions in a drill instead.'
            : 'The syllabus map shows what you can practise now.'}
        </p>
      </EmptyState>
    );
  }

  const unseenLeft = inScope.some((id) => !srsCards[id]);
  return (
    <EmptyState
      title="No reviews due"
      action={
        <ButtonLink variant="primary" to={drill}>
          {drillLabel}
        </ButtonLink>
      }
    >
      <p>{nextDue !== null ? `Your next review is due ${describeDue(nextDue, now)}.` : "You've reviewed every card that's due."}</p>
      {unseenLeft && newRemaining === 0 ? (
        <p>
          You've started today's {plural(limit, 'new card')}, so more arrive tomorrow. To see more each day, raise the limit in{' '}
          <Link to={paths.settings}>Settings</Link>.
        </p>
      ) : null}
      {canDrill ? <p>In the meantime, a drill of multiple-choice questions keeps your recall sharp.</p> : null}
    </EmptyState>
  );
}

function ReviewComplete({ summary, kk }: { summary: ReviewSummary; kk: KkId | null }) {
  const now = useNow(60_000);
  const { nextDue, due } = useDueSummary(now);
  return (
    <>
      <PhaseHeading focus>Review complete</PhaseHeading>
      <dl className={study.facts}>
        <dt>Cards reviewed</dt>
        <dd>{summary.cards}</dd>
        <dt>New cards</dt>
        <dd>{summary.newCards}</dd>
        <dt>Rated Again</dt>
        <dd>{summary.again === 0 ? 'None' : plural(summary.again, 'time')}</dd>
      </dl>
      {summary.finishedEarly && due > 0 ? (
        <p>{plural(due, 'card')} you didn't get to {due === 1 ? 'is' : 'are'} still due. Start another review to finish them.</p>
      ) : null}
      <p>{nextDue !== null ? `Your next review is due ${describeDue(nextDue, now)}.` : 'Nothing else is scheduled yet.'}</p>
      <div className={study.actions}>
        <ButtonLink variant="primary" to={kk ? drillPath({ kk }) : paths.drill}>
          {kk ? 'Drill this key knowledge' : 'Go to Drill'}
        </ButtonLink>
        <ButtonLink to={paths.home}>Go to Home</ButtonLink>
      </div>
    </>
  );
}

/**
 * One flashcard face. Before the flip it shows the prompt; after it, the prompt and the answer
 * together, with the KK tags and the mistake note. The flip is a 150 ms turn (none under reduced
 * motion). Card text is bundled content, so it renders as Markdown.
 */
import { forwardRef } from 'react';
import type { Card } from '../../content/schema';
import { renderCloze } from '../../content/markdown';
import type { ReviewDirection } from '../../srs/queue';
import { Markdown } from '../../ui/Markdown';
import { Tag } from '../../ui/Tag';
import { KkTagList, MistakeNote } from './parts';
import styles from './Review.module.css';

export interface ReviewCardProps {
  card: Card;
  direction: ReviewDirection;
  flipped: boolean;
  isNew: boolean;
  /** "Card 3 of 12". */
  position: string;
  /** Play the flip animation (off under reduced motion). */
  animate: boolean;
}

/** What the prompt asks the student to recall, by card type and direction. */
function promptFor(card: Card, direction: ReviewDirection): string {
  switch (card.type) {
    case 'reverse':
      return direction === 'reverse' ? 'Name the term this defines.' : 'Recall what this term means.';
    case 'cloze':
      return 'Recall the missing words.';
    case 'compare':
      return 'Recall how these differ.';
    default:
      return 'Recall the answer.';
  }
}

function frontText(card: Card, direction: ReviewDirection, flipped: boolean): string {
  if (card.type === 'cloze') return renderCloze(card.front, flipped);
  if (card.type === 'reverse' && direction === 'reverse') return card.back;
  return card.front;
}

function backText(card: Card, direction: ReviewDirection): string {
  if (card.type === 'reverse' && direction === 'reverse') return card.front;
  return card.back;
}

export const ReviewCard = forwardRef<HTMLElement, ReviewCardProps>(function ReviewCard(
  { card, direction, flipped, isNew, position, animate },
  ref,
) {
  const ask = promptFor(card, direction);
  return (
    <section ref={ref} tabIndex={-1} aria-label={`${position}, ${flipped ? 'answer shown' : 'question'}`} className={styles.cardWrap}>
      <div
        key={flipped ? 'back' : 'front'}
        className={[styles.card, flipped && animate ? styles.flip : ''].filter(Boolean).join(' ')}
        data-flipped={flipped ? 'true' : 'false'}
      >
        <div className={styles.cardHead}>
          <p className={styles.position}>{position}</p>
          <div className={styles.cardTags}>
            {isNew ? <Tag>New</Tag> : null}
            {card.type === 'reverse' ? <Tag>{direction === 'reverse' ? 'Definition to term' : 'Term to definition'}</Tag> : null}
          </div>
        </div>
        <Markdown
          text={frontText(card, direction, flipped)}
          className={[styles.front, card.type === 'reverse' && direction === 'forward' ? styles.term : ''].filter(Boolean).join(' ')}
        />
        {flipped ? (
          <div className={styles.answer}>
            <Markdown
              text={backText(card, direction)}
              className={[styles.back, card.type === 'reverse' && direction === 'reverse' ? styles.term : ''].filter(Boolean).join(' ')}
            />
          </div>
        ) : (
          <p className={styles.ask}>{ask}</p>
        )}
      </div>
      {flipped ? (
        <>
          <KkTagList kks={card.kk} />
          {card.mistake ? <MistakeNote text={card.mistake} /> : null}
        </>
      ) : null}
    </section>
  );
});

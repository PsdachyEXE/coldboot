/** The review queue a session starts from, shared by Review and Today's run. */
import type { ContentIndex } from '../../content/loader';
import type { KkId } from '../../content/schema';
import { ALL_KK_IDS } from '../../content/studyDesign';
import { studyDay } from '../../lib/time';
import type { MasteryMap } from '../../srs/mastery';
import { buildQueue, type QueueEntry } from '../../srs/queue';
import { newCardsRemaining, type SrsData } from '../../state/srs';

/** Due cards, then new cards up to today's limit, optionally for one KK. */
export function reviewQueue(content: ContentIndex, srs: SrsData, limit: number, mastery: MasteryMap, now: number, kk?: KkId | null): QueueEntry[] {
  return buildQueue({
    cards: content.cards,
    srs: srs.cards,
    mastery,
    now,
    newRemaining: newCardsRemaining(srs, studyDay(now), limit),
    kk: kk ? [kk] : undefined,
    kkOrder: ALL_KK_IDS,
  });
}

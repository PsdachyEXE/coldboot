import { describe, expect, it } from 'vitest';
import { DEFAULT_EXAM_AT, parseInstant } from '../../lib/time';
import { RATINGS, schedule } from '../../srs/sm2';
import type { SrsCardState } from '../../state/srs';
import { capNote } from './ratings';

const EXAM = parseInstant(DEFAULT_EXAM_AT); // Friday 13 November 2026, 3:00 pm AEDT
const mature: SrsCardState = { reps: 4, interval: 20, ease: 2.5, due: 0, lapses: 0, last: 0 };

function previews(card: SrsCardState, now: number) {
  return RATINGS.map((r) => schedule(card, r, now, { examAt: EXAM }));
}

describe('rating cap note', () => {
  it('explains why Hard, Good and Easy land on the same day before the exam', () => {
    const now = new Date(2026, 9, 1, 10).getTime();
    expect(capNote(previews(mature, now), now)).toBe(
      'Reviews stop 2 days before the exam, so Hard, Good and Easy all bring this card back on Wednesday 11 November.',
    );
  });

  it('says nothing when no rating is capped', () => {
    const now = new Date(2026, 9, 1, 10).getTime();
    expect(capNote(previews({ ...mature, reps: 1, interval: 1 }, now), now)).toBeNull();
  });

  it('names the final-week cap', () => {
    const now = new Date(2026, 10, 7, 10).getTime();
    expect(capNote(previews(mature, now), now)).toBe(
      'In the final week before the exam, cards come back within 2 days, so Hard, Good and Easy all bring this card back on Monday.',
    );
  });
});

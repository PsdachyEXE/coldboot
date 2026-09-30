/** Self-marking for short answers: the score is the ticked marks, capped at the marks available. */
import type { KkId, ShortAnswer } from '../../content/schema';

export interface WrittenResult {
  itemId: string;
  kk: KkId[];
  /** Indices of the marking points ticked. */
  ticked: number[];
  earned: number;
  marks: number;
  /** 0 to 1: min(ticked marks, marks) / marks. */
  score: number;
}

/** The marks of the ticked points, before the cap. */
export function tickedMarks(item: Pick<ShortAnswer, 'points'>, ticked: ReadonlySet<number>): number {
  return item.points.reduce((sum, p, i) => sum + (ticked.has(i) ? p.marks : 0), 0);
}

/** Marks earned (capped at the marks available) and the 0 to 1 score. */
export function markScore(item: Pick<ShortAnswer, 'marks' | 'points'>, ticked: ReadonlySet<number>): { earned: number; score: number } {
  const earned = Math.min(tickedMarks(item, ticked), item.marks);
  return { earned, score: item.marks > 0 ? earned / item.marks : 0 };
}

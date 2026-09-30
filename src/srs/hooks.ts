/**
 * Shared study hooks. Mastery is recomputed when the attempt log changes and on a slow clock, since
 * decay over a few minutes is invisible at one decimal place.
 */
import { useMemo } from 'react';
import { useContent } from '../content/store';
import { studyDay } from '../lib/time';
import { useNow } from '../lib/useNow';
import { useAttempts } from '../state/attempts';
import { examAtMs, useSettings } from '../state/settings';
import { countDue, newCardsRemaining, useSrs } from '../state/srs';
import { computeMastery, type MasteryMap } from './mastery';
import { nextDueAfter } from './queue';

/** How often mastery refreshes for decay alone. */
export const MASTERY_TICK_MS = 5 * 60_000;

/** KK mastery from the attempt log, memoised on the log and a clock that ticks every 5 minutes. */
export function useMastery(): MasteryMap {
  const log = useAttempts((s) => s.log);
  const rollup = useAttempts((s) => s.rollup);
  const kkMap = useAttempts((s) => s.kkMap);
  const now = useNow(MASTERY_TICK_MS);
  return useMemo(() => computeMastery({ log, rollup, kkMap }, now), [log, rollup, kkMap, now]);
}

/** Mastery computed once, outside React (e.g. when a drill round is built). */
export function masteryNow(now = Date.now()): MasteryMap {
  return computeMastery(useAttempts.getState(), now);
}

/** The exam start instant, epoch ms. */
export function useExamAt(): number {
  return useSettings((s) => examAtMs(s));
}

export interface DueSummary {
  /** Cards due now (only cards still in the content, once it has loaded). */
  due: number;
  /** New cards still available today under the daily limit. */
  newRemaining: number;
  /** The next due time after now, or null. */
  nextDue: number | null;
}

/** Due and new-card counts for `now`, ignoring records for cards that have left the content. */
export function useDueSummary(now: number): DueSummary {
  const cards = useSrs((s) => s.cards);
  const introduced = useSrs((s) => s.introduced);
  const limit = useSettings((s) => s.newCardLimit);
  const known = useContent((s) => s.index?.cardIds);
  return useMemo(
    () => ({
      due: countDue(cards, now, known),
      newRemaining: newCardsRemaining({ cards, introduced }, studyDay(now), limit),
      nextDue: nextDueAfter(cards, now, known),
    }),
    [cards, introduced, limit, known, now],
  );
}

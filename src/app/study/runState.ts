/**
 * Where Today's run is up to, kept in this tab's sessionStorage (`coldboot:v1:run`) so that leaving
 * the page, for the Daily screen or anywhere else, and coming back (or reloading) carries the run
 * on instead of starting it again. It holds the step, each finished step's outcome, and the
 * progress inside the current step: the ratings so far in the review, and the drill's questions
 * and answers. The key goes with the tab's other state on reset and import (clearTabState in
 * src/state/persist.ts removes every `coldboot:v1:` sessionStorage key).
 *
 * A saved run is read defensively: anything malformed, from an older shape or from another study
 * day is ignored, and the run starts afresh.
 */
import { isKkId, type KkId } from '../../content/schema';
import { z } from '../../lib/zodConfig';
import { readSessionJson, removeSessionKey, writeSessionJson } from '../../state/storage';
import type { DrillAnswer, DrillResult } from './drill';
import type { ReviewTally } from './ReviewRunner';

export const RUN_KEY = 'run';
/** A review with nothing rated yet. */
export const EMPTY_TALLY: ReviewTally = { ratings: 0, cardIds: [], newCards: 0, again: 0 };
export const RUN_VERSION = 1;

export type StepId = 'review' | 'drill' | 'daily';

/**
 * The run's steps, in order: the heading Run shows, the step's name in a sentence ("Next: drill
 * your weakest key knowledge"), and the short name in a list ("drill, then the daily challenge").
 * Home reads them too, so they live here rather than in the Run screen's chunk.
 */
export const RUN_STEPS: readonly { id: StepId; title: string; phrase: string; short: string }[] = [
  { id: 'review', title: 'Review cards', phrase: 'review cards', short: 'review cards' },
  { id: 'drill', title: 'Drill your weakest key knowledge', phrase: 'drill your weakest key knowledge', short: 'drill' },
  { id: 'daily', title: 'Daily challenge', phrase: 'the daily challenge', short: 'the daily challenge' },
];

export interface Outcome {
  status: 'done' | 'skipped';
  text: string;
}

export interface SavedRun {
  v: typeof RUN_VERSION;
  /** The study day the run began; a run from another day is dropped. */
  day: string;
  step: StepId;
  outcomes: Partial<Record<StepId, Outcome>>;
  /** Ratings so far in the review step. */
  review: ReviewTally;
  /** The drill's questions (MCQ ids), in order, and the answers given so far. */
  drillIds: string[];
  drillAnswers: DrillAnswer[];
  drillResult: DrillResult | null;
  /** When the current step began (a daily game must end after it). */
  stepAt: number;
  /** The Melbourne date the daily step is for. */
  dailyDate: string;
}

const Id = z.string().min(1).max(200);
const Kk = z.custom<KkId>((v) => typeof v === 'string' && isKkId(v));
const Count = z.number().int().min(0).max(100_000);
const OutcomeSchema = z.object({ status: z.enum(['done', 'skipped']), text: z.string().max(500) });
const AnswerSchema = z.object({ itemId: Id, kk: z.array(Kk).max(20), correct: z.boolean(), answered: z.boolean() });

const SavedRunSchema = z.object({
  v: z.literal(RUN_VERSION),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  step: z.enum(['review', 'drill', 'daily']),
  outcomes: z.object({ review: OutcomeSchema.optional(), drill: OutcomeSchema.optional(), daily: OutcomeSchema.optional() }),
  review: z.object({ ratings: Count, cardIds: z.array(Id).max(5_000), newCards: Count, again: Count }),
  drillIds: z.array(Id).max(100),
  drillAnswers: z.array(AnswerSchema).max(100),
  drillResult: z
    .object({
      answers: z.array(AnswerSchema).max(100),
      correct: Count,
      total: Count,
      timed: z.boolean(),
      timedOut: z.boolean(),
      msLeft: z.number().min(0).max(86_400_000),
    })
    .nullable(),
  stepAt: z.number().int().min(0).max(Date.UTC(3000, 0, 1)),
  dailyDate: z.string().max(10),
});

/** The run saved in this tab for `day`, or null when there is none (or it can't be trusted). */
export function readRun(day: string): SavedRun | null {
  const parsed = SavedRunSchema.safeParse(readSessionJson(RUN_KEY));
  if (!parsed.success || parsed.data.day !== day) return null;
  return parsed.data as SavedRun;
}

/** Saves the run. A browser that refuses simply doesn't keep the place. */
export function saveRun(run: SavedRun): void {
  writeSessionJson(RUN_KEY, run);
}

export function clearRun(): void {
  removeSessionKey(RUN_KEY);
}

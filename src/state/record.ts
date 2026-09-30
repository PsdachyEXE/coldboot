/** The single entry point for recording an answer anywhere in the app. */
import { studyDay } from '../lib/time';
import { sanitiseAttempt, useAttempts, type Attempt } from './attempts';
import { useSession } from './session';

/**
 * Records an attempt in the attempt log and the day's activity. Invalid attempts (bad id, no valid
 * KK, non-finite numbers) are rejected before they reach either store. Returns whether it was recorded.
 */
export function recordAttempt(attempt: Attempt, opts: { review?: boolean } = {}): boolean {
  const clean = sanitiseAttempt(attempt);
  if (!clean || !useAttempts.getState().record(clean)) return false;
  useSession.getState().noteActivity(studyDay(clean.timestamp), clean, opts.review === true);
  return true;
}

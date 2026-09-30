/** The single entry point for recording an answer anywhere in the app. */
import { studyDay } from '../lib/time';
import { useAttempts, type Attempt } from './attempts';
import { useSession } from './session';

export function recordAttempt(attempt: Attempt, opts: { review?: boolean } = {}): void {
  useAttempts.getState().record(attempt);
  useSession.getState().noteActivity(studyDay(attempt.timestamp), attempt, opts.review === true);
}

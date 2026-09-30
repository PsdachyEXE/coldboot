/**
 * Registry text for `daily`, the terminal edition of the daily challenge (Section 6.12). The folder
 * is daily-game because ../daily.ts already holds the shared set builder.
 */
import type { KkId } from '../../content/schema';

export const DAILY_ID = 'daily';
export const DAILY_TITLE = 'Daily challenge';
export const DAILY_KK: KkId[] = [];
export const DAILY_SUMMARY = "Today's 10 questions, the same for everyone, with a share line";

export const DAILY_MAN = `daily is the daily challenge: 10 questions picked by the date in Melbourne, so everyone gets the same set on the same day. Eight are multiple-choice questions from the study content and two come from the other games. When fewer multiple-choice questions are installed, the games fill the gap.

Only your first attempt at each question counts. If you stop partway, type daily again later the same day to carry on from the next unanswered question. Once you have finished, daily shows your result, the share line and when the next set is ready instead of starting again. A new set starts at midnight in Melbourne.

The share line has a blue square for each right answer and a black square for each wrong one:
  COLDBOOT daily 2026-10-02  8/10
  🟦🟦⬛🟦🟦🟦🟦⬛🟦🟦
Type share to copy it to the clipboard.

Answer a multiple-choice question with a letter from A to D, or a number from 1 to 4. The other questions say how to answer them.

Usage: daily`;

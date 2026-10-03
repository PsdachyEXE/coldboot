/** Registry text for `boss`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const BOSS_ID = 'boss';
export const BOSS_TITLE = 'Boss round';
/** The boss round draws on every generator game and a case study, so it has no KKs of its own. */
export const BOSS_KK: KkId[] = [];
export const BOSS_SUMMARY = 'Three lives, 15 questions from every game getting harder, then a case study you mark yourself';

export const BOSS_MAN = `boss is the final test: 15 questions from every game that makes its own questions, getting harder as you go, then three case study questions that you mark yourself.

Lives. You start with three lives, and each wrong answer costs one. Input that isn't an answer, such as a word where a letter is expected, costs nothing: the question stays until you answer it.

The climb. Five easy questions, then five normal, then five hard, each from a different game. The climb ends after the fifteenth question, or as soon as your last life is gone. A question counts as survived when you still have a life after answering it.

The case study. Three written questions from one case study follow, whether or not you have lives left, and they cost no lives. The case study's insert comes first, and each question shows the figures it uses. Type your answer on one line (up to 4,000 characters) and press Enter, or type skip to go straight to the marking. Then read the model answer and the numbered marking points, and type the numbers of the points your answer earned, separated by spaces or commas. For points 1 and 3, type 1 3 (or 13 when there are fewer than ten points); for points 1 to 3, type 1-3; and type none or all for no points or every point. Your marks are capped at what the question is worth, and each question is recorded as the marks you gave yourself over the marks available.

The summary shows the questions you survived, the lives you had left and your case study marks.

Example: you lose lives on questions 4, 9 and 12. You survived 11 questions and finished the climb with no lives left, then go on to the case study.

There is one level: the climb always runs from easy to hard.

Usage: play boss`;

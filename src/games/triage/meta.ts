/** Registry text for `triage`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const TRIAGE_ID = 'triage';
export const TRIAGE_TITLE = 'Error types and debugging';
export const TRIAGE_KK: KkId[] = ['U3O1-KK13', 'U3O1-KK14', 'U4O1-KK06'];
export const TRIAGE_SUMMARY = 'Classify errors as syntax, logic or runtime, and pick a debugging technique';

export const TRIAGE_MAN = `triage drills the study design's three types of error and the techniques for tracking them down.

Each case shows a short listing or describes what went wrong. Name the type of error:
  syntax: the code doesn't follow the rules of the language, such as a missing symbol, so the program can't be compiled and run;
  logic: the program runs but gives incorrect output, such as a wrong calculation or a condition that decides the wrong way;
  runtime: the program starts, then hits an error while it runs, which crashes it unless the error is handled.

For a runtime error, type its kind instead: overflow (a value too large for its data type, or a program that runs out of memory), index out of range, type mismatch or divide by zero. Typing runtime on its own asks you which kind.

Some cases have a follow-up question: which debugging technique suits the case best, a breakpoint, a debugging statement or commenting out code. Unit 3 lists breakpoints and debugging statements; Unit 4's alpha testing lists breakpoints and commenting out code. The question says what you want to find out, so read it closely.

Example: "A mark of 50 or more is a pass. The program runs without an error, but a mark of exactly 50 displays Fail." Type logic: the program runs but gives incorrect output.

A round has 10 questions: six cases, four of them with a follow-up. On a phone, tap an answer below the prompt.

Difficulty: --easy describes more cases in words, normal mixes words and listings, and --hard is mostly listings, without line numbers for syntax errors.

Usage: play triage [--easy|--hard]`;

/** Registry text for `deskcheck`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const DESKCHECK_ID = 'deskcheck';
export const DESKCHECK_TITLE = 'Desk checking and test tables';
export const DESKCHECK_KK: KkId[] = ['U3O1-KK08', 'U3O1-KK05', 'U3O1-KK04', 'U3O1-KK14', 'U4O1-KK06'];
export const DESKCHECK_SUMMARY = 'Trace pseudocode by hand and choose test data for a test table';

export const DESKCHECK_MAN = `deskcheck drills desk checking: tracing pseudocode by hand, line by line, the way the exam asks you to. It also drills choosing test data for a test table.

A round has 10 questions. Most show a numbered listing and ask for one of these:
  what the program displays;
  what a function returns for a given call;
  the value of a variable after a given line runs, or at the end of a given pass through a loop.

The listings cover counters and totals, IF and ELSEIF chains tested at their boundaries, counted, pre-test and post-test loops over arrays, two-dimensional arrays, strings and LENGTH, and functions with parameters. Every listing that uses an array says whether its indexes start at 0 or 1. A pass is one run through a loop's body.

Test table questions give a function and its requirements. Type the inputs you would test: at least one for every branch, and both sides of every boundary (the lowest value of a band and the value just below it). You then see the test table with the expected output for each input, and Actual output left for you to fill in.

Type answers as the program would show them. A whole number has no decimal point and a floating point number has one, so 7 is not 7.0. Text ignores capitals and surrounding quotes. Separate several values or lines with spaces or commas. A wrong answer shows a trace table with every variable's value after each line runs.

Example (array indexes start at 0):
  1  BEGIN
  2      marks ← [4, 9, 6]
  3      total ← 0
  4      FOR i ← 0 TO 2
  5          total ← total + marks[i]
  6      ENDFOR
  7      DISPLAY total
  8  END
What is displayed? Type 19.

Difficulty: --easy uses shorter listings and asks mostly what is displayed, normal mixes every kind of question, and --hard adds nested loops, off-by-one traps and input validation in the test tables.

Usage: play deskcheck [--easy|--hard]`;

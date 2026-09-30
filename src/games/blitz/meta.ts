/** Registry text for `blitz`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const BLITZ_ID = 'blitz';
export const BLITZ_TITLE = 'Glossary blitz';
export const BLITZ_KK: KkId[] = ['TERMS'];
export const BLITZ_SUMMARY = 'Name as many glossary terms from their definitions as you can in 60 seconds';
export const BLITZ_MS = 60_000;

export const BLITZ_MAN = `blitz drills the terms in the study design's glossary, against the clock.

You have 60 seconds. Each question shows a definition in plain words: type the term it defines and press Enter. You see whether you were right straight away, then the next definition. Your score is the number you get right before the time runs out.

Small spelling slips count as correct: up to 1 wrong letter for terms of 4 characters or fewer, up to 2 for terms of 5 to 14 characters, and up to a fifth of the length for longer terms. Swapping two neighbouring letters counts as one slip. Other accepted names, such as an abbreviation, also count. Typing a different term from the glossary never counts, however close the spelling.

Type skip, or tap it, to see the answer and move on.

Example: "A table listing every data item in a solution with its name, data type, size and description." Type data dictionary.

blitz needs the glossary. If none is installed, it says so.

Usage: play blitz`;

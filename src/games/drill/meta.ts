/** Metadata for the terminal's Section A drill, which the `drill` command starts (it is not a `play` game). */
export const DRILL_ID = 'drill';
export const DRILL_TITLE = 'Section A drill';
export const DRILL_SUMMARY = 'Up to 10 multiple-choice questions from the study content';

export const DRILL_MAN = `drill runs up to 10 Section A multiple-choice questions from the study content in the terminal.

drill on its own picks your weakest key knowledge: points you are scoring below 65 on first, then points you haven't tried yet.

drill U3O1-KK12 drills one key knowledge point. drill U3O2 drills a whole area of study. TERMS and PSM work too.

Answer with a letter from A to D, or a number from 1 to 4. After each answer you see the correct option, the explanation, and why the option you chose is wrong.

Usage: drill [kk|area]`;

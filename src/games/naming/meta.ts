/** Registry text for `naming`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const NAMING_ID = 'naming';
export const NAMING_TITLE = 'Naming conventions';
export const NAMING_GAME_KK: KkId[] = ['U3O1-KK09'];
export const NAMING_SUMMARY = 'Name conventions, rewrite identifiers and match the names already in use';

export const NAMING_MAN = `naming drills the study design's three naming conventions: camel casing, snake casing and Hungarian notation. A naming convention applies to every solution element (variables, interface controls and code structures such as functions), and its point is consistency: once a program uses one convention, every new name follows it, which makes the code easier to read and maintain.

  camel casing: the first word in lowercase, then each later word starting with a capital letter (totalCost);
  snake casing: every word in lowercase, joined by underscores (total_cost);
  Hungarian notation: a lowercase prefix for the data type or control type, then each word starting with a capital letter (strSurname, btnSave).

Hungarian prefixes are a convention, not a standard, so teams choose their own. This game uses these, and every question that needs them shows the table:
  variables: chr character, str string, int integer, flt floating point, dtm date/time, bool Boolean, arr array;
  controls: txt text box, btn button, lbl label, chk check box, lst list box, cbo combo box, rdo radio button, frm form.

Name the convention. Type camel casing, snake casing or Hungarian notation (case for casing counts too). An identifier that starts with a prefix from the table followed by a capital letter uses Hungarian notation, even though the rest looks like camel casing. Some identifiers are lookalikes that use none of the three: type none. TotalCost is Pascal casing (it starts with a capital letter) and total-cost is kebab casing, so typing pascal or kebab for those also counts.

Rewrite an identifier. Type it exactly in the convention asked for. Capitals count, so totalcost and TotalCost are both wrong when totalCost is wanted, and the feedback says what is different.

Match the names in use. A program's names are listed, all in one convention. Name a new variable, function or control with the words given, in the same convention. A function's brackets are optional.

Example: "A check box that the user ticks to accept the terms. Name it in Hungarian notation, using the words accept terms." The prefix for a check box is chk, and each word after it starts with a capital letter: chkAcceptTerms.

A round has 10 questions: four identifiers to name and six names to write: one in camel casing, one in snake casing, a Hungarian variable, a Hungarian control and two that match the names in use. On a phone, tap a convention below the prompt.

Difficulty: --easy uses two-word names and gives the words to rewrite, normal adds three-word names and rewrites between camel casing and snake casing, and --hard uses longer names, starts rewrites from lookalikes, drops the reminders of each rule, and describes Hungarian variables by their data instead of naming the type.

Usage: play naming [--easy|--hard]`;

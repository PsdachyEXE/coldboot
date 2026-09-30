/** Registry text for `naming`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const NAMING_ID = 'naming';
export const NAMING_TITLE = 'Naming conventions';
export const NAMING_GAME_KK: KkId[] = ['U3O1-KK09'];
export const NAMING_SUMMARY = 'Name the convention an identifier uses, and rewrite identifiers in camel case, snake case or Hungarian notation';

export const NAMING_MAN = `naming drills the three naming conventions: camel case, snake case and Hungarian notation.

  camel case: the first word in lowercase, then each later word starting with a capital letter (totalCost);
  snake case: every word in lowercase, joined by underscores (total_cost);
  Hungarian notation: a lowercase prefix for the data type or control type, then each word starting with a capital letter (strSurname, btnSave).

Hungarian prefixes are a convention, not a standard, so teams choose their own. This game uses these, and every question that needs them shows the table:
  variables: str String, int Integer, flt Floating point, bln Boolean, chr Character, arr array;
  controls: txt text box, btn button, lbl label, chk check box, lst list box, cbo combo box, rdo radio button, frm form.

Name the convention. Type camel case, snake case or Hungarian notation. An identifier that starts with a prefix from the table followed by a capital letter uses Hungarian notation, even though the rest looks like camel case. Some identifiers are lookalikes that use none of the three: type none. TotalCost is Pascal case (it starts with a capital letter) and total-cost is kebab case, so typing pascal or kebab for those also counts.

Rewrite an identifier. Type it exactly in the convention asked for. Capitals count, so totalcost and TotalCost are both wrong when totalCost is wanted, and the feedback says what is different.

Example: "A check box that the user ticks to accept the terms. Name it in Hungarian notation, using the words accept terms." The prefix for a check box is chk, and each word after it starts with a capital letter: chkAcceptTerms.

A round has 10 questions: four identifiers to name and six rewrites, two of them Hungarian variables and two Hungarian controls. On a phone, tap a convention below the prompt.

Difficulty: --easy uses two-word names and gives the words to rewrite, normal adds three-word names and rewrites between camel case and snake case, and --hard uses longer names, starts rewrites from lookalikes, and describes Hungarian variables by their data instead of naming the type.

Usage: play naming [--easy|--hard]`;

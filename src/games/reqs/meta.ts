/** Registry text for `reqs`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const REQS_ID = 'reqs';
export const REQS_TITLE = 'Requirements, constraints and scope';
export const REQS_KK: KkId[] = ['U3O2-KK05', 'U3O2-KK06', 'U3O2-KK07', 'U3O1-KK02'];
export const REQS_SUMMARY = 'Classify statements as functional, non-functional, constraint or scope';

export const REQS_MAN = `reqs drills the four kinds of statement in a software requirements specification.

Each question quotes one line from an organisation's project brief. Say what it is:
  functional: something the solution must do with its data: take an input, produce an output, calculate, record or validate;
  non-functional: a quality the finished solution must have, which testing can measure;
  constraint: a condition that limits the project, such as a budget, a deadline, a law, the equipment available or the users it must suit;
  scope: what the solution will and won't cover, such as what this version leaves out.

Some statements are followed by a second question. For a non-functional requirement: which quality it concerns (usability, reliability, portability, robustness or maintainability). For a constraint: which kind it is (economic for cost and time, technical, social for the users' level of expertise, legal, or usability for needs such as accessibility).

The classic trap is a constraint that sounds like a quality. "Must run on the clinic's existing laptops" limits the project to equipment it already has: a technical constraint. "Must run on Android, iOS and in a browser" asks for a quality of the solution: non-functional, portability.

Usability is on both lists. "A new user can book within three minutes" sets a target for the finished solution: a non-functional requirement. "Some members are vision impaired" describes users the design must allow for: a usability constraint.

Example: "The app must not crash, whatever a member types into the search box." It names no particular check the app makes; it sets how well the app copes with bad input, so type non-functional, then robustness.

A round has 10 questions: seven statements, three of them followed by a question about the quality or the kind of constraint. On a phone, tap an answer below the prompt.

Difficulty: --easy uses reliability, usability and portability, and the four kinds of constraint in the key knowledge (economic, technical, social and legal); normal adds robustness, maintainability and usability constraints; --hard has more of the statements that are easy to mix up.

Usage: play reqs [--easy|--hard]`;

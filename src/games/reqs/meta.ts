/** Registry text for `reqs`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const REQS_ID = 'reqs';
export const REQS_TITLE = 'Requirements, constraints and scope';
export const REQS_KK: KkId[] = ['U3O2-KK05', 'U3O2-KK06', 'U3O2-KK07', 'U3O1-KK02'];
export const REQS_SUMMARY = 'Classify statements as functional, non-functional, constraint or scope';

export const REQS_MAN = `reqs drills the four kinds of statement in a software requirements specification.

Each question quotes one line from an organisation's project brief. Say what it is:
  functional: something the solution must do, such as calculate, record, display or send;
  non-functional: a quality the finished solution must have, which testing can measure;
  constraint: a condition that limits the project, such as a budget, a deadline, a law or equipment it must use;
  scope: a boundary on what the solution will and won't cover.

For a non-functional requirement, a follow-up asks which quality it concerns: reliability, usability, portability, efficiency (response time) or maintainability.

The classic trap is a constraint that sounds like a quality. "Must run on the clinic's existing laptops" limits the project to equipment it already has: a constraint. "Must run on Android, iOS and in a browser" asks for a quality of the solution: non-functional, portability.

Example: "Search results must appear within one second." Searching is the function, but the one-second limit is how well it must perform, so type non-functional, then efficiency.

A round has 10 questions: seven statements, three of them followed by a question about the quality. On a phone, tap an answer below the prompt.

Difficulty: --easy uses reliability, usability and portability only, normal adds efficiency and maintainability, and --hard has more of the statements that are easy to mix up.

Usage: play reqs [--easy|--hard]`;

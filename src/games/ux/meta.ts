/** Registry text for `ux`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const UX_ID = 'ux';
export const UX_TITLE = 'User experience';
export const UX_GAME_KK: KkId[] = ['U3O2-KK15'];
export const UX_SUMMARY = 'Find the weakest user experience characteristic in a mock-up, and say why';

export const UX_MAN = `ux shows a mock-up of an app screen with one clear weakness. Name the user experience characteristic that is weakest, then choose the reason.

The study design lists four characteristics of user experience:
  affordance: whether an element's look shows how to use it, such as a button that looks pressable;
  interoperability: how well a solution exchanges data and works with other systems, such as saving in a format other programs open;
  security: authentication, which checks who a user is, and data protection, which keeps users' data from people who shouldn't see it;
  usability: how easily users can learn and use a solution to finish their tasks.

Design principles are a separate list: alignment, balance, contrast, space, text formatting, usability and navigation. Only usability is on both lists, so a principle such as contrast is never the answer when a question asks for a user experience characteristic. From normal difficulty, one design principle sits among the options to catch that mix-up.

Each mock-up has exactly one weakness. Read the line above it, the drawing and the designer's numbered notes. Answer by letter or by name. Then choose the reason that fits this screen from a short list: the other reasons describe problems this screen doesn't have.

Example: on a sign-in screen, the password box shows Wombat!2026 as it is typed. The weakest characteristic is security, because anyone who can see the screen can read the password and sign in as that member.

A round has 10 questions: five mock-ups, each with a characteristic question and a reason question. Every mock-up has a text description below it that lists its elements and notes.

Difficulty: --easy offers just the four characteristics and three reasons. Normal and --hard add a design principle to the characteristics; normal offers four reasons, and --hard offers five, one of them about the same characteristic.

Usage: play ux [--easy|--hard]`;

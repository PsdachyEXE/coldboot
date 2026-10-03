/** Registry text for `ux`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const UX_ID = 'ux';
export const UX_TITLE = 'User experience';
export const UX_GAME_KK: KkId[] = ['U3O2-KK15'];
export const UX_SUMMARY = 'Find the weakest user experience characteristic in a mock-up, and say why';

export const UX_MAN = `ux shows a mock-up of an app screen with one clear weakness. Name the user experience characteristic that is weakest, then choose the reason.

The four characteristics:
  affordance: whether an element's look shows how to use it, such as a button that looks pressable;
  interoperability: how well a solution exchanges data with other systems, such as saving in a format other programs open;
  security: protecting users' data and accounts, so they can trust the solution;
  usability: how easily users can learn and use a solution to finish their tasks.

Each mock-up has exactly one weakness. Read the line above it, the drawing and the designer's numbered notes. Answer by letter or by name. Then choose the reason that fits this screen from a short list: the other reasons describe problems this screen doesn't have.

Example: on a sign-in screen, the password box shows Wombat!2026 as it is typed. The weakest characteristic is security, because anyone who can see the screen can read the password.

Design principles aren't asked about or offered as answers. The study design's list of design principles still has to be checked against the source, so this game sticks to the four characteristics, which are confirmed.

A round has 10 questions: five mock-ups, each with a characteristic question and a reason question. Every mock-up has a text description below it that lists its elements and notes.

Difficulty: --easy offers three reasons, normal offers four, and --hard offers five, one of them about the same characteristic.

Usage: play ux [--easy|--hard]`;

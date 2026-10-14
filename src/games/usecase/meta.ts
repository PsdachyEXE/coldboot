/** Registry text for `usecase`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const USECASE_ID = 'usecase';
export const USECASE_TITLE = 'Use case diagrams';
export const USECASE_GAME_KK: KkId[] = ['U3O2-KK08'];
export const USECASE_SUMMARY = 'Find the actors, choose includes or extends, and spot errors in use case diagrams';

export const USECASE_MAN = `usecase drills use case diagrams: actors, use cases, associations, the system boundary, and <<includes>> and <<extends>>.

Three kinds of question:
  actors: a scenario and a numbered list. Type the numbers of every actor, in any order. An actor is a role: a kind of user who interacts with the system, such as Customer or Ranger, drawn as a figure outside the boundary with the role labelled under or above it. The system itself, a device such as a phone or a kiosk, an organisation, data, and people who never use the system are not actors.
  includes or extends: a relationship between two use cases. <<includes>> means the base use case always incorporates the other's behaviour; its dashed arrow points from the base use case to the included one. <<extends>> means the other use case adds to the base only when a condition is met; its dashed arrow points from the extending use case to the base.
  spot the error: a use case diagram with letters marking some of its elements. Exactly one marked element is wrong. Type its letter.

The errors to look for: an actor drawn inside the system boundary; an association line between two actors; <<includes>> for a step that happens only sometimes; <<extends>> for a step that always happens; and an <<includes>> or <<extends>> arrow pointing the wrong way. An association is a plain line, with no arrowhead, between an actor and a use case.

Example: "Every order is paid for as it is placed" means Place order <<includes>> Take payment, with the arrow from Place order to Take payment. "A customer who has a gift voucher can apply it" means Apply gift voucher <<extends>> Place order, with the arrow from Apply gift voucher to Place order.

A round has 10 questions. Each diagram has a text description below it that lists every element and the marked ones.

Difficulty: --easy lists fewer candidates in the actor questions and has fewer diagrams, normal mixes all three kinds, and --hard lists every candidate and has more diagrams with more marked elements.

Usage: play usecase [--easy|--hard]`;

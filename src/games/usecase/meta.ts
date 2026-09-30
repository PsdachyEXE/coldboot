/** Registry text for `usecase`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const USECASE_ID = 'usecase';
export const USECASE_TITLE = 'Use case diagrams';
export const USECASE_GAME_KK: KkId[] = ['U3O2-KK08'];
export const USECASE_SUMMARY = 'Find the actors, choose includes or extends, and spot errors in use case diagrams';

export const USECASE_MAN = `usecase drills use case diagrams: actors, use cases, the system boundary, and <<includes>> and <<extends>>.

Three kinds of question:
  actors: a scenario and a numbered list. Type the numbers of every actor, in any order. An actor is a person or an external system that interacts with the system directly. The system itself, the data it holds, and people who never use it are not actors.
  includes or extends: a relationship between two use cases. <<includes>> means the step is always performed as part of the base use case. <<extends>> means it is optional, or happens only when a condition is met.
  spot the error: a use case diagram with letters marking some of its elements. Exactly one marked element is wrong. Type its letter.

The errors to look for: an actor drawn inside the system boundary; an association line between two actors; <<includes>> for a step that happens only sometimes; and <<extends>> for a step that always happens.

Example: "Every order is paid for as it is placed" means Place order <<includes>> Take payment. "A customer who has a gift voucher can apply it" means Apply gift voucher <<extends>> Place order.

A round has 10 questions. Each diagram has a text description below it that lists every element and the marked ones.

Difficulty: --easy shows fewer candidates in the actor lists and has fewer diagrams, normal mixes all three kinds, and --hard has more diagrams with more marked elements.

Usage: play usecase [--easy|--hard]`;

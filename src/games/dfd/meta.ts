/** Registry text for `dfd`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const DFD_ID = 'dfd';
export const DFD_TITLE = 'Data flow diagrams';
export const DFD_GAME_KK: KkId[] = ['U3O2-KK08'];
export const DFD_SUMMARY = 'Spot convention errors in data flow diagrams, and label a Level 1 diagram';

export const DFD_MAN = `dfd drills context diagrams and data flow diagrams: their conventions, and how a Level 1 diagram breaks down a context diagram.

Convention errors. A diagram has letters marking some of its elements, and exactly one marked element is wrong. Type its letter. Then name the rule it breaks, by number or a short phrase:
  1 a flow between two external entities (entity to entity);
  2 a data store connected straight to an external entity (store to entity);
  3 a process with no inputs, or with no outputs (no inputs or outputs);
  4 a flow without a label (unlabelled flow);
  5 a process named with a noun instead of a verb phrase (noun name);
  6 a flow between two data stores (store to store).

Labelling. A context diagram, then a Level 1 data flow diagram with some process and data store labels missing. Each blank has a letter. Answer one blank at a time from the word bank, by label or number. Read the flows in and out of each blank: a process is named for what it does, and a data store for the data it holds.

Example: a flow labelled order_record runs from data store D2 Orders straight to the Customer entity. The letter on that flow is the answer, and it breaks rule 2: data reaches an entity only through a process.

A round has 10 questions: three diagrams with an error (two questions each) and one diagram to label (four blanks). Each diagram has a text description below it that lists every element and the marked ones.

Difficulty: --easy uses more context diagrams, normal mixes them with data flow diagrams, and --hard uses mostly data flow diagrams with more marked elements.

Usage: play dfd [--easy|--hard]`;

/** Registry text for `dfd`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const DFD_ID = 'dfd';
export const DFD_TITLE = 'Data flow diagrams';
export const DFD_GAME_KK: KkId[] = ['U3O2-KK08'];
export const DFD_SUMMARY = 'Spot broken rules in context diagrams and data flow diagrams, and label a Level 1 diagram';

export const DFD_MAN = `dfd drills context diagrams and data flow diagrams: the rules for drawing them, and how a Level 1 diagram breaks down a context diagram.

Rules. A diagram has letters marking some of its elements, and exactly one marked element breaks a rule. Type its letter. Then say which rule it breaks, by number or a short phrase. A data flow diagram has ten rules:
  1 no data flows straight between two external entities (entity to entity);
  2 no data flows straight between two data stores (store to store);
  3 no data flows straight between an external entity and a data store (entity to store);
  4 data flows never cross each other (crossing flows);
  5 each data flow carries a single set of information (one set of information);
  6 every process has at least one input and one output (process input and output);
  7 a process's output is named differently from its input (same name);
  8 every data store has at least one input and one output (store input and output);
  9 every process connects to another process, a data store or an external entity (unconnected process);
  10 every external entity sends at least one input or receives at least one output (unconnected entity).
A context diagram has three: rules 1, 4 and 5 above, numbered 1 to 3.

Labelling. A context diagram, then a Level 1 data flow diagram with some process and data store labels missing. Each blank has a letter. Answer one blank at a time from the word bank, by label or number. Read the flows in and out of each blank: a process is named for what it does, and a data store for the data it holds.

Processes and data stores are known by their names, never by numbers: a process is a circle with its name inside, and a data store is two parallel lines with its name between them.

Example: a flow labelled stock_count runs from the Warehouse staff entity straight into the Products data store. The letter on that flow is the answer, and it breaks rule 3: data goes into or out of a store only through a process.

A round has 10 questions: three diagrams with a broken rule (two questions each) and one diagram to label (four blanks). Each diagram has a text description below it that lists every element and the marked ones.

Difficulty: --easy breaks only the plainest rules (1, 2, 3, 6 and 8), draws more context diagrams and marks four elements; normal adds crossing flows, an output named like its input and an entity with no flows; --hard draws mostly data flow diagrams and marks five elements.

Usage: play dfd [--easy|--hard]`;

/** Test fixture: a small glossary as reverse cards (valid against CardSchema). Imported by tests only. */
import type { Card } from '../../content/schema';

const ENTRIES: [string, string, string[]?][] = [
  ['algorithm', 'An ordered set of steps that solves a problem.'],
  ['data dictionary', 'A table listing every data item in a solution with its name, data type, size and description.'],
  ['data flow diagram', 'A diagram showing how data moves between processes, data stores and external entities.', ['DFD']],
  ['validation', 'Checking that input data is reasonable before a program uses it.'],
  ['verification', 'Checking that data has been copied or entered accurately, for example by entering it twice.'],
  ['software requirements specification', 'A document setting out what a solution must do, its constraints and its scope.', ['SRS']],
  ['XML', 'A self-describing text format that marks data up with named tags.', ['extensible markup language']],
  ['CSV', 'A plain text format that separates the values in each row with commas.', ['comma-separated values']],
  ['breakpoint', 'A marker that pauses a program at a chosen line so its variables can be inspected.'],
  ['pseudocode', 'A structured, language-neutral way of writing an algorithm in words and keywords.'],
  ['Gantt chart', 'A bar chart that shows project tasks against time, with their durations and dependencies.'],
  ['critical path', 'The longest chain of dependent tasks, which sets the shortest possible project length.'],
  ['encryption', 'Scrambling data with a key so only authorised people can read it.'],
  ['authentication', 'Confirming that users are who they claim to be.'],
  ['intellectual property', 'Creations of the mind, such as code and designs, that the law can protect.'],
  ['test data', 'Inputs chosen to check that a module behaves as expected, including boundary values.'],
];

function slug(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function fixtureTerms(): Card[] {
  return ENTRIES.map(([front, back, aliases]) => ({
    id: `t-${slug(front)}`,
    kk: ['TERMS'],
    type: 'reverse',
    front,
    back,
    difficulty: 1,
    source: 'study-design',
    ...(aliases ? { aliases } : {}),
  }));
}

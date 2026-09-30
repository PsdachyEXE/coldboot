/**
 * Hand-written conceptual questions shared by the algorithm games: "which one suits" questions with
 * two named answers, and lettered four-option questions. The statements are written out in full
 * (never generated) so each can be checked against textbook meaning.
 */
import type { KkId } from '../content/schema';
import type { TerminalBlock } from '../terminal/blocks';
import { LETTERS, matchOption, parseChoice } from './answers';
import type { QuizItem } from './types';

export interface WhichConcept<T extends string> {
  id: string;
  /** The scenario or question, one or two sentences. */
  prompt: string;
  answer: T;
  /** One line on why the answer is right. */
  reason: string;
}

export interface ChoiceConcept {
  id: string;
  prompt: string;
  options: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  reason: string;
}

export interface NamedAnswer<T extends string> {
  value: T;
  /** Display label, e.g. "quick sort". */
  label: string;
  /** Accepted spellings (case, spaces and hyphens are ignored). */
  accept: readonly string[];
}

export interface ConceptItemBase {
  itemId: string;
  kk: KkId[];
  instance: string;
}

export function whichItem<T extends string>(base: ConceptItemBase, concept: WhichConcept<T>, answers: readonly NamedAnswer<T>[]): QuizItem {
  const labels = answers.map((a) => a.label);
  const question = `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}?`;
  const expected = answers.find((a) => a.value === concept.answer)?.label ?? concept.answer;
  const prompt: TerminalBlock[] = [
    { kind: 'text', text: concept.prompt },
    { kind: 'text', text: capitalise(question), tone: 'accent' },
  ];
  return {
    id: base.itemId,
    kk: base.kk,
    instance: base.instance,
    chips: labels,
    prompt,
    check(input) {
      const value = matchOption(input, answers);
      if (value === null) return { correct: false, expected, reason: `Answer ${question.replace(/\?$/, '.')}`, counted: false };
      return { correct: value === concept.answer, expected: capitalise(expected), reason: concept.reason };
    },
  };
}

export function choiceItem(base: ConceptItemBase, concept: ChoiceConcept): QuizItem {
  return {
    id: base.itemId,
    kk: base.kk,
    instance: base.instance,
    chips: LETTERS.slice(0, 4),
    prompt: [
      { kind: 'text', text: concept.prompt, tone: 'accent' },
      { kind: 'choices', options: [...concept.options], labels: 'letters' },
    ],
    check(input) {
      const chosen = parseChoice(input, 4);
      const expected = `${LETTERS[concept.answer]}. ${concept.options[concept.answer]}`;
      if (chosen === null) return { correct: false, expected, reason: 'Type a letter from A to D, or a number from 1 to 4.', counted: false };
      return { correct: chosen === concept.answer, expected, reason: concept.reason };
    },
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

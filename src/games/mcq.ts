/**
 * A content MCQ as a quiz item: the stem and any figures, lettered options, answers typed as A to D
 * or 1 to 4, and feedback with the explanation plus a whyWrong line for every distractor (the one
 * chosen is marked), after a correct answer too, as the Drill screen shows them (Section 6.4).
 * Used by the terminal drill and (track B2) the daily challenge's eight MCQs.
 */
import type { Mcq } from '../content/schema';
import type { TerminalBlock } from '../terminal/blocks';
import { LETTERS, parseChoice } from './answers';
import type { QuizItem } from './types';

export const MCQ_CHIPS = ['A', 'B', 'C', 'D'];
export const MCQ_UNPARSED = 'Type a letter from A to D, or a number from 1 to 4.';

export function mcqPrompt(mcq: Mcq): TerminalBlock[] {
  return [
    ...(mcq.figures ?? []).map((figure): TerminalBlock => ({ kind: 'figure', figure })),
    { kind: 'markdown', text: mcq.stem },
    { kind: 'choices', options: [...mcq.options], labels: 'letters', markdown: true },
  ];
}

export function mcqItem(mcq: Mcq): QuizItem {
  return {
    id: mcq.id,
    kk: [...mcq.kk],
    chips: MCQ_CHIPS,
    prompt: mcqPrompt(mcq),
    check(input) {
      const chosen = parseChoice(input, mcq.options.length);
      if (chosen === null) return { correct: false, expected: '', reason: MCQ_UNPARSED, counted: false };
      const correct = chosen === mcq.answer;
      const expected = `${LETTERS[mcq.answer]}. ${mcq.options[mcq.answer]}`;
      const why = mcq.options.flatMap((_, i) =>
        i === mcq.answer ? [] : [`**Why not ${LETTERS[i]}${!correct && i === chosen ? ' (your answer)' : ''}:** ${mcq.whyWrong[i]}`],
      );
      const reason = [mcq.explanation, ...why].join('\n\n');
      return { correct, expected, reason, markdown: true };
    },
  };
}

/**
 * The `blitz` game (Section 7.3, P0): 60 seconds of glossary definitions; type the term. Each
 * definition comes from the glossary cards (content.terms: `back` is the paraphrased definition,
 * `front` the term, `aliases` other accepted spellings). Spelling slips within the tolerance in
 * ./match.ts count as correct. The score is the number correct before the time runs out.
 */
import type { Card } from '../../content/schema';
import { createQuizSession, unavailableSession } from '../engine';
import { childSeed, mulberry32, shuffle } from '../prng';
import type { Game, QuizItem } from '../types';
import { matchTerm } from './match';
import { BLITZ_ID, BLITZ_KK, BLITZ_MAN, BLITZ_MS, BLITZ_TITLE } from './meta';

export const SKIP_WORDS = ['skip', 'pass'];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Hides the term and its aliases where a definition happens to use them, so the answer isn't shown. */
export function maskDefinition(definition: string, spellings: readonly string[]): string {
  let out = definition;
  const longestFirst = [...spellings].filter((s) => s.trim()).sort((a, b) => b.length - a.length);
  for (const s of longestFirst) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(s.trim())}(?![\\p{L}\\p{N}])`, 'giu'), '(this term)');
  }
  return out;
}

export function blitzItem(card: Card, otherTerms: readonly string[]): QuizItem {
  const aliases = card.aliases ?? [];
  const term = card.front;
  const also = aliases.length ? `Also accepted: ${aliases.join(', ')}.` : '';
  return {
    id: card.id,
    kk: [...card.kk],
    chips: ['skip'],
    prompt: [
      { kind: 'markdown', text: maskDefinition(card.back, [term, ...aliases]) },
      { kind: 'text', text: 'Which term is this?', tone: 'accent' },
    ],
    check(input) {
      const typed = input.trim();
      if (SKIP_WORDS.includes(typed.toLowerCase())) return { correct: false, expected: term, reason: `Skipped. ${also}`.trim() };
      const match = matchTerm(typed, term, aliases, otherTerms);
      switch (match) {
        case 'exact':
          return { correct: true, expected: term, reason: also };
        case 'close':
          return { correct: true, expected: term, reason: `Accepted, allowing for spelling. It is spelt ${term}.` };
        case 'other-term':
          return { correct: false, expected: term, reason: `${typed} is a different term in the glossary.` };
        case 'wrong':
          return { correct: false, expected: term, reason: `This definition is for ${term}.` };
      }
    },
  };
}

const game: Game = {
  id: BLITZ_ID,
  title: BLITZ_TITLE,
  kk: BLITZ_KK,
  man: BLITZ_MAN,
  start(ctx, opts) {
    const terms = (ctx.content?.terms ?? []).filter((c) => c.front.trim() && c.back.trim());
    if (!terms.length) {
      return unavailableSession(BLITZ_ID, [
        { kind: 'text', text: 'No glossary terms are installed yet, so blitz has no definitions to ask.', tone: 'warning' },
        { kind: 'text', text: 'Type play deskcheck or play triage instead: they make their own questions.', tone: 'muted' },
      ]);
    }
    const spellings = (c: Card) => [c.front, ...(c.aliases ?? [])];
    const others = (c: Card) => terms.filter((t) => t !== c).flatMap(spellings);
    // Every term once in a seeded order, then again in a new order, never the same term twice running.
    const order: Card[] = [];
    const orderAt = (i: number): Card => {
      for (let cycle = Math.floor(order.length / terms.length); order.length <= i; cycle++) {
        let next = shuffle(mulberry32(childSeed(opts.seed, `cycle:${cycle}`)), terms);
        if (order.length && terms.length > 1 && next[0] === order[order.length - 1]) next = [...next.slice(1), next[0]];
        order.push(...next);
      }
      return order[i];
    };
    return createQuizSession({
      gameId: BLITZ_ID,
      now: ctx.now,
      generate: (i) => {
        const card = orderAt(i);
        return blitzItem(card, others(card));
      },
      count: Infinity,
      deadline: ctx.now() + BLITZ_MS,
      progressLabel: 'Definition',
      summaryExtra: () => [{ kind: 'text', text: 'Type play blitz to go again, or review to revise the glossary cards.', tone: 'muted' }],
    });
  },
};

export default game;

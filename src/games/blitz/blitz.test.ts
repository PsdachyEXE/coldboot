import { describe, expect, it } from 'vitest';
import { buildIndex, type ContentIndex } from '../../content/loader';
import { CardSchema, type PsmFile } from '../../content/schema';
import type { GameContext } from '../types';
import { fixtureTerms } from './fixture';
import game, { blitzItem, maskDefinition } from './index';
import { matchTerm, normaliseTerm, tolerance, typoDistance } from './match';
import { BLITZ_MS } from './meta';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);
const EMPTY_PSM = { stages: [], specifications: [], cards: [], mcq: [], short: [] } as unknown as PsmFile;

function content(terms = fixtureTerms()): ContentIndex {
  const empty = { cards: [], mcq: [], short: [] };
  return buildIndex({ areas: [empty, empty, empty, empty], terms, psm: EMPTY_PSM, caseStudies: [] });
}

function ctx(index: ContentIndex | null, now = () => 1_000): GameContext {
  return { playerName: '', now, content: index, mastery: () => null, today: '2026-10-01', daily: null };
}

describe('blitz tolerance rule', () => {
  it('allows 1 edit up to 4 characters, 2 up to 14, then a fifth of the length', () => {
    expect([1, 2, 3, 4].map(tolerance)).toEqual([1, 1, 1, 1]);
    expect([5, 9, 14].map(tolerance)).toEqual([2, 2, 2]);
    expect([15, 19, 20, 24, 25, 35].map(tolerance)).toEqual([3, 3, 4, 4, 5, 7]);
  });

  it('counts a swap of neighbouring letters as one edit', () => {
    expect(typoDistance('algorithm', 'algortihm')).toBe(1);
    expect(typoDistance('xml', 'xlm')).toBe(1);
    expect(typoDistance('kitten', 'sitting')).toBe(3);
    expect(typoDistance('', 'abc')).toBe(3);
    expect(typoDistance('same', 'same')).toBe(0);
  });

  it('normalises case, punctuation, hyphens and a leading article', () => {
    expect(normaliseTerm('  The Data-Flow  Diagram. ')).toBe('data flow diagram');
    expect(normaliseTerm('"CSV"')).toBe('csv');
    expect(normaliseTerm('an algorithm')).toBe('algorithm');
  });

  it('applies the rule at its edges', () => {
    const others = ['verification', 'HTML', 'XSD'];
    // Five characters or more: two edits pass, three fail.
    expect(matchTerm('algoritm', 'algorithm', [], others)).toBe('close');
    expect(matchTerm('algortim', 'algorithm', [], others)).toBe('close');
    expect(matchTerm('algrtm', 'algorithm', [], others)).toBe('wrong');
    // Four characters or fewer: one edit passes, two fail, so HTML is never XML.
    expect(matchTerm('xlm', 'XML', [], [])).toBe('close');
    expect(matchTerm('html', 'XML', [], [])).toBe('wrong');
    // Fifteen or more: a fifth of the length (35 characters allow 7).
    const srs = 'software requirements specification';
    expect(srs.length).toBe(35);
    expect(matchTerm('sofware requirments specifcation', srs, [], [])).toBe('close');
    expect(matchTerm('software requirements', srs, [], [])).toBe('wrong');
    // Aliases count, and an exact different term never does.
    expect(matchTerm('srs', srs, ['SRS'], [])).toBe('exact');
    expect(matchTerm('verification', 'validation', [], others)).toBe('other-term');
    expect(matchTerm('XSD', 'XML', [], others)).toBe('other-term');
    expect(matchTerm('', 'XML', [], [])).toBe('wrong');
  });
});

describe('blitz items', () => {
  const terms = fixtureTerms();

  it('uses fixture cards that the content schema accepts', () => {
    for (const card of terms) expect(CardSchema.safeParse(card).success).toBe(true);
  });

  it('hides the term and its aliases when a definition uses them', () => {
    expect(maskDefinition('A DFD, or data flow diagram, shows flows.', ['data flow diagram', 'DFD'])).toBe('A (this term), or (this term), shows flows.');
    expect(maskDefinition('Validation checks input.', ['valid'])).toBe('Validation checks input.');
  });

  it('accepts each term, its aliases and small slips, and rejects other terms (500 seeds)', () => {
    for (const seed of SEEDS) {
      const session = game.start(ctx(content()), { difficulty: 'normal', seed });
      for (let i = 0; i < 3; i++) {
        const current = session.current!()!;
        const card = terms.find((c) => c.id === current.itemId)!;
        const others = terms.filter((c) => c !== card).flatMap((c) => [c.front, ...(c.aliases ?? [])]);
        const item = blitzItem(card, others);
        expect(item.check(card.front).correct).toBe(true);
        expect(item.check(card.front.toUpperCase()).correct).toBe(true);
        for (const alias of card.aliases ?? []) expect(item.check(alias).correct).toBe(true);
        if (card.front.length >= 5) expect(item.check(card.front.slice(0, -1)).correct).toBe(true);
        const other = terms[(terms.indexOf(card) + 1 + (seed % (terms.length - 1))) % terms.length];
        const wrong = item.check(other.front);
        expect(wrong.correct).toBe(false);
        expect(wrong.expected).toBe(card.front);
        const skipped = item.check('skip');
        expect(skipped.correct).toBe(false);
        expect(skipped.counted).not.toBe(false);
        const typed = i % 2 ? card.front : 'no idea at all';
        expect(session.answer(typed).correct).toBe(i % 2 === 1);
      }
    }
  });

  it('shows the definition as bundled Markdown and offers a skip chip', () => {
    const item = blitzItem(terms[0], []);
    expect(item.prompt[0]).toEqual({ kind: 'markdown', text: terms[0].back });
    expect(item.chips).toEqual(['skip']);
    expect(item.kk).toEqual(['TERMS']);
    expect(item.id).toBe('t-algorithm');
  });
});

describe('blitz game', () => {
  it('runs for 60 seconds with no fixed number of questions', () => {
    let t = 5_000;
    const session = game.start(ctx(content(), () => t), { difficulty: 'normal', seed: 3 });
    expect(session.deadline).toBe(5_000 + BLITZ_MS);
    expect(session.progress).toBeUndefined();
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push(session.current!()!.itemId);
      t += 1_000;
      session.answer('skip');
    }
    // Every term comes up once before any repeats, and never twice in a row.
    expect(new Set(seen.slice(0, terms().length)).size).toBe(terms().length);
    expect(seen.every((id, i) => i === 0 || id !== seen[i - 1])).toBe(true);
    t = 5_000 + BLITZ_MS;
    expect(session.done).toBe(true);
    const summary = session.summary();
    expect(summary.total).toBe(40);
    expect(summary.blocks.some((b) => b.kind === 'text' && b.text.startsWith("Time's up: 0 of 40 correct."))).toBe(true);
  });

  it('says so when no glossary is installed, and suggests another game', () => {
    for (const index of [null, content([])]) {
      const session = game.start(ctx(index), { difficulty: 'normal', seed: 1 });
      expect(session.done).toBe(true);
      const text = session.unavailable?.map((b) => (b.kind === 'text' ? b.text : '')).join(' ');
      expect(text).toContain('No glossary terms are installed yet');
      expect(text).toContain('play deskcheck');
    }
  });

  it('is deterministic for a seed', () => {
    const order = (seed: number) => {
      const s = game.start(ctx(content()), { difficulty: 'normal', seed });
      return Array.from({ length: 20 }, () => {
        const id = s.current!()!.itemId;
        s.answer('skip');
        return id;
      });
    };
    expect(order(7)).toEqual(order(7));
    expect(order(7)).not.toEqual(order(8));
  });
});

function terms() {
  return fixtureTerms();
}

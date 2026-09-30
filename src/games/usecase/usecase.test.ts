/**
 * The usecase game over 500 seeds at every difficulty. Diagrams are checked against FigureSchema
 * and against an independent convention checker written here, which reads only the figure data
 * and the scenario's always/sometimes pairs: a correct diagram has no errors, and each error
 * diagram has exactly one, the element the item marks as the answer.
 */
import { describe, expect, it } from 'vitest';
import { FigureSchema, UseCaseDiagramSchema, type UseCaseDiagram } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, QuizItem } from '../types';
import game from './index';
import {
  actorsItem,
  fromUsecaseInstance,
  generateUsecaseItem,
  linkItem,
  parseLinkType,
  parseNumbers,
  planUsecaseRound,
  relationships,
  spotItem,
  usecaseItem,
} from './items';
import { diagramFor, SYSTEMS, USE_CASE_ERRORS, type UseCaseSystem } from './systems';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 13);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

/** Every convention error in a diagram, as the id or `from->to` key of the faulty element. */
function conventionErrors(fig: UseCaseDiagram, sys: UseCaseSystem): string[] {
  const b = fig.system;
  const inside = (x: number, y: number) => x > b.x - b.w / 2 && x < b.x + b.w / 2 && y > b.y - b.h / 2 && y < b.y + b.h / 2;
  const actors = new Set(fig.actors.map((a) => a.id));
  const label = (id: string) => fig.useCases.find((u) => u.id === id)?.label;
  const pair = (x: string, y: string, p: readonly [string, string]) => (label(x) === p[0] && label(y) === p[1]) || (label(x) === p[1] && label(y) === p[0]);
  const always = [sys.useCases.u1, sys.useCases.u2] as const;
  const sometimes = [sys.useCases.u1, sys.useCases.u3] as const;
  const errors: string[] = [];
  for (const a of fig.actors) if (inside(a.x, a.y)) errors.push(a.id);
  for (const u of fig.useCases) if (!inside(u.x, u.y)) errors.push(u.id);
  for (const l of fig.links) {
    const key = `${l.from}->${l.to}`;
    if (l.type === 'association' && actors.has(l.from) && actors.has(l.to)) errors.push(key);
    if (l.type === 'includes' && pair(l.from, l.to, sometimes)) errors.push(key);
    if (l.type === 'extends' && pair(l.from, l.to, always)) errors.push(key);
    // Direction: includes runs from the base, extends runs into the base.
    if (l.type === 'includes' && pair(l.from, l.to, always) && label(l.from) !== always[0]) errors.push(key);
    if (l.type === 'extends' && pair(l.from, l.to, sometimes) && label(l.to) !== sometimes[0]) errors.push(key);
  }
  return errors;
}

function figureBlock(item: QuizItem): Extract<TerminalBlock, { kind: 'figure' }> {
  return item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'figure' }> => b.kind === 'figure')!;
}

function choices(item: QuizItem): string[] {
  return item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'choices' }> => b.kind === 'choices')!.options;
}

describe('usecase diagrams', () => {
  it('lays every system out validly, with no errors in the correct diagram', () => {
    for (const sys of SYSTEMS) {
      const fig = diagramFor(sys, null);
      expect(FigureSchema.safeParse(fig).success, sys.id).toBe(true);
      expect(conventionErrors(fig, sys), sys.id).toEqual([]);
      // Use cases sit fully inside the boundary and apart from each other.
      const b = fig.system;
      for (const u of fig.useCases) {
        const rx = u.rx ?? 84;
        expect(u.x - rx).toBeGreaterThan(b.x - b.w / 2);
        expect(u.x + rx).toBeLessThan(b.x + b.w / 2);
      }
    }
  });

  it('injects exactly one convention error, and each one is valid figure data', () => {
    for (const sys of SYSTEMS) {
      for (const error of USE_CASE_ERRORS) {
        const fig = diagramFor(sys, error);
        expect(FigureSchema.safeParse(fig).success, `${sys.id} ${error}`).toBe(true);
        expect(conventionErrors(fig, sys), `${sys.id} ${error}`).toHaveLength(1);
      }
    }
  });

  it('still rejects an association between two use cases', () => {
    const fig = diagramFor(SYSTEMS[0], null);
    const bad = { ...fig, links: [...fig.links, { from: 'u1', to: 'u4', type: 'association' as const }] };
    expect(UseCaseDiagramSchema.safeParse(bad).success).toBe(false);
  });
});

describe('usecase items', () => {
  it.each(LEVELS)('spot items mark exactly one faulty element and accept only its letter (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const sys = SYSTEMS[seed % SYSTEMS.length];
      for (const error of USE_CASE_ERRORS) {
        const item = spotItem(sys, error, seed, level);
        const block = figureBlock(item);
        expect(FigureSchema.safeParse(block.figure).success).toBe(true);
        const markers = block.highlight as Record<string, string>;
        const faulty = conventionErrors(block.figure as UseCaseDiagram, sys);
        expect(faulty).toHaveLength(1);
        expect(Object.keys(markers)).toContain(faulty[0]);
        expect(Object.keys(markers)).toHaveLength(level === 'hard' ? 5 : 4);
        const right = markers[faulty[0]];
        expect(item.check(right).correct, `${item.instance}`).toBe(true);
        expect(item.check(right.toLowerCase()).correct).toBe(true);
        for (const letter of Object.values(markers)) if (letter !== right) expect(item.check(letter).correct).toBe(false);
        expect(item.check('Z').counted).toBe(false);
        expect(item.chips).toEqual(Object.values(markers).sort());
        expect(fromUsecaseInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it.each(LEVELS)('actor items accept exactly the actors, in any order (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      const sys = SYSTEMS[seed % SYSTEMS.length];
      const item = actorsItem(sys, seed, level);
      const list = choices(item);
      const actorLabels = Object.values(sys.actors);
      const right = list.flatMap((label, i) => (actorLabels.includes(label) ? [i + 1] : []));
      expect(right).toHaveLength(3);
      expect(list.length).toBe(level === 'easy' ? 5 : 6);
      expect(item.check(right.join(' ')).correct).toBe(true);
      expect(item.check([...right].reverse().join(', ')).correct).toBe(true);
      const nonActor = list.findIndex((l) => !actorLabels.includes(l)) + 1;
      expect(item.check([...right, nonActor].join(' ')).correct).toBe(false);
      expect(item.check(right.slice(0, 2).join(' ')).correct).toBe(false);
      expect(item.check('9 9').counted).toBe(false);
      expect(fromUsecaseInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
  });

  it('link items accept the right relationship and explain the arrow', () => {
    for (const sys of SYSTEMS) {
      for (const rel of relationships(sys)) {
        for (const seed of SEEDS.slice(0, 20)) {
          const item = linkItem(sys, rel.id, seed, 'normal');
          expect(item.check(rel.type).correct).toBe(true);
          expect(item.check(`<<${rel.type}>>`).correct).toBe(true);
          expect(item.check(rel.type === 'includes' ? 'extends' : 'includes').correct).toBe(false);
          expect(item.check('both').counted).toBe(false);
          expect(item.check(rel.type).reason).toMatch(rel.type === 'includes' ? /always performed/ : /only sometimes/);
          expect(fromUsecaseInstance(item.instance!)?.prompt).toEqual(item.prompt);
        }
        // The statement says which it is.
        expect(rel.statement).toMatch(rel.type === 'includes' ? /[Ee]very|must/ : /only|can|if/);
      }
    }
  });

  it('parses answers leniently', () => {
    expect(parseLinkType('<<includes>>')).toBe('includes');
    expect(parseLinkType('Include')).toBe('includes');
    expect(parseLinkType('extension')).toBe('extends');
    expect(parseLinkType('association')).toBeNull();
    expect(parseNumbers('1 3 4', 6)).toEqual([1, 3, 4]);
    expect(parseNumbers('1, 3 and 4', 6)).toEqual([1, 3, 4]);
    expect(parseNumbers('134', 6)).toEqual([1, 3, 4]);
    expect(parseNumbers('7', 6)).toBeNull();
    expect(parseNumbers('one', 6)).toBeNull();
  });
});

describe('usecase rounds', () => {
  it.each(LEVELS)('plan the %s mix, with every error kind in a round of four or more diagrams', (level) => {
    for (const seed of SEEDS.slice(0, 200)) {
      const plan = planUsecaseRound(seed, level);
      expect(plan).toHaveLength(10);
      const spots = plan.filter((p) => p.kind === 'spot');
      if (spots.length >= 4) expect(new Set(spots.map((p) => p.error)).size).toBe(4);
      for (const p of plan) {
        const item = usecaseItem(p, level);
        if (seed < 20) expect(fromUsecaseInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it('generates standalone items deterministically', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS.slice(0, 200)) {
      const item = generateUsecaseItem(seed, 'normal');
      ids.add(item.id);
      expect(generateUsecaseItem(seed, 'normal').prompt).toEqual(item.prompt);
      expect(fromUsecaseInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    expect([...ids].sort()).toEqual(['gen-usecase-actors', 'gen-usecase-link', 'gen-usecase-spot']);
    expect(fromUsecaseInstance('usecase:spot:bookshop:nope:seed=1:easy')).toBeNull();
    expect(fromUsecaseInstance('usecase:link:bookshop:nope:seed=1:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 8 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('???').expected;
      const typed = /^[A-E]: /.test(expected) ? expected.charAt(0) : expected.replace(/ \([^)]*\)/g, '').replace(/ and /g, ' ');
      expect(session.answer(typed).correct, `${expected} -> ${typed}`).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'usecase', score: 10, total: 10 });
  });
});

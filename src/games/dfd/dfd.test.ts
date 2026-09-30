/**
 * The dfd game over 500 seeds at every difficulty. Figures are checked against FigureSchema and
 * against an independent convention checker written here, which reads only the figure data: a
 * correct diagram breaks no rule, every injected diagram breaks exactly one, and that one is the
 * marked element the item expects. Labelling answers are checked against the unblanked diagram.
 */
import { describe, expect, it } from 'vitest';
import { FigureSchema, type ContextDiagram, type Dfd } from '../../content/schema';
import { textWidth, wrapText } from '../../figures/text';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, QuizItem } from '../types';
import { buildContext, buildDfd, faultyKey, injectionsFor, ruleOf, RULES, type DiagramKind, type Rule } from './diagrams';
import game from './index';
import { dfdItem, fromDfdInstance, generateDfdItem, parseRule, planDfdRound, RULE_CHIPS, wordBank, type DfdSpec } from './items';
import { CONTEXT_FLOWS, ENTITY_W, FLOW_SLOTS, PROCESS_SLOTS, SYSTEMS } from './systems';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 17);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

/** Verbs that start a correct process name in this bank. Written out here, apart from the game. */
const VERBS = new Set(['take', 'prepare', 'book', 'enrol', 'allocate', 'collect', 'record', 'lodge', 'pack', 'arrange', 'order']);

interface Broken {
  key: string;
  rule: Rule;
}

/** Every convention the figure breaks, with the key of the element that breaks it. */
function conventionErrors(fig: Dfd | ContextDiagram): Broken[] {
  const type = (id: string): 'entity' | 'process' | 'store' => {
    if (fig.kind === 'context') return id === 'system' ? 'process' : 'entity';
    return fig.nodes.find((n) => n.id === id)!.type;
  };
  const out: Broken[] = [];
  for (const f of fig.flows) {
    const key = f.id ?? `${f.from}->${f.to}`;
    const ends = [type(f.from), type(f.to)].sort().join('+');
    if (ends === 'entity+entity') out.push({ key, rule: 'entity-entity' });
    if (ends === 'entity+store') out.push({ key, rule: 'store-entity' });
    if (ends === 'store+store') out.push({ key, rule: 'store-store' });
    if (!f.label.trim()) out.push({ key, rule: 'unlabelled' });
  }
  const processes = fig.kind === 'context' ? [{ id: 'system', label: '' }] : fig.nodes.filter((n) => n.type === 'process');
  for (const p of processes) {
    if (!fig.flows.some((f) => f.to === p.id) || !fig.flows.some((f) => f.from === p.id)) out.push({ key: p.id, rule: 'no-io' });
    if (fig.kind === 'dfd' && !VERBS.has(p.label.split(' ')[0].toLowerCase())) out.push({ key: p.id, rule: 'noun' });
  }
  return out;
}

function figures(item: QuizItem): Extract<TerminalBlock, { kind: 'figure' }>[] {
  return item.prompt.filter((b): b is Extract<TerminalBlock, { kind: 'figure' }> => b.kind === 'figure');
}

function choices(item: QuizItem): string[] {
  return item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'choices' }> => b.kind === 'choices')?.options ?? [];
}

describe('dfd diagrams', () => {
  it('draws every business correctly, mirrored or not, on both kinds of diagram', () => {
    for (const sys of SYSTEMS) {
      for (const mirror of [false, true]) {
        for (const fig of [buildDfd(sys, { mirror }), buildContext(sys, { mirror })]) {
          expect(FigureSchema.safeParse(fig).success, `${sys.id} ${fig.kind}`).toBe(true);
          expect(conventionErrors(fig), `${sys.id} ${fig.kind}`).toEqual([]);
        }
      }
    }
  });

  it('injects exactly one convention error, of the declared rule, on the declared element', () => {
    for (const sys of SYSTEMS) {
      for (const kind of ['dfd', 'context'] as DiagramKind[]) {
        const injections = injectionsFor(sys, kind);
        const rules = new Set(injections.map(ruleOf));
        expect([...rules].sort(), `${sys.id} ${kind}`).toEqual(kind === 'dfd' ? [...RULES].sort() : ['entity-entity', 'unlabelled']);
        for (const injection of injections) {
          for (const mirror of [false, true]) {
            const fig = kind === 'dfd' ? buildDfd(sys, { injection, mirror }) : buildContext(sys, { injection, mirror });
            expect(FigureSchema.safeParse(fig).success).toBe(true);
            expect(conventionErrors(fig), `${sys.id} ${kind} ${injection}`).toEqual([{ key: faultyKey(injection), rule: ruleOf(injection) }]);
            // Nothing is left unconnected.
            const ids = fig.kind === 'dfd' ? fig.nodes.map((n) => n.id) : ['system', ...fig.entities.map((e) => e.id)];
            for (const id of ids) expect(fig.flows.some((f) => f.from === id || f.to === id), `${injection} ${id}`).toBe(true);
          }
        }
      }
    }
  });

  it('offers both kinds of process error for every business', () => {
    for (const sys of SYSTEMS) {
      const io = injectionsFor(sys, 'dfd').filter((i) => ruleOf(i) === 'no-io');
      expect(io.some((i) => i.startsWith('no-inputs-'))).toBe(true);
      expect(io.some((i) => i.startsWith('no-outputs-'))).toBe(true);
    }
  });

  it('names processes with verbs, and the noun names without one', () => {
    for (const sys of SYSTEMS) {
      for (const p of PROCESS_SLOTS) {
        expect(VERBS.has(sys.processes[p].split(' ')[0].toLowerCase()), sys.processes[p]).toBe(true);
        expect(VERBS.has(sys.nouns[p].split(' ')[0].toLowerCase()), sys.nouns[p]).toBe(false);
        expect(sys.nouns[p]).not.toBe(sys.processes[p]);
      }
    }
  });

  it('keeps labels short enough for the hand-laid layout', () => {
    for (const sys of SYSTEMS) {
      for (const label of Object.values(sys.entities)) expect(textWidth(label), label).toBeLessThanOrEqual(ENTITY_W - 16);
      for (const label of Object.values(sys.stores)) expect(textWidth(label), label).toBeLessThanOrEqual(108);
      for (const p of PROCESS_SLOTS) expect(wrapText(sys.processes[p], 72).length, sys.processes[p]).toBeLessThanOrEqual(3);
      for (const f of FLOW_SLOTS) {
        expect(sys.flows[f]).toMatch(/^[a-z]+(_[a-z]+)*$/);
        expect(textWidth(sys.flows[f]), sys.flows[f]).toBeLessThanOrEqual(CONTEXT_FLOWS.includes(f) ? 150 : 170);
      }
      expect(wrapText(sys.system, 64 * 1.65, { bold: true }).length, sys.system).toBeLessThanOrEqual(3);
      for (const label of [sys.wrong.entityEntity.label, sys.wrong.storeToCustomer, sys.wrong.storeToStaff, sys.wrong.storeToStore]) expect(label).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(new Set(Object.values(sys.flows)).size).toBe(FLOW_SLOTS.length);
    }
  });
});

/** The answer an independent reading of the item gives, and a wrong one. */
function answers(item: QuizItem): { right: string; wrong: string[] } {
  const figs = figures(item);
  if (item.id === 'gen-dfd-element') {
    const block = figs[0];
    const broken = conventionErrors(block.figure as Dfd | ContextDiagram);
    expect(broken, item.instance).toHaveLength(1);
    const markers = block.highlight as Record<string, string>;
    expect(Object.keys(markers)).toContain(broken[0].key);
    const right = markers[broken[0].key];
    return { right, wrong: Object.values(markers).filter((l) => l !== right) };
  }
  if (item.id === 'gen-dfd-rule') {
    const m = /^dfd:(?:rule|follow-up):([a-z]+):(context|dfd):([a-z0-9-]+):m([01])/.exec(item.instance!)!;
    const sys = SYSTEMS.find((s) => s.id === m[1])!;
    const fig = m[2] === 'dfd' ? buildDfd(sys, { injection: m[3], mirror: m[4] === '1' }) : buildContext(sys, { injection: m[3], mirror: m[4] === '1' });
    const broken = conventionErrors(fig);
    expect(broken).toHaveLength(1);
    if (figs.length) expect(conventionErrors(figs[0].figure as Dfd | ContextDiagram)).toEqual(broken);
    const n = RULES.indexOf(broken[0].rule) + 1;
    return { right: String(n), wrong: [1, 2, 3, 4, 5, 6].filter((k) => k !== n).map(String) };
  }
  // Labelling: read the blank's label off the complete diagram.
  const m = /^dfd:label(?:-next)?:([a-z]+):([a-z0-9-]+):(\d):m([01])/.exec(item.instance!)!;
  const sys = SYSTEMS.find((s) => s.id === m[1])!;
  const blanks = m[2].split('-');
  const slot = blanks[Number(m[3])];
  const full = buildDfd(sys, { mirror: m[4] === '1' });
  const right = full.nodes.find((n) => n.id === slot)!.label;
  const shown = figures(item).at(-1)!.figure as Dfd;
  expect(shown.nodes.find((n) => n.id === slot)!.label).toBe('?');
  expect(conventionErrors({ ...shown, nodes: full.nodes })).toEqual([]);
  return { right, wrong: choices(item).filter((c) => c !== right) };
}

describe('dfd items', () => {
  it.each(LEVELS)('accept the independent answer and reject every other (%s, 500 seeds)', (level) => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      for (const spec of planDfdRound(seed, level)) {
        const item = dfdItem(spec, level);
        seen.add(item.id);
        for (const f of figures(item)) expect(FigureSchema.safeParse(f.figure).success, item.instance).toBe(true);
        const { right, wrong } = answers(item);
        expect(item.check(right).correct, `${item.instance}: ${right}`).toBe(true);
        for (const w of wrong) {
          const r = item.check(w);
          expect(r.correct, `${item.instance}: ${w}`).toBe(false);
          expect(r.counted).not.toBe(false);
        }
        expect(item.check('zz').counted).toBe(false);
        const expected = item.check('zz').expected;
        const typed = item.id === 'gen-dfd-element' ? expected.charAt(0) : expected.replace(/^\d\. /, '');
        expect(item.check(typed).correct, `${item.instance}: ${typed}`).toBe(true);
        if (seed < 60) expect(fromDfdInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
    expect([...seen].sort()).toEqual(['gen-dfd-element', 'gen-dfd-label', 'gen-dfd-rule']);
  });

  it('accepts rule numbers, chips and short phrases', () => {
    for (const rule of RULES) {
      expect(parseRule(String(RULES.indexOf(rule) + 1))).toBe(rule);
      expect(parseRule(RULE_CHIPS[rule])).toBe(rule);
    }
    expect(parseRule('a flow between two data stores')).toBe('store-store');
    expect(parseRule('Entity -> store')).toBe('store-entity');
    expect(parseRule('no outputs')).toBe('no-io');
    expect(parseRule('unlabeled')).toBe('unlabelled');
    expect(parseRule('rule 5')).toBe('noun');
    expect(parseRule('7')).toBeNull();
    expect(parseRule('a')).toBeNull();
  });

  it('marks four elements, or five on --hard, favouring the same kind as the faulty one', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      for (const level of LEVELS) {
        const item = dfdItem(planDfdRound(seed, level).find((s) => s.kind === 'element')!, level);
        expect(Object.keys(figures(item)[0].highlight as object)).toHaveLength(level === 'hard' ? 5 : 4);
      }
    }
  });

  it('accepts a word bank label by number or by name, ignoring case', () => {
    const sys = SYSTEMS[0];
    const spec: DfdSpec = { kind: 'label', scenario: { system: sys.id, blanks: ['p2', 'd2', 'p3', 'd3'], index: 1, mirror: false, seed: 4 } };
    const item = dfdItem(spec, 'normal');
    const bank = wordBank(sys, ['p2', 'd2', 'p3', 'd3']);
    expect(choices(item)).toEqual(bank);
    expect(item.check('orders').correct).toBe(true);
    expect(item.check(String(bank.indexOf('Orders') + 1)).correct).toBe(true);
    expect(item.check('Menu').counted).toBe(false);
    expect(item.check('9').counted).toBe(false);
    // Blanks already asked are filled in; the rest show "?" with their letters.
    const shown = figures(item).at(-1)!;
    expect((shown.figure as Dfd).nodes.find((n) => n.id === 'p2')!.label).toBe('Prepare order');
    expect(shown.highlight).toEqual({ d2: 'B', p3: 'C', d3: 'D' });
  });
});

describe('dfd rounds', () => {
  it.each(LEVELS)('plan three error diagrams and four blanks to label (%s)', (level) => {
    for (const seed of SEEDS.slice(0, 200)) {
      const plan = planDfdRound(seed, level);
      expect(plan).toHaveLength(10);
      expect(plan.filter((p) => p.kind === 'element')).toHaveLength(3);
      expect(plan.filter((p) => p.kind === 'rule')).toHaveLength(3);
      expect(plan.filter((p) => p.kind === 'label')).toHaveLength(4);
      const rules = plan.flatMap((p) => (p.kind === 'element' ? [ruleOf(p.scenario.injection)] : []));
      expect(new Set(rules).size).toBe(3);
      plan.forEach((p, i) => {
        if (p.kind === 'rule') expect(plan[i - 1]).toEqual({ kind: 'element', scenario: p.scenario });
      });
      const systems = plan.map((p) => p.scenario.system);
      expect(new Set(systems).size).toBe(4);
    }
  });

  it('shows the context diagram with the first blank only, in a round', () => {
    const plan = planDfdRound(5, 'normal').filter((p) => p.kind === 'label');
    const counts = plan.map((p) => figures(dfdItem(p, 'normal')).length);
    expect(counts).toEqual([2, 1, 1, 1]);
    expect(figures(dfdItem(plan[0], 'normal'))[0].figure.kind).toBe('context');
  });

  it('generates standalone items deterministically, each with its own figure', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS.slice(0, 200)) {
      const item = generateDfdItem(seed, 'normal');
      ids.add(item.id);
      expect(figures(item).length).toBeGreaterThanOrEqual(1);
      expect(generateDfdItem(seed, 'normal').prompt).toEqual(item.prompt);
      expect(fromDfdInstance(item.instance!)?.prompt).toEqual(item.prompt);
      const { right } = answers(item);
      expect(item.check(right).correct).toBe(true);
    }
    expect([...ids].sort()).toEqual(['gen-dfd-element', 'gen-dfd-label', 'gen-dfd-rule']);
    expect(fromDfdInstance('dfd:element:cafe:context:noun-p2:m0:seed=1:easy')).toBeNull();
    expect(fromDfdInstance('dfd:label:cafe:p2-p2:0:m0:seed=1:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 21 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('zz').expected;
      const typed = /^[A-E]: /.test(expected) ? expected.charAt(0) : expected.replace(/^\d\. /, '');
      expect(session.answer(typed).correct, `${expected} -> ${typed}`).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'dfd', score: 10, total: 10 });
  });
});

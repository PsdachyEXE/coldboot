/**
 * The dfd game over 500 seeds at every difficulty. Figures are checked against FigureSchema and
 * against an independent checker for VCAA's rules written here, which reads only the figure data
 * (and, for crossing flows, the lines the figures' own router draws): a correct diagram breaks no
 * rule, every injected diagram breaks exactly one, and the marked element the item expects is the
 * one that breaks it. Labelling answers are checked against the unblanked diagram.
 */
import { describe, expect, it } from 'vitest';
import { FigureSchema, type ContextDiagram, type Dfd } from '../../content/schema';
import { connectorKey, routeConnectors, type Connector } from '../../figures/flows';
import type { Pt, Shape } from '../../figures/geometry';
import { textWidth, wrapText } from '../../figures/text';
import { DEFAULTS } from '../../figures/types';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, QuizItem } from '../types';
import { buildContext, buildDfd, faultyKey, INJECTED_RULES, injectionsFor, partnerKeys, ruleOf, RULES, VIEWS, type DiagramKind, type Rule, type View } from './diagrams';
import game from './index';
import { dfdItem, fromDfdInstance, generateDfdItem, parseRule, planDfdRound, RULE_PHRASES, RULE_TEXT, RULES_FOR, wordBank, type DfdSpec } from './items';
import { CONTEXT_FLOWS, ENTITY_W, FLOW_SLOTS, PROCESS_SLOTS, SYSTEMS } from './systems';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 17);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

/** Verbs that start a process name in this bank. Written out here, apart from the game. */
const VERBS = new Set(['take', 'prepare', 'book', 'enrol', 'allocate', 'collect', 'record', 'pack', 'arrange', 'order']);

interface Broken {
  /** The elements involved: one, or the two flows that cross. */
  keys: string[];
  rule: Rule;
}

// ---------------------------------------------------------------------------
// Crossing flows, read off the lines the renderer draws
// ---------------------------------------------------------------------------

function shapesOf(fig: Dfd | ContextDiagram): Map<string, Shape> {
  const shapes = new Map<string, Shape>();
  if (fig.kind === 'context') {
    shapes.set('system', { kind: 'circle', cx: fig.system.x, cy: fig.system.y, r: fig.system.r ?? DEFAULTS.systemR });
    for (const e of fig.entities) shapes.set(e.id, { kind: 'rect', cx: e.x, cy: e.y, w: e.w ?? DEFAULTS.entityW, h: e.h ?? DEFAULTS.entityH });
  } else {
    for (const n of fig.nodes) {
      if (n.type === 'process') shapes.set(n.id, { kind: 'circle', cx: n.x, cy: n.y, r: n.w ? n.w / 2 : DEFAULTS.processR });
      else if (n.type === 'store') shapes.set(n.id, { kind: 'rect', cx: n.x, cy: n.y, w: n.w ?? DEFAULTS.storeW, h: n.h ?? DEFAULTS.storeH });
      else shapes.set(n.id, { kind: 'rect', cx: n.x, cy: n.y, w: n.w ?? DEFAULTS.entityW, h: n.h ?? DEFAULTS.entityH });
    }
  }
  return shapes;
}

/** True when segments ab and cd cross at a point inside both (touching ends don't count). */
function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const cross = (o: Pt, p: Pt, q: Pt) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function crossingPairs(fig: Dfd | ContextDiagram): string[][] {
  const connectors: Connector[] = fig.flows.map((f) => ({ key: connectorKey(f), from: f.from, to: f.to, label: f.label, via: f.via, labelAt: f.labelAt, head: 'filled' }));
  const routed = routeConnectors(connectors, shapesOf(fig), fig);
  const pairs: string[][] = [];
  routed.forEach((r, i) => {
    for (const s of routed.slice(i + 1)) {
      let hit = false;
      for (let j = 1; j < r.points.length && !hit; j++) {
        for (let k = 1; k < s.points.length && !hit; k++) hit = segmentsCross(r.points[j - 1], r.points[j], s.points[k - 1], s.points[k]);
      }
      if (hit) pairs.push([r.connector.key, s.connector.key].sort());
    }
  });
  return pairs;
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

/** Every rule the figure breaks, with the keys of the elements that break it. */
function brokenRules(fig: Dfd | ContextDiagram): Broken[] {
  const type = (id: string): 'entity' | 'process' | 'store' => {
    if (fig.kind === 'context') return id === 'system' ? 'process' : 'entity';
    return fig.nodes.find((n) => n.id === id)!.type;
  };
  const out: Broken[] = [];
  for (const f of fig.flows) {
    const key = f.id ?? `${f.from}->${f.to}`;
    const ends = [type(f.from), type(f.to)].sort().join('+');
    if (ends === 'entity+entity') out.push({ keys: [key], rule: 'entity-entity' });
    if (ends === 'store+store') out.push({ keys: [key], rule: 'store-store' });
    if (ends === 'entity+store') out.push({ keys: [key], rule: 'entity-store' });
  }
  for (const keys of crossingPairs(fig)) out.push({ keys, rule: 'crossing' });
  if (fig.kind === 'context') return out;
  const inputs = (id: string) => fig.flows.filter((f) => f.to === id);
  const outputs = (id: string) => fig.flows.filter((f) => f.from === id);
  for (const n of fig.nodes) {
    const ins = inputs(n.id);
    const outs = outputs(n.id);
    if (n.type === 'process') {
      if (!ins.length && !outs.length) out.push({ keys: [n.id], rule: 'process-unconnected' });
      if (!ins.length || !outs.length) out.push({ keys: [n.id], rule: 'process-io' });
      for (const o of outs) if (ins.some((i) => i.label === o.label)) out.push({ keys: [o.id!], rule: 'same-name' });
    }
    if (n.type === 'store' && (!ins.length || !outs.length)) out.push({ keys: [n.id], rule: 'store-io' });
    if (n.type === 'entity' && !ins.length && !outs.length) out.push({ keys: [n.id], rule: 'entity-unconnected' });
  }
  return out;
}

/** What the game's own figures always do: one set of information per flow, named in snake_case, and no numbers on nodes. */
function expectWellDrawn(fig: Dfd | ContextDiagram, label: string): void {
  expect(FigureSchema.safeParse(fig).success, label).toBe(true);
  for (const f of fig.flows) expect(f.label, `${label} ${f.id}`).toMatch(/^[a-z]+(_[a-z]+)*$/);
  if (fig.kind === 'dfd') for (const n of fig.nodes) expect(n.number, `${label} ${n.id}`).toBeUndefined();
}

function figures(item: QuizItem): Extract<TerminalBlock, { kind: 'figure' }>[] {
  return item.prompt.filter((b): b is Extract<TerminalBlock, { kind: 'figure' }> => b.kind === 'figure');
}

function choices(item: QuizItem): string[] {
  return item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'choices' }> => b.kind === 'choices')?.options ?? [];
}

/** Every piece of text an item shows or says, for checks on its wording. */
function allText(item: QuizItem): string {
  const blocks = item.prompt.map((b) => (b.kind === 'text' ? b.text : b.kind === 'choices' ? b.options.join('\n') : '')).join('\n');
  const r = item.check('A');
  const s = item.check('1');
  return [blocks, r.expected, r.reason, s.reason].join('\n');
}

describe('dfd diagrams', () => {
  it('draws every business so it breaks none of the rules, in every view, on both kinds of diagram', () => {
    for (const sys of SYSTEMS) {
      for (const view of VIEWS) {
        for (const fig of [buildDfd(sys, { view }), buildContext(sys, { view })]) {
          expectWellDrawn(fig, `${sys.id} ${fig.kind} view ${view}`);
          expect(brokenRules(fig), `${sys.id} ${fig.kind} view ${view}`).toEqual([]);
        }
      }
    }
  });

  it('gives every data store an input and an output, and every process an output named apart from its inputs', () => {
    for (const sys of SYSTEMS) {
      const fig = buildDfd(sys);
      for (const n of fig.nodes.filter((x) => x.type !== 'entity')) {
        expect(fig.flows.some((f) => f.to === n.id), `${sys.id} ${n.label}`).toBe(true);
        expect(fig.flows.some((f) => f.from === n.id), `${sys.id} ${n.label}`).toBe(true);
      }
    }
  });

  it('injects exactly one broken rule, of the declared kind, on the declared element', () => {
    for (const sys of SYSTEMS) {
      for (const kind of ['dfd', 'context'] as DiagramKind[]) {
        const injections = injectionsFor(sys, kind);
        const rules = new Set(injections.map(ruleOf));
        expect([...rules].sort(), `${sys.id} ${kind}`).toEqual(kind === 'dfd' ? [...INJECTED_RULES].sort() : ['entity-entity']);
        for (const injection of injections) {
          for (const view of VIEWS) {
            const fig = kind === 'dfd' ? buildDfd(sys, { injection, view }) : buildContext(sys, { injection, view });
            const label = `${sys.id} ${kind} ${injection} view ${view}`;
            expectWellDrawn(fig, label);
            const keys = ruleOf(injection) === 'crossing' ? [faultyKey(injection), ...partnerKeys(injection)].sort() : [faultyKey(injection)];
            expect(brokenRules(fig), label).toEqual([{ keys, rule: ruleOf(injection) }]);
          }
        }
      }
    }
  });

  it('offers both kinds of process and data store error for every business', () => {
    for (const sys of SYSTEMS) {
      for (const rule of ['process-io', 'store-io'] as const) {
        const found = injectionsFor(sys, 'dfd').filter((i) => ruleOf(i) === rule);
        expect(found.some((i) => i.startsWith('no-inputs-')), `${sys.id} ${rule}`).toBe(true);
        expect(found.some((i) => i.startsWith('no-outputs-')), `${sys.id} ${rule}`).toBe(true);
      }
    }
  });

  it("lists VCAA's ten data flow diagram rules and three context diagram rules, in order", () => {
    expect(RULES.dfd).toHaveLength(10);
    expect(RULES.context).toEqual(['entity-entity', 'crossing', 'single-set']);
    for (const r of RULES.context) expect(RULES.dfd).toContain(r);
    expect(new Set(Object.values(RULE_TEXT)).size).toBe(10);
    // Only rules that can be broken alone are injected; every injected rule is one of VCAA's.
    for (const r of INJECTED_RULES) expect(RULES.dfd).toContain(r);
    expect(INJECTED_RULES).not.toContain('single-set');
    expect(INJECTED_RULES).not.toContain('process-unconnected');
    for (const level of LEVELS) for (const r of RULES_FOR[level]) expect(INJECTED_RULES).toContain(r);
  });

  it('names processes with verb phrases', () => {
    for (const sys of SYSTEMS) {
      for (const p of PROCESS_SLOTS) expect(VERBS.has(sys.processes[p].split(' ')[0].toLowerCase()), sys.processes[p]).toBe(true);
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
      const { entityEntity, ...others } = sys.wrong;
      for (const label of [entityEntity.label, ...Object.values(others)]) expect(label).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(textWidth(sys.wrong.crossing), sys.wrong.crossing).toBeLessThanOrEqual(130);
      expect(new Set(Object.values(sys.flows)).size).toBe(FLOW_SLOTS.length);
    }
  });
});

/** The answer an independent reading of the item gives, and the wrong ones. */
function answers(item: QuizItem): { right: string; wrong: string[] } {
  const figs = figures(item);
  if (item.id === 'gen-dfd-element') {
    const block = figs[0];
    const broken = brokenRules(block.figure as Dfd | ContextDiagram);
    expect(broken, item.instance).toHaveLength(1);
    const markers = block.highlight as Record<string, string>;
    // Exactly one of the elements that break the rule is marked.
    const marked = broken[0].keys.filter((k) => k in markers);
    expect(marked, item.instance).toHaveLength(1);
    const right = markers[marked[0]];
    return { right, wrong: Object.values(markers).filter((l) => l !== right) };
  }
  if (item.id === 'gen-dfd-rule') {
    const m = /^dfd:(?:rule|follow-up):([a-z]+):(context|dfd):([a-z0-9-]+):v([0-3])/.exec(item.instance!)!;
    const sys = SYSTEMS.find((s) => s.id === m[1])!;
    const view = Number(m[4]) as View;
    const kind = m[2] as DiagramKind;
    const fig = kind === 'dfd' ? buildDfd(sys, { injection: m[3], view }) : buildContext(sys, { injection: m[3], view });
    const broken = brokenRules(fig);
    expect(broken).toHaveLength(1);
    if (figs.length) expect(brokenRules(figs[0].figure as Dfd | ContextDiagram)).toEqual(broken);
    expect(choices(item)).toEqual(RULES[kind].map((r) => RULE_TEXT[r]));
    const n = RULES[kind].indexOf(broken[0].rule) + 1;
    return { right: String(n), wrong: RULES[kind].map((_, i) => String(i + 1)).filter((k) => k !== String(n)) };
  }
  // Labelling: read the blank's label off the complete diagram.
  const m = /^dfd:label(?:-next)?:([a-z]+):([a-z0-9-]+):(\d):v([0-3])/.exec(item.instance!)!;
  const sys = SYSTEMS.find((s) => s.id === m[1])!;
  const blanks = m[2].split('-');
  const slot = blanks[Number(m[3])];
  const full = buildDfd(sys, { view: Number(m[4]) as View });
  const right = full.nodes.find((n) => n.id === slot)!.label;
  const shown = figures(item).at(-1)!.figure as Dfd;
  expect(shown.nodes.find((n) => n.id === slot)!.label).toBe('?');
  expect(brokenRules({ ...shown, nodes: full.nodes })).toEqual([]);
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
        const typed = item.id === 'gen-dfd-element' ? expected.charAt(0) : expected.replace(/^\d+\. /, '');
        expect(item.check(typed).correct, `${item.instance}: ${typed}`).toBe(true);
        if (seed < 60) expect(fromDfdInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
    expect([...seen].sort()).toEqual(['gen-dfd-element', 'gen-dfd-label', 'gen-dfd-rule']);
  });

  it('refers to processes and data stores by name, never by a number or a store id', () => {
    for (const seed of SEEDS.slice(0, 150)) {
      for (const level of LEVELS) {
        for (const spec of planDfdRound(seed, level)) {
          const item = dfdItem(spec, level);
          const text = allText(item);
          expect(text, item.instance).not.toMatch(/\bprocess \d|\bD\d\b|data store D|store id/i);
          for (const f of figures(item)) if (f.figure.kind === 'dfd') for (const n of f.figure.nodes) expect(n.number).toBeUndefined();
        }
      }
    }
  });

  it('accepts rule numbers, chips and short phrases for each kind of diagram', () => {
    for (const kind of ['dfd', 'context'] as DiagramKind[]) {
      RULES[kind].forEach((rule, i) => {
        expect(parseRule(String(i + 1), kind)).toBe(rule);
        expect(parseRule(`rule ${i + 1}`, kind)).toBe(rule);
        expect(parseRule(RULE_PHRASES[rule], kind)).toBe(rule);
        expect(parseRule(RULE_TEXT[rule], kind)).toBe(rule);
        expect(parseRule(`${i + 1}. ${RULE_TEXT[rule]}`, kind)).toBe(rule);
      });
    }
    expect(parseRule('a flow between two data stores', 'dfd')).toBe('store-store');
    expect(parseRule('Entity -> store', 'dfd')).toBe('entity-store');
    expect(parseRule('external entity to data store', 'dfd')).toBe('entity-store');
    expect(parseRule('a process with no outputs', 'dfd')).toBe('process-io');
    expect(parseRule('data store with no input', 'dfd')).toBe('store-io');
    expect(parseRule('Data flows cross each other', 'dfd')).toBe('crossing');
    expect(parseRule('same name', 'dfd')).toBe('same-name');
    expect(parseRule('10', 'dfd')).toBe('entity-unconnected');
    expect(parseRule('2', 'context')).toBe('crossing');
    // A context diagram has three rules, so 4 and the DFD-only phrases don't parse there.
    expect(parseRule('4', 'context')).toBeNull();
    expect(parseRule('store to store', 'context')).toBeNull();
    expect(parseRule('11', 'dfd')).toBeNull();
    expect(parseRule('no inputs', 'dfd')).toBeNull();
    expect(parseRule('a', 'dfd')).toBeNull();
  });

  it('marks four elements, or five on --hard, never the partner of a crossing or a copied name', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      for (const level of LEVELS) {
        const spec = planDfdRound(seed, level).find((s) => s.kind === 'element')!;
        const item = dfdItem(spec, level);
        const marks = Object.keys(figures(item)[0].highlight as object);
        expect(marks).toHaveLength(level === 'hard' ? 5 : 4);
        if (spec.kind === 'element') for (const p of partnerKeys(spec.scenario.injection)) expect(marks).not.toContain(p);
      }
    }
  });

  it('accepts a word bank label by number or by name, ignoring case', () => {
    const sys = SYSTEMS[0];
    const spec: DfdSpec = { kind: 'label', scenario: { system: sys.id, blanks: ['p2', 'd2', 'p3', 'd3'], index: 1, view: 0, seed: 4 } };
    const item = dfdItem(spec, 'normal');
    const bank = wordBank(sys, ['p2', 'd2', 'p3', 'd3']);
    expect(choices(item)).toEqual(bank);
    expect(item.check('orders').correct).toBe(true);
    expect(item.check(String(bank.indexOf('Orders') + 1)).correct).toBe(true);
    expect(item.check('Menu').counted).toBe(false);
    expect(item.check('9').counted).toBe(false);
    expect(item.check('orders').reason).toMatch(/^The data store marked B is Orders: it receives new_order and it sends order_record\./);
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
      for (const r of rules) expect(RULES_FOR[level]).toContain(r);
      plan.forEach((p, i) => {
        if (p.kind === 'rule') expect(plan[i - 1]).toEqual({ kind: 'element', scenario: p.scenario });
      });
      const systems = plan.map((p) => p.scenario.system);
      expect(new Set(systems).size).toBe(4);
    }
  });

  it('uses every injected rule and all four views of the layout, which place elements differently', () => {
    const plans = SEEDS.slice(0, 100).flatMap((seed) => planDfdRound(seed, 'normal'));
    expect([...new Set(plans.map((p) => p.scenario.view))].sort()).toEqual([...VIEWS]);
    expect(new Set(plans.flatMap((p) => (p.kind === 'element' ? [ruleOf(p.scenario.injection)] : []))).size).toBe(INJECTED_RULES.length);
    expect(plans.some((p) => p.kind === 'element' && p.scenario.diagram === 'context')).toBe(true);
    const at = (view: View) => buildDfd(SYSTEMS[0], { view }).nodes.map((n) => `${n.x},${n.y}`).join(' ');
    expect(new Set(VIEWS.map(at)).size).toBe(4);
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
    expect(fromDfdInstance('dfd:element:cafe:context:same-name-p2:v0:seed=1:easy')).toBeNull();
    expect(fromDfdInstance('dfd:element:cafe:dfd:no-inputs-p1:v0:seed=1:easy')).toBeNull();
    expect(fromDfdInstance('dfd:element:cafe:dfd:noun-p2:v0:seed=1:easy')).toBeNull();
    expect(fromDfdInstance('dfd:label:cafe:p2-p2:0:v0:seed=1:easy')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: level, seed: 21 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('zz').expected;
      const typed = /^[A-E]: /.test(expected) ? expected.charAt(0) : expected.replace(/^\d+\. /, '');
      expect(session.answer(typed).correct, `${expected} -> ${typed}`).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'dfd', score: 10, total: 10 });
  });
});

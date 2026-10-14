/**
 * Builds the `dfd` game's figures from a business in ./systems.ts: a Level 1 DFD or a context
 * diagram in one of four views (as laid out, mirrored left to right, flipped top to bottom, or
 * both), with one rule broken, or with some process and store labels blanked out for the
 * labelling questions.
 *
 * The rules are VCAA's, from the outcome-specific requirements, in their order: ten for a data
 * flow diagram and three for a context diagram (RULES below). Eight of the ten can be broken
 * here without breaking another; "one set of information per flow" and "every process is
 * connected" are taught in the rule list but never injected, since neither can be shown alone.
 * Only a flow between two entities is injected on a context diagram: in its layout every flow
 * already runs between an entity and the system, so nothing else can go wrong without breaking
 * the symbols themselves.
 */
import type { ContextDiagram, Dfd, DfdNode, Flow } from '../../content/schema';
import { textWidth } from '../../figures/text';
import {
  CONTEXT_ENTITY_AT,
  CONTEXT_FLOWS,
  CONTEXT_HEIGHT,
  CONTEXT_SYSTEM_AT,
  CONTEXT_WIDTH,
  CROSSING_LABELS,
  DFD_HEIGHT,
  DFD_WIDTH,
  ENTITY_SLOTS,
  ENTITY_W,
  FLOW_ENDS,
  FLOW_SLOTS,
  NODE_AT,
  PROCESS_SLOTS,
  STORE_SLOTS,
  type DfdSystem,
  type EntitySlot,
  type FlowSlot,
  type NodeSlot,
  type ProcessSlot,
} from './systems';

export type DiagramKind = 'context' | 'dfd';

/** Every rule the game teaches, by a short key. */
export type Rule =
  | 'entity-entity'
  | 'store-store'
  | 'entity-store'
  | 'crossing'
  | 'single-set'
  | 'process-io'
  | 'same-name'
  | 'store-io'
  | 'process-unconnected'
  | 'entity-unconnected';

/** VCAA's rules for each kind of diagram, in the order the outcome-specific requirements list them. */
export const RULES: Record<DiagramKind, readonly Rule[]> = {
  dfd: ['entity-entity', 'store-store', 'entity-store', 'crossing', 'single-set', 'process-io', 'same-name', 'store-io', 'process-unconnected', 'entity-unconnected'],
  context: ['entity-entity', 'crossing', 'single-set'],
};

/** The rules an injected error can break on a data flow diagram. */
export const INJECTED_RULES: readonly Rule[] = ['entity-entity', 'store-store', 'entity-store', 'crossing', 'process-io', 'same-name', 'store-io', 'entity-unconnected'];

/**
 * One injected error, encoded for instances: 'entity-entity', 'store-customer', 'store-staff',
 * 'staff-store', 'store-store', 'crossing', 'same-name-p2', 'no-inputs-p3', 'no-outputs-d1' or
 * 'no-flows-e2'.
 */
export type Injection = string;

/** The id of the flow an error adds. */
export const ADDED_FLOW = 'x1';

/** For the same-name error: the input whose name a process's output copies, and that output. */
export const SAME_NAME: Record<ProcessSlot, { input: FlowSlot; output: FlowSlot }> = {
  p1: { input: 'f1', output: 'f4' },
  p2: { input: 'f5', output: 'f6' },
  p3: { input: 'f10', output: 'f11' },
};

/** The flow the crossing error's added flow crosses. */
export const CROSSED_FLOW: FlowSlot = 'f4';

export function ruleOf(injection: Injection): Rule {
  if (injection === 'entity-entity') return 'entity-entity';
  if (injection === 'store-customer' || injection === 'store-staff' || injection === 'staff-store') return 'entity-store';
  if (injection === 'store-store') return 'store-store';
  if (injection === 'crossing') return 'crossing';
  if (/^same-name-p[1-3]$/.test(injection)) return 'same-name';
  if (/^no-(inputs|outputs)-p[1-3]$/.test(injection)) return 'process-io';
  if (/^no-(inputs|outputs)-d[1-3]$/.test(injection)) return 'store-io';
  if (/^no-flows-e[1-3]$/.test(injection)) return 'entity-unconnected';
  throw new Error(`unknown dfd injection ${injection}`);
}

/** The id or flow id of the element an injection breaks: the node, or the flow. */
export function faultyKey(injection: Injection): string {
  const rule = ruleOf(injection);
  if (rule === 'process-io' || rule === 'store-io' || rule === 'entity-unconnected') return injection.split('-').pop()!;
  if (rule === 'same-name') return SAME_NAME[injection.split('-').pop() as ProcessSlot].output;
  return ADDED_FLOW;
}

/**
 * Elements that take part in the broken rule without being the faulty one: the flow the added
 * flow crosses, or the input whose name the output copies. They are never marked, so exactly one
 * marked element is wrong.
 */
export function partnerKeys(injection: Injection): string[] {
  const rule = ruleOf(injection);
  if (rule === 'crossing') return [CROSSED_FLOW];
  if (rule === 'same-name') return [SAME_NAME[injection.split('-').pop() as ProcessSlot].input];
  return [];
}

/**
 * The four views of a hand-laid layout: 0 as laid out, 1 mirrored left to right, 2 flipped top to
 * bottom, 3 both. Every view keeps the same elements and flows; only the positions change.
 */
export type View = 0 | 1 | 2 | 3;
export const VIEWS: readonly View[] = [0, 1, 2, 3];

function place(at: { x: number; y: number }, width: number, height: number, view: View): { x: number; y: number } {
  return { x: view & 1 ? width - at.x : at.x, y: view & 2 ? height - at.y : at.y };
}

function nodeLabel(sys: DfdSystem, slot: NodeSlot): string {
  if (slot.startsWith('e')) return sys.entities[slot as EntitySlot];
  if (slot.startsWith('p')) return sys.processes[slot as ProcessSlot];
  return sys.stores[slot as keyof DfdSystem['stores']];
}

function nodeType(slot: NodeSlot): DfdNode['type'] {
  return slot.startsWith('e') ? 'entity' : slot.startsWith('p') ? 'process' : 'store';
}

/** The flow an error adds, or null. */
function addedFlow(sys: DfdSystem, injection: Injection | null): Flow | null {
  switch (injection) {
    case 'entity-entity': {
      const { from, label } = sys.wrong.entityEntity;
      return { id: ADDED_FLOW, from, to: from === 'e2' ? 'e3' : 'e2', label };
    }
    case 'store-customer':
      return { id: ADDED_FLOW, from: 'd2', to: 'e1', label: sys.wrong.storeToCustomer };
    case 'store-staff':
      return { id: ADDED_FLOW, from: 'd1', to: 'e2', label: sys.wrong.storeToStaff };
    case 'staff-store':
      return { id: ADDED_FLOW, from: 'e2', to: 'd1', label: sys.wrong.staffToStore };
    case 'store-store':
      return { id: ADDED_FLOW, from: 'd2', to: 'd3', label: sys.wrong.storeToStore };
    case 'crossing':
      return { id: ADDED_FLOW, from: 'e1', to: 'p2', label: sys.wrong.crossing };
    default:
      return null;
  }
}

/** The flows an injection removes: a node's inputs, its outputs, or every flow of an entity. */
function removes(injection: Injection | null): (f: Flow) => boolean {
  const m = injection ? /^no-(inputs|outputs|flows)-([epd][1-3])$/.exec(injection) : null;
  if (!m) return () => false;
  const [, what, slot] = m;
  if (what === 'inputs') return (f) => f.to === slot;
  if (what === 'outputs') return (f) => f.from === slot;
  return (f) => f.from === slot || f.to === slot;
}

export interface DfdOptions {
  view?: View;
  injection?: Injection | null;
  /** Process and store slots shown as "?" (the labelling questions). */
  blanks?: readonly NodeSlot[];
  id?: string;
  caption?: string;
}

/** The business's Level 1 DFD. Nodes carry no number: processes and stores are known by name. */
export function buildDfd(sys: DfdSystem, opts: DfdOptions = {}): Dfd {
  const view = opts.view ?? 0;
  const injection = opts.injection ?? null;
  const blanks = new Set(opts.blanks ?? []);
  const rule = injection ? ruleOf(injection) : null;
  const at = (p: { x: number; y: number }) => place(p, DFD_WIDTH, DFD_HEIGHT, view);
  const nodes: DfdNode[] = ([...ENTITY_SLOTS, ...PROCESS_SLOTS, ...STORE_SLOTS] as NodeSlot[])
    .sort((a, b) => NODE_AT[a].y - NODE_AT[b].y || NODE_AT[a].x - NODE_AT[b].x)
    .map((slot) => {
      const type = nodeType(slot);
      const size = type === 'entity' ? { w: ENTITY_W } : {};
      return { id: slot, type, label: blanks.has(slot) ? '?' : nodeLabel(sys, slot), ...at(NODE_AT[slot]), ...size };
    });
  const drop = removes(injection);
  let flows: Flow[] = FLOW_SLOTS.map((slot): Flow => ({ id: slot, ...FLOW_ENDS[slot], label: sys.flows[slot] })).filter((f) => !drop(f));
  if (rule === 'same-name') {
    const { input, output } = SAME_NAME[injection!.split('-').pop() as ProcessSlot];
    flows = flows.map((f) => (f.id === output ? { ...f, label: sys.flows[input] } : f));
  }
  const added = addedFlow(sys, injection);
  if (added && rule === 'crossing') {
    // Both labels move off the point where the lines cross, each towards its far end.
    flows = flows.map((f) => (f.id === CROSSED_FLOW ? { ...f, labelAt: at(CROSSING_LABELS.crossed) } : f));
    flows.push({ ...added, labelAt: at(CROSSING_LABELS.added) });
  } else if (added) {
    flows.push(added);
  }
  return {
    id: opts.id ?? `dfd-${sys.id}`,
    kind: 'dfd',
    level: 1,
    title: `Level 1 data flow diagram: ${sys.system}`,
    ...(opts.caption ? { caption: opts.caption } : {}),
    width: DFD_WIDTH,
    height: DFD_HEIGHT,
    nodes,
    flows,
  };
}

/** The business's context diagram: the system as one circle, with every flow to or from an entity. */
export function buildContext(sys: DfdSystem, opts: Pick<DfdOptions, 'view' | 'injection' | 'id'> = {}): ContextDiagram {
  const view = opts.view ?? 0;
  const injection = opts.injection ?? null;
  const rule = injection ? ruleOf(injection) : null;
  if (rule && rule !== 'entity-entity') throw new Error(`a context diagram can't show a ${rule} error`);
  const toSystem = (slot: NodeSlot) => (slot.startsWith('p') ? 'system' : slot);
  const flows: Flow[] = CONTEXT_FLOWS.map((slot) => ({ id: slot, from: toSystem(FLOW_ENDS[slot].from), to: toSystem(FLOW_ENDS[slot].to), label: sys.flows[slot] }));
  const system = place(CONTEXT_SYSTEM_AT, CONTEXT_WIDTH, CONTEXT_HEIGHT, view);
  const entityAt = (slot: EntitySlot) => place(CONTEXT_ENTITY_AT[slot], CONTEXT_WIDTH, CONTEXT_HEIGHT, view);
  const added = addedFlow(sys, injection);
  if (added) {
    // The line between e2 and e3 runs down the outer column: pin its label on the side away from
    // the system, clear of the labels on the flows between those entities and the system.
    const [a, b] = [entityAt('e2'), entityAt('e3')];
    const side = a.x > system.x ? 1 : -1;
    flows.push({ ...added, labelAt: { x: a.x + side * (10 + (textWidth(added.label) + 8) / 2), y: (a.y + b.y) / 2 } });
  }
  return {
    id: opts.id ?? `context-${sys.id}`,
    kind: 'context',
    title: `Context diagram: ${sys.system}`,
    width: CONTEXT_WIDTH,
    height: CONTEXT_HEIGHT,
    system: { label: sys.system, ...system },
    entities: ENTITY_SLOTS.map((slot) => ({ id: slot, label: sys.entities[slot], ...entityAt(slot), w: ENTITY_W })),
    flows,
  };
}

/**
 * True when removing flows leaves the injected rule the only one broken: every other process and
 * store keeps an input and an output, every other entity keeps a flow, and the faulty process or
 * store keeps at least one flow (with none at all it would break a second rule as well).
 */
function onlyRuleBroken(fig: Dfd, faulty: string): boolean {
  const flows = fig.flows;
  const hasIn = (id: string) => flows.some((f) => f.to === id);
  const hasOut = (id: string) => flows.some((f) => f.from === id);
  return fig.nodes.every((n) => {
    if (n.id === faulty) return n.type === 'entity' || hasIn(n.id) || hasOut(n.id);
    return n.type === 'entity' ? hasIn(n.id) || hasOut(n.id) : hasIn(n.id) && hasOut(n.id);
  });
}

/** The injections a business supports on a kind of diagram, each breaking exactly one rule. */
export function injectionsFor(sys: DfdSystem, kind: DiagramKind): Injection[] {
  if (kind === 'context') return ['entity-entity'];
  const removals = [
    ...[...PROCESS_SLOTS, ...STORE_SLOTS].flatMap((slot) => [`no-inputs-${slot}`, `no-outputs-${slot}`]),
    ...ENTITY_SLOTS.map((slot) => `no-flows-${slot}`),
  ].filter((injection) => onlyRuleBroken(buildDfd(sys, { injection }), faultyKey(injection)));
  return ['entity-entity', 'store-customer', 'store-staff', 'staff-store', 'store-store', 'crossing', ...PROCESS_SLOTS.map((p) => `same-name-${p}`), ...removals];
}

/**
 * Names an element for feedback, by name as VCAA's diagrams do: "the process Prepare order", "the
 * Orders data store", or "the flow order_record from Orders to Customer".
 */
export function describeElement(fig: Dfd | ContextDiagram, key: string): string {
  const name = (id: string): string => {
    if (fig.kind === 'context') {
      if (id === 'system') return fig.system.label;
      return fig.entities.find((e) => e.id === id)?.label ?? id;
    }
    return fig.nodes.find((n) => n.id === id)?.label ?? id;
  };
  if (fig.kind === 'context') {
    if (key === 'system') return `the system, ${fig.system.label}`;
    const entity = fig.entities.find((e) => e.id === key);
    if (entity) return `the external entity ${entity.label}`;
  } else {
    const node = fig.nodes.find((n) => n.id === key);
    if (node) {
      if (node.type === 'process') return `the process ${node.label}`;
      if (node.type === 'store') return `the ${node.label} data store`;
      return `the external entity ${node.label}`;
    }
  }
  const flow = fig.flows.find((f) => (f.id ?? `${f.from}->${f.to}`) === key);
  if (!flow) return key;
  return flow.label ? `the flow ${flow.label} from ${name(flow.from)} to ${name(flow.to)}` : `the unlabelled flow from ${name(flow.from)} to ${name(flow.to)}`;
}

/** Every markable element key of a figure: nodes (and the system) first, then flows. */
export function elementKeys(fig: Dfd | ContextDiagram): string[] {
  const nodes = fig.kind === 'context' ? ['system', ...fig.entities.map((e) => e.id)] : fig.nodes.map((n) => n.id);
  return [...nodes, ...fig.flows.map((f) => f.id ?? `${f.from}->${f.to}`)];
}

export function isFlowKey(fig: Dfd | ContextDiagram, key: string): boolean {
  return fig.flows.some((f) => (f.id ?? `${f.from}->${f.to}`) === key);
}

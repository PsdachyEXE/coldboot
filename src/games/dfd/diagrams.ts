/**
 * Builds the `dfd` game's figures from a business in ./systems.ts: a Level 1 DFD or a context
 * diagram, optionally mirrored left to right, with one convention error injected, or with some
 * process and store labels blanked out for the labelling questions.
 *
 * The six conventions the game teaches, numbered as the game lists them:
 *   1 entity-entity: a flow between two external entities;
 *   2 store-entity: a data store connected straight to an external entity;
 *   3 no-io: a process with no inputs, or with no outputs;
 *   4 unlabelled: a flow without a label;
 *   5 noun: a process named with a noun;
 *   6 store-store: a flow between two data stores.
 */
import type { ContextDiagram, Dfd, DfdNode, Flow } from '../../content/schema';
import {
  CONTEXT_ENTITY_AT,
  CONTEXT_FLOWS,
  CONTEXT_HEIGHT,
  CONTEXT_SYSTEM_AT,
  CONTEXT_WIDTH,
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
  type NodeSlot,
  type ProcessSlot,
} from './systems';

export const RULES = ['entity-entity', 'store-entity', 'no-io', 'unlabelled', 'noun', 'store-store'] as const;
export type Rule = (typeof RULES)[number];

/**
 * One injected error, encoded for instances: 'entity-entity', 'store-customer', 'store-staff',
 * 'store-store', 'unlabelled-f5', 'noun-p2', 'no-inputs-p2' or 'no-outputs-p1'.
 */
export type Injection = string;

/** The id of the flow an error adds. */
export const ADDED_FLOW = 'x1';

export type DiagramKind = 'context' | 'dfd';

export function ruleOf(injection: Injection): Rule {
  if (injection === 'entity-entity') return 'entity-entity';
  if (injection === 'store-customer' || injection === 'store-staff') return 'store-entity';
  if (injection === 'store-store') return 'store-store';
  if (injection.startsWith('unlabelled-')) return 'unlabelled';
  if (injection.startsWith('noun-')) return 'noun';
  if (injection.startsWith('no-inputs-') || injection.startsWith('no-outputs-')) return 'no-io';
  throw new Error(`unknown dfd injection ${injection}`);
}

/** The id or `from->to` key of the element an injection breaks: the process, or the flow. */
export function faultyKey(injection: Injection): string {
  const rule = ruleOf(injection);
  if (rule === 'noun' || rule === 'no-io') return injection.split('-').pop()!;
  if (rule === 'unlabelled') return injection.slice('unlabelled-'.length);
  return ADDED_FLOW;
}

function mirrorX(x: number, width: number, mirror: boolean): number {
  return mirror ? width - x : x;
}

function nodeLabel(sys: DfdSystem, slot: NodeSlot): string {
  if (slot.startsWith('e')) return sys.entities[slot as keyof DfdSystem['entities']];
  if (slot.startsWith('p')) return sys.processes[slot as ProcessSlot];
  return sys.stores[slot as keyof DfdSystem['stores']];
}

function nodeType(slot: NodeSlot): DfdNode['type'] {
  return slot.startsWith('e') ? 'entity' : slot.startsWith('p') ? 'process' : 'store';
}

function nodeNumber(slot: NodeSlot): string | undefined {
  if (slot.startsWith('p')) return slot.slice(1);
  if (slot.startsWith('d')) return `D${slot.slice(1)}`;
  return undefined;
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
    case 'store-store':
      return { id: ADDED_FLOW, from: 'd2', to: 'd3', label: sys.wrong.storeToStore };
    default:
      return null;
  }
}

export interface DfdOptions {
  mirror?: boolean;
  injection?: Injection | null;
  /** Process and store slots shown as "?" (the labelling questions). */
  blanks?: readonly NodeSlot[];
  id?: string;
  caption?: string;
}

/** The business's Level 1 DFD. */
export function buildDfd(sys: DfdSystem, opts: DfdOptions = {}): Dfd {
  const mirror = opts.mirror ?? false;
  const injection = opts.injection ?? null;
  const blanks = new Set(opts.blanks ?? []);
  const rule = injection ? ruleOf(injection) : null;
  const nodes: DfdNode[] = ([...ENTITY_SLOTS, ...PROCESS_SLOTS, ...STORE_SLOTS] as NodeSlot[])
    .sort((a, b) => NODE_AT[a].y - NODE_AT[b].y || NODE_AT[a].x - NODE_AT[b].x)
    .map((slot) => {
      let label = nodeLabel(sys, slot);
      if (rule === 'noun' && faultyKey(injection!) === slot) label = sys.nouns[slot as ProcessSlot];
      if (blanks.has(slot)) label = '?';
      const number = nodeNumber(slot);
      const type = nodeType(slot);
      const size = type === 'entity' ? { w: ENTITY_W } : {};
      return { id: slot, type, label, ...(number ? { number } : {}), x: mirrorX(NODE_AT[slot].x, DFD_WIDTH, mirror), y: NODE_AT[slot].y, ...size };
    });
  let flows: Flow[] = FLOW_SLOTS.map((slot) => ({ id: slot, ...FLOW_ENDS[slot], label: sys.flows[slot] }));
  if (rule === 'unlabelled') flows = flows.map((f) => (f.id === faultyKey(injection!) ? { ...f, label: '' } : f));
  if (rule === 'no-io') {
    const process = faultyKey(injection!);
    const inputs = injection!.startsWith('no-inputs-');
    flows = flows.filter((f) => (inputs ? f.to !== process : f.from !== process));
  }
  const added = addedFlow(sys, injection);
  if (added) flows.push(added);
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

/** The business's context diagram: the system as one process, with every flow to or from an entity. */
export function buildContext(sys: DfdSystem, opts: Pick<DfdOptions, 'mirror' | 'injection' | 'id'> = {}): ContextDiagram {
  const mirror = opts.mirror ?? false;
  const injection = opts.injection ?? null;
  const rule = injection ? ruleOf(injection) : null;
  if (rule && rule !== 'entity-entity' && rule !== 'unlabelled') throw new Error(`a context diagram can't show a ${rule} error`);
  const toSystem = (slot: NodeSlot) => (slot.startsWith('p') ? 'system' : slot);
  let flows: Flow[] = CONTEXT_FLOWS.map((slot) => ({ id: slot, from: toSystem(FLOW_ENDS[slot].from), to: toSystem(FLOW_ENDS[slot].to), label: sys.flows[slot] }));
  if (rule === 'unlabelled') flows = flows.map((f) => (f.id === faultyKey(injection!) ? { ...f, label: '' } : f));
  const added = addedFlow(sys, injection);
  if (added) flows.push(added);
  return {
    id: opts.id ?? `context-${sys.id}`,
    kind: 'context',
    title: `Context diagram: ${sys.system}`,
    width: CONTEXT_WIDTH,
    height: CONTEXT_HEIGHT,
    system: { label: sys.system, x: mirrorX(CONTEXT_SYSTEM_AT.x, CONTEXT_WIDTH, mirror), y: CONTEXT_SYSTEM_AT.y },
    entities: ENTITY_SLOTS.map((slot) => ({ id: slot, label: sys.entities[slot], x: mirrorX(CONTEXT_ENTITY_AT[slot].x, CONTEXT_WIDTH, mirror), y: CONTEXT_ENTITY_AT[slot].y, w: ENTITY_W })),
    flows,
  };
}

/** Every flow of a DFD or context diagram, with the process at `system` for a context diagram. */
function flowsOf(fig: Dfd | ContextDiagram): readonly Flow[] {
  return fig.flows;
}

/**
 * The injections a business supports on a kind of diagram. A process loses its inputs or outputs
 * only when every other element still has a flow and every other process keeps an input and an
 * output, so the injected error is the only one.
 */
export function injectionsFor(sys: DfdSystem, kind: DiagramKind): Injection[] {
  if (kind === 'context') return ['entity-entity', ...CONTEXT_FLOWS.map((f) => `unlabelled-${f}`)];
  const out: Injection[] = ['entity-entity', 'store-customer', 'store-staff', 'store-store', ...FLOW_SLOTS.map((f) => `unlabelled-${f}`), ...PROCESS_SLOTS.map((p) => `noun-${p}`)];
  for (const p of PROCESS_SLOTS) {
    for (const missing of ['inputs', 'outputs'] as const) {
      const injection = `no-${missing}-${p}`;
      const flows = flowsOf(buildDfd(sys, { injection }));
      const connected = [...ENTITY_SLOTS, ...PROCESS_SLOTS, ...STORE_SLOTS].every((n) => flows.some((f) => f.from === n || f.to === n));
      const othersOk = PROCESS_SLOTS.filter((q) => q !== p).every((q) => flows.some((f) => f.to === q) && flows.some((f) => f.from === q));
      if (connected && othersOk) out.push(injection);
    }
  }
  return out;
}

/** Names an element for feedback: "process 2, Prepare order" or "the flow order_record from Orders to Customer". */
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
      if (node.type === 'process') return `process ${node.number}, ${node.label}`;
      if (node.type === 'store') return `data store ${node.number}, ${node.label}`;
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

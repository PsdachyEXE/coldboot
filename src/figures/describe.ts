/**
 * Plain-text descriptions of figures, generated from their data. Every figure shows one in a
 * "Text description" disclosure, and its summary becomes the SVG's <desc>. A description lists
 * every element: entities, processes, stores, flows with their labels, actors, use cases, links,
 * tasks with durations and dependencies, members, lines, rows and mock-up elements.
 *
 * Gantt slack and the critical path are described only when the figure shows them
 * (`showCriticalPath`), so the description never gives away an answer the chart leaves for the
 * student to work out.
 */
import type {
  ContextDiagram,
  Dfd,
  DfdNode,
  Figure,
  Gantt,
  Mockup,
  ObjectDescription,
  PseudocodeFigure,
  TableFigure,
  UseCaseDiagram,
} from '../content/schema';
import { connectorKey } from './flows';
import { trySchedule } from './gantt/schedule';

export interface DescriptionSection {
  heading: string;
  items: string[];
}

export interface FigureDescription {
  summary: string;
  sections: DescriptionSection[];
}

type Names = Map<string, string>;

function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function listWords(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function section(heading: string, items: string[]): DescriptionSection[] {
  return items.length ? [{ heading, items }] : [];
}

/** Content Markdown to plain text for descriptions: drops emphasis and code markers. */
export function plainInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2').replace(/`([^`]*)`/g, '$1');
}

function flowText(label: string, from: string, to: string): string {
  return label.trim() ? `${label} from ${from} to ${to}` : `Unlabelled flow from ${from} to ${to}`;
}

function describeContext(f: ContextDiagram, names: Names): FigureDescription {
  const system = `${f.system.label} (the system)`;
  names.set('system', system);
  for (const e of f.entities) names.set(e.id, `${e.label} (external entity)`);
  const flows = f.flows.map((fl) => {
    const text = flowText(fl.label, names.get(fl.from) ?? fl.from, names.get(fl.to) ?? fl.to);
    names.set(connectorKey(fl), text);
    return text;
  });
  return {
    summary: `Context diagram for ${f.system.label}, with ${count(f.entities.length, 'external entity', 'external entities')} and ${count(f.flows.length, 'data flow')}.`,
    sections: [
      { heading: 'System', items: [f.system.label] },
      ...section('External entities', f.entities.map((e) => e.label)),
      ...section('Data flows', flows),
    ],
  };
}

export function dfdNodeName(n: DfdNode): string {
  if (n.type === 'process') return n.number ? `process ${n.number}, ${n.label}` : `process ${n.label}`;
  if (n.type === 'store') return n.number ? `data store ${n.number}, ${n.label}` : `data store ${n.label}`;
  return `${n.label} (external entity)`;
}

function describeDfd(f: Dfd, names: Names): FigureDescription {
  for (const n of f.nodes) names.set(n.id, dfdNodeName(n));
  const of = (type: DfdNode['type']) => f.nodes.filter((n) => n.type === type);
  const numbered = (n: DfdNode) => (n.number ? `${n.number} ${n.label}` : n.label);
  const flows = f.flows.map((fl) => {
    const text = flowText(fl.label, names.get(fl.from) ?? fl.from, names.get(fl.to) ?? fl.to);
    names.set(connectorKey(fl), text);
    return text;
  });
  const parts = [
    count(of('process').length, 'process', 'processes'),
    count(of('store').length, 'data store'),
    count(of('entity').length, 'external entity', 'external entities'),
    count(f.flows.length, 'data flow'),
  ];
  return {
    summary: `${f.level === undefined ? 'Data flow diagram' : `Level ${f.level} data flow diagram`} with ${listWords(parts)}.`,
    sections: [
      ...section('Processes', of('process').map(numbered)),
      ...section('Data stores', of('store').map(numbered)),
      ...section('External entities', of('entity').map((n) => n.label)),
      ...section('Data flows', flows),
    ],
  };
}

function describeUseCase(f: UseCaseDiagram, names: Names): FigureDescription {
  const actors = new Map(f.actors.map((a) => [a.id, a.label]));
  const cases = new Map(f.useCases.map((u) => [u.id, u.label]));
  for (const a of f.actors) names.set(a.id, `actor ${a.label}`);
  for (const u of f.useCases) names.set(u.id, `use case ${u.label}`);
  const label = (id: string) => actors.get(id) ?? cases.get(id) ?? id;
  const associations: string[] = [];
  const includes: string[] = [];
  const extendsList: string[] = [];
  for (const l of f.links) {
    let text: string;
    if (l.type === 'association') {
      const [actor, useCase] = actors.has(l.from) ? [l.from, l.to] : [l.to, l.from];
      text = `${label(actor)} and ${label(useCase)}`;
      associations.push(text);
      text = `association between ${text}`;
    } else {
      text = `${label(l.from)} ${l.type === 'includes' ? 'includes' : 'extends'} ${label(l.to)}`;
      (l.type === 'includes' ? includes : extendsList).push(text);
    }
    names.set(connectorKey(l), text);
  }
  return {
    summary: `Use case diagram for ${f.system.label}, with ${count(f.actors.length, 'actor')}, ${count(f.useCases.length, 'use case')} and ${count(f.links.length, 'link')}.`,
    sections: [
      { heading: 'System boundary', items: [f.system.label] },
      ...section('Actors', f.actors.map((a) => a.label)),
      ...section('Use cases', f.useCases.map((u) => u.label)),
      ...section('Associations', associations),
      ...section('<<includes>> relationships', includes),
      ...section('<<extends>> relationships', extendsList),
    ],
  };
}

function unitWord(unit: Gantt['unit'], n: number): string {
  return count(n, unit);
}

function describeGantt(f: Gantt, names: Names): FigureDescription {
  const result = trySchedule(f.tasks);
  const items = f.tasks.map((t) => {
    const parts = [`${t.id} ${t.name}: ${unitWord(f.unit, t.duration)}`];
    parts.push(t.dependsOn.length ? `after ${listWords([...t.dependsOn])}` : 'no dependencies');
    if (t.start !== undefined) parts.push(`not before ${f.unit} ${t.start + 1}`);
    const timing = result.schedule?.byId[t.id];
    if (timing) {
      if (t.duration === 0) {
        parts.push(timing.earliestStart === 0 ? 'milestone at the start' : `milestone at the end of ${f.unit} ${timing.earliestStart}`);
      } else {
        const runs = t.duration === 1 ? `${f.unit} ${timing.earliestFinish}` : `${f.unit}s ${timing.earliestStart + 1} to ${timing.earliestFinish}`;
        parts.push(`${t.milestone ? 'milestone, ' : ''}runs in ${runs}`);
      }
      if (f.showCriticalPath) parts.push(`slack ${unitWord(f.unit, timing.slack)}${timing.critical ? ', critical' : ''}`);
    }
    names.set(t.id, `task ${t.id} ${t.name}`);
    return parts.join(', ');
  });
  let summary: string;
  if (!result.schedule) {
    summary = `Gantt chart of ${count(f.tasks.length, 'task')} that can't be drawn. ${result.error}`;
  } else {
    const total = `The project takes ${unitWord(f.unit, result.schedule.duration)}.`;
    const paths = result.schedule.criticalPaths.map((p) => p.join(', '));
    const critical = f.showCriticalPath
      ? paths.length === 1
        ? ` Critical path: ${paths[0]}.`
        : ` Critical paths: ${paths.join('; ')}.`
      : ' Slack and the critical path are not marked.';
    summary = `Gantt chart of ${count(f.tasks.length, 'task')}, measured in ${f.unit}s. ${total}${critical}`;
  }
  return { summary, sections: section('Tasks', items) };
}

function describeObject(f: ObjectDescription, names: Names): FigureDescription {
  const properties = f.properties.map((p) => {
    const text = `${p.name}: ${p.type}${p.description ? `. ${p.description}` : ''}`;
    names.set(p.name, `property ${p.name}`);
    return text;
  });
  const methods = f.methods.map((m) => {
    names.set(m.name, `method ${m.name}`);
    return `${m.name}${m.description ? `. ${m.description}` : ''}`;
  });
  return {
    summary: `Object description for ${f.name}, with ${count(f.properties.length, 'property', 'properties')} and ${count(f.methods.length, 'method')}.`,
    sections: [
      { heading: 'Object name', items: [f.name] },
      { heading: 'Properties and data types', items: properties.length ? properties : ['None'] },
      { heading: 'Methods', items: methods.length ? methods : ['None'] },
    ],
  };
}

export function pseudocodeLines(code: string): string[] {
  return code.replace(/\s+$/, '').split('\n');
}

function describePseudocode(f: PseudocodeFigure, names: Names): FigureDescription {
  const lines = pseudocodeLines(f.code);
  lines.forEach((_, i) => names.set(String(i + 1), `line ${i + 1}`));
  const base = f.indexBase === undefined ? '' : ` Arrays are indexed from ${f.indexBase}.`;
  return {
    summary: `Pseudocode listing of ${count(lines.length, 'numbered line')}.${base}`,
    sections: section(
      'Lines',
      lines.map((l, i) => `Line ${i + 1}: ${l.trim() || '(blank)'}`),
    ),
  };
}

function describeTable(f: TableFigure, names: Names): FigureDescription {
  const rows = f.rows.map((row, i) => {
    names.set(String(i + 1), `row ${i + 1}`);
    return `Row ${i + 1}: ${row.map((cell, c) => `${plainInline(f.columns[c] ?? '')} ${plainInline(cell) || '(empty)'}`).join('; ')}`;
  });
  return {
    summary: `Table with ${count(f.columns.length, 'column')} and ${count(f.rows.length, 'row')}.`,
    sections: [...section('Columns', f.columns.map(plainInline)), ...section('Rows', rows)],
  };
}

export const MOCKUP_NAMES: Record<Mockup['elements'][number]['type'], string> = {
  window: 'Window',
  heading: 'Heading',
  label: 'Label',
  textbox: 'Text box',
  button: 'Button',
  checkbox: 'Checkbox',
  radio: 'Radio button',
  dropdown: 'Drop-down list',
  list: 'List box',
  image: 'Image placeholder',
  divider: 'Divider',
};

/** Note numbers for mock-up elements with notes, in data order (element index to number). */
export function mockupNoteNumbers(f: Mockup): Map<number, number> {
  const out = new Map<number, number>();
  f.elements.forEach((el, i) => {
    if (el.note?.trim()) out.set(i, out.size + 1);
  });
  return out;
}

function mockupElementText(el: Mockup['elements'][number]): string {
  const text = el.text?.trim();
  if (!text) return MOCKUP_NAMES[el.type];
  if (el.type === 'list') return `${MOCKUP_NAMES.list} with items ${listWords(text.split('\n').map((s) => `"${s.trim()}"`))}`;
  if (el.type === 'window') return `Window titled "${text}"`;
  return `${MOCKUP_NAMES[el.type]} "${text}"`;
}

function describeMockup(f: Mockup, names: Names): FigureDescription {
  const numbers = mockupNoteNumbers(f);
  // Reading order: top to bottom, then left to right.
  const order = f.elements.map((el, i) => ({ el, i })).sort((a, b) => a.el.y - a.el.h / 2 - (b.el.y - b.el.h / 2) || a.el.x - b.el.x);
  const elements = order.map(({ el, i }) => {
    const text = mockupElementText(el);
    names.set(`e${i + 1}`, text);
    const n = numbers.get(i);
    return n ? `${text} (note ${n})` : text;
  });
  const notes = f.elements.flatMap((el, i) => (numbers.has(i) ? [`${numbers.get(i)}. ${el.note!.trim()} (${mockupElementText(el)})`] : []));
  const notePart = notes.length ? ` and ${count(notes.length, 'numbered note')}` : '';
  return {
    summary: `Mock-up with ${count(f.elements.length, 'interface element')}${notePart}.`,
    sections: [...section('Elements, top to bottom', elements), ...section('Notes', notes)],
  };
}

/** The text description of a figure, with a "Highlighted" section when `highlight` names elements. */
export function describeFigure(figure: Figure, highlight: ReadonlyMap<string, string> = new Map()): FigureDescription {
  const names: Names = new Map();
  let d: FigureDescription;
  switch (figure.kind) {
    case 'context':
      d = describeContext(figure, names);
      break;
    case 'dfd':
      d = describeDfd(figure, names);
      break;
    case 'usecase':
      d = describeUseCase(figure, names);
      break;
    case 'gantt':
      d = describeGantt(figure, names);
      break;
    case 'object':
      d = describeObject(figure, names);
      break;
    case 'pseudocode':
      d = describePseudocode(figure, names);
      break;
    case 'table':
      d = describeTable(figure, names);
      break;
    case 'mockup':
      d = describeMockup(figure, names);
      break;
  }
  const marked = [...highlight].flatMap(([id, marker]) => (names.has(id) ? [`${marker}: ${names.get(id)}`] : []));
  if (marked.length) d.sections.unshift({ heading: 'Marked on the figure', items: marked });
  return d;
}

/** A short sentence for an SVG <desc>: the summary plus any marked elements. */
export function shortDescription(d: FigureDescription): string {
  const marked = d.sections.find((s) => s.heading === 'Marked on the figure');
  const tail = marked ? ` Marked: ${marked.items.join('; ')}.` : '';
  return `${d.summary}${tail} The text description below lists every element.`;
}

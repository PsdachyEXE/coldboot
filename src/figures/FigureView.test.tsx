import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { FigureSchema, type Dfd, type Figure, type Gantt } from '../content/schema';
import { FigureView } from './FigureView';
import { computeSchedule } from './gantt/schedule';
import {
  contextFixture,
  dfdFixture,
  FIXTURES,
  ganttFixture,
  mockupFixture,
  objectFixture,
  pseudocodeFixture,
  tableFixture,
  useCaseFixture,
} from './fixtures';

const SVG_KINDS = new Set(['context', 'dfd', 'usecase', 'gantt', 'mockup']);

function renderFigure(figure: Figure, props: Partial<Parameters<typeof FigureView>[0]> = {}) {
  const view = render(<FigureView figure={figure} {...props} />);
  const fig = view.container.querySelector('figure')!;
  return { ...view, fig };
}

describe('fixtures', () => {
  it('are valid figures, one of every kind', () => {
    for (const f of FIXTURES) expect(FigureSchema.safeParse(f).success, f.id).toBe(true);
    expect(new Set(FIXTURES.map((f) => f.kind)).size).toBe(8);
  });
});

describe.each(FIXTURES.map((f) => [f.kind, f] as const))('FigureView: %s', (kind, figure) => {
  it('renders inside a figure with a caption and a text description', () => {
    const { fig } = renderFigure(figure);
    expect(fig).toHaveAttribute('data-figure', kind);
    const caption = fig.querySelector('figcaption')!;
    expect(caption).toBeInTheDocument();
    if (figure.title) expect(caption).toHaveTextContent(figure.title);
    if (figure.caption) expect(caption).toHaveTextContent(figure.caption);
    const details = fig.querySelector('details')!;
    expect(details.querySelector('summary')).toHaveTextContent('Text description');
  });

  it('names its SVG from a <title> and a <desc>', () => {
    const { fig } = renderFigure(figure);
    const svgs = fig.querySelectorAll('svg[role="img"]');
    expect(svgs.length).toBe(SVG_KINDS.has(kind) ? 1 : 0);
    for (const svg of svgs) {
      const [titleId, descId] = svg.getAttribute('aria-labelledby')!.split(' ');
      expect(svg.querySelector(`title[id="${titleId}"]`)?.textContent).toBeTruthy();
      expect(svg.querySelector(`desc[id="${descId}"]`)?.textContent).toMatch(/text description below/);
    }
    // Decorative SVGs (the scroll sizer, legend swatches) are hidden.
    for (const svg of fig.querySelectorAll('svg:not([role="img"])')) expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('never writes a style attribute', () => {
    const { container } = renderFigure(figure, { highlight: ['x'] });
    expect(container.innerHTML).not.toMatch(/\sstyle=/);
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});

describe('diagrams', () => {
  it('draws every node and one line per flow, with each flow label', () => {
    const { fig } = renderFigure(dfdFixture);
    for (const n of dfdFixture.nodes) expect(fig.querySelector(`[data-node="${n.id}"]`), n.id).not.toBeNull();
    expect(fig.querySelectorAll('[data-flow]')).toHaveLength(dfdFixture.flows.length);
    const svg = fig.querySelector('svg[role="img"]')!;
    for (const fl of dfdFixture.flows) expect(svg.textContent).toContain(fl.label);
    // Process numbers sit above their labels; stores show their id.
    expect(within(fig.querySelector('[data-node="p1"]') as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(fig.querySelector('[data-node="d1"]') as HTMLElement).getByText('D1')).toBeInTheDocument();
  });

  it('still draws an unlabelled flow, and describes it as unlabelled', () => {
    const fig: Dfd = { ...dfdFixture, flows: [...dfdFixture.flows, { id: 'bare', from: 'p3', to: 'd2', label: '' }] };
    const { fig: el } = renderFigure(fig);
    const bare = el.querySelector('[data-flow="bare"]')!;
    expect(bare.querySelector('path')!.getAttribute('d')).toMatch(/^M[\d.]+ [\d.]+ L/);
    expect(bare.querySelector('polygon')).not.toBeNull();
    expect(el.querySelector('details')).toHaveTextContent('Unlabelled flow from process 3, Take payment to data store D2, Bookings');
  });

  it('draws the context system as a circle and entities as rectangles', () => {
    const { fig } = renderFigure(contextFixture);
    expect(fig.querySelector('[data-node="system"] circle')).not.toBeNull();
    expect(fig.querySelectorAll('[data-node] rect')).toHaveLength(contextFixture.entities.length);
  });

  it('draws actors, use cases, plain associations and labelled dashed dependencies', () => {
    const { fig } = renderFigure(useCaseFixture);
    expect(fig.querySelectorAll('[data-node-type="actor"]')).toHaveLength(3);
    expect(fig.querySelectorAll('[data-node-type="usecase"] ellipse')).toHaveLength(4);
    const svg = fig.querySelector('svg[role="img"]')!;
    expect(svg.textContent).toContain('<<includes>>');
    expect(svg.textContent).toContain('<<extends>>');
    expect(svg.textContent).toContain('Kayak hire system');
    const includes = fig.querySelector('[data-flow="book->pay"]')!;
    expect(includes.querySelector('path')!.getAttribute('class')).toMatch(/dashed/);
    expect(includes.querySelector('polyline')).not.toBeNull();
    const association = fig.querySelector('[data-flow="customer->book"]')!;
    expect(association.querySelector('path')!.getAttribute('class')).not.toMatch(/dashed/);
    expect(association.querySelector('polyline, polygon')).toBeNull();
  });

  it('rings highlighted elements with a dashed outline and a text marker', () => {
    const { fig } = renderFigure(dfdFixture, { highlight: ['p2', 'f6', 'nope'] });
    const rings = fig.querySelectorAll('[data-highlight]');
    expect([...rings].map((r) => r.getAttribute('data-highlight'))).toEqual(['A', 'B']);
    expect(rings[0].querySelector('circle')!.getAttribute('class')).toMatch(/ring/);
    expect(within(rings[1] as HTMLElement).getByText('B')).toBeInTheDocument();
    const details = fig.querySelector('details')!;
    expect(details).toHaveTextContent('A: process 2, Record booking');
    expect(details).toHaveTextContent('B: amount_due from process 2, Record booking to process 3, Take payment');
    expect(fig.querySelector('desc')).toHaveTextContent('Marked: A: process 2');
  });

  it('accepts custom marker text', () => {
    const { fig } = renderFigure(contextFixture, { highlight: { system: 'here' } });
    expect(fig.querySelector('[data-highlight="here"]')).not.toBeNull();
  });
});

describe('Gantt chart', () => {
  it('hatches and labels critical tasks, draws slack and milestones, and has a legend', () => {
    const { fig } = renderFigure(ganttFixture);
    const schedule = computeSchedule(ganttFixture.tasks);
    const critical = [...fig.querySelectorAll('[data-critical="true"]')].map((g) => g.getAttribute('data-task'));
    expect(critical).toEqual(schedule.critical);
    for (const id of schedule.critical) {
      const row = fig.querySelector(`[data-task="${id}"]`)!;
      expect(row.textContent).toContain('critical');
      const bar = row.querySelector('rect[fill^="url(#"]');
      if (ganttFixture.tasks.find((t) => t.id === id)!.duration > 0) expect(bar).not.toBeNull();
    }
    expect(fig.querySelectorAll('[data-task] polygon')).toHaveLength(1); // one milestone diamond
    const legend = within(fig.querySelector('ul[aria-label="Key"]') as HTMLElement);
    for (const entry of ['Task', 'Critical task, labelled critical', 'Slack, to the latest finish', 'Milestone']) expect(legend.getByText(entry)).toBeInTheDocument();
    // One bar per task with a duration, on a numbered unit axis.
    expect(fig.querySelectorAll('[data-task]')).toHaveLength(ganttFixture.tasks.length);
    expect(fig.querySelector('svg[role="img"]')!.textContent).toContain('Depends on');
  });

  it('leaves out critical marks and slack unless showCriticalPath is set', () => {
    const plain: Gantt = { ...ganttFixture, showCriticalPath: false };
    const { fig } = renderFigure(plain);
    expect(fig.querySelector('[data-critical]')).toBeNull();
    for (const row of fig.querySelectorAll('[data-task]')) expect(row.textContent).not.toContain('critical');
    expect(fig.querySelector('rect[fill^="url(#"]')).toBeNull();
    expect(within(fig.querySelector('ul[aria-label="Key"]') as HTMLElement).queryByText(/Slack|Critical/)).toBeNull();
    expect(fig.querySelector('details')).not.toHaveTextContent(/slack \d/);
  });

  it('explains a plan it cannot draw instead of crashing', () => {
    const broken = { ...ganttFixture, tasks: [{ id: 'A', name: 'Loop', duration: 1, dependsOn: ['A'] }] } as Gantt;
    const { fig } = renderFigure(broken);
    expect(fig).toHaveTextContent(/can.t be drawn/);
    expect(fig.querySelector('svg[role="img"]')).toBeNull();
  });
});

describe('text figures', () => {
  it('lays out an object description as name, properties with types, then methods', () => {
    const { fig } = renderFigure(objectFixture);
    const table = fig.querySelector('table')!;
    expect(table).toHaveAttribute('aria-labelledby', fig.querySelector('figcaption span')!.id);
    const headers = [...table.querySelectorAll('th')].map((th) => th.textContent);
    expect(headers.indexOf('Booking')).toBeLessThan(headers.indexOf('Properties'));
    expect(headers.indexOf('Properties')).toBeLessThan(headers.indexOf('Methods'));
    expect(within(table).getByText('Floating point')).toBeInTheDocument();
    expect(within(table).getByText('calculateTotal()')).toBeInTheDocument();
  });

  it('renders pseudocode through the listing renderer and states the index base', () => {
    const { fig } = renderFigure(pseudocodeFixture);
    expect(fig.querySelector('figcaption')).toHaveTextContent('Arrays are indexed from 0.');
    expect(fig.querySelectorAll('pre.pseudo .ps-line')).toHaveLength(7);
    expect(fig.querySelector('.ps-kw')).toHaveTextContent('BEGIN');
    const marked = renderFigure(pseudocodeFixture, { highlight: ['4'] }).fig;
    expect(marked.querySelectorAll('.ps-mark')).toHaveLength(1);
    expect(marked.querySelector('figcaption')).toHaveTextContent('Marked: line 4 (A).');
  });

  it('renders a semantic table with inline Markdown in the cells', () => {
    const { fig } = renderFigure(tableFixture);
    expect(fig.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);
    expect(fig.querySelectorAll('tbody th[scope="row"]')).toHaveLength(3);
    expect(fig.querySelector('tbody code')).toHaveTextContent('0');
    expect(fig.querySelector('tbody strong')).toHaveTextContent('Error');
  });

  it('numbers mock-up notes on the drawing and in a list below it', () => {
    const { fig } = renderFigure(mockupFixture);
    const notes = mockupFixture.elements.filter((e) => e.note);
    expect(fig.querySelectorAll('[data-note]')).toHaveLength(notes.length);
    const list = fig.querySelector('ol[aria-label="Notes"]')!;
    expect([...list.querySelectorAll('li')].map((li) => li.textContent)).toEqual(notes.map((n) => n.note));
    for (const type of new Set(mockupFixture.elements.map((e) => e.type))) expect(fig.querySelector(`[data-element="${type}"]`), type).not.toBeNull();
  });
});

describe('compact mode', () => {
  it('adds the compact class and keeps the text description', () => {
    const { fig } = renderFigure(pseudocodeFixture, { compact: true });
    expect(fig.className).toMatch(/compact/);
    expect(fig.querySelector('details')).not.toBeNull();
  });
});

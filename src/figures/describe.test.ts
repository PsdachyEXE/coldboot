import { describe, expect, it } from 'vitest';
import type { Figure, Gantt, ObjectDescription } from '../content/schema';
import { describeFigure, dfdNodeName, plainInline } from './describe';
import { contextFixture, dfdFixture, ganttFixture, mockupFixture, objectFixture, pseudocodeFixture, tableFixture, useCaseFixture } from './fixtures';

function text(figure: Figure): string {
  const d = describeFigure(figure);
  return [d.summary, ...d.sections.flatMap((s) => [s.heading, ...s.items])].join('\n');
}

function items(figure: Figure, heading: string): string[] {
  return describeFigure(figure).sections.find((s) => s.heading === heading)?.items ?? [];
}

describe('describeFigure lists every element', () => {
  it('context diagram: the system, every entity and every flow with its label and ends', () => {
    const t = text(contextFixture);
    expect(t).toContain(contextFixture.system.label);
    for (const e of contextFixture.entities) expect(t).toContain(e.label);
    expect(items(contextFixture, 'Data flows')).toHaveLength(contextFixture.flows.length);
    expect(t).toContain('booking_request from Customer (external entity) to Kayak booking system (the system)');
    expect(t).toContain('weekly_report from Kayak booking system (the system) to Manager (external entity)');
  });

  it('DFD: processes and stores by name alone, entities and flows', () => {
    expect(items(dfdFixture, 'Processes')).toEqual(['Make booking', 'Take payment', 'Produce reports']);
    expect(items(dfdFixture, 'Data stores')).toEqual(['Bookings']);
    expect(items(dfdFixture, 'External entities')).toEqual(['Customer', 'Payment gateway', 'Manager', 'Hire staff']);
    const flows = items(dfdFixture, 'Data flows');
    expect(flows).toHaveLength(dfdFixture.flows.length);
    for (const f of dfdFixture.flows) expect(flows.some((line) => line.startsWith(`${f.label} from `))).toBe(true);
    expect(flows).toContain('booking_request from Customer (external entity) to Make booking (process)');
    expect(flows).toContain('new_booking from Make booking (process) to Bookings (data store)');
    expect(describeFigure(dfdFixture).summary).toBe(
      'Level 1 data flow diagram with 3 processes, 1 data store, 4 external entities and 11 data flows.',
    );
  });

  it('DFD: names processes and stores, never by a process number or a store id', () => {
    expect(text(dfdFixture)).not.toMatch(/\bD\d|\d\.\d|process \d/);
    const marks = new Map([['book', 'A'], ['bookings', 'B']]);
    expect(describeFigure(dfdFixture, marks).sections[0]).toEqual({
      heading: 'Marked on the figure',
      items: ['A: Make booking (process)', 'B: Bookings (data store)'],
    });
    expect(dfdNodeName({ id: 'p', type: 'process', label: 'Check availability', x: 0, y: 0 })).toBe('Check availability (process)');
    expect(dfdNodeName({ id: 's', type: 'store', label: 'Bookings', x: 0, y: 0 })).toBe('Bookings (data store)');
  });

  it('use case diagram: boundary, actors, use cases, associations, includes and extends', () => {
    const t = text(useCaseFixture);
    expect(t).toContain(useCaseFixture.system.label);
    for (const a of useCaseFixture.actors) expect(items(useCaseFixture, 'Actors')).toContain(a.label);
    for (const u of useCaseFixture.useCases) expect(items(useCaseFixture, 'Use cases')).toContain(u.label);
    expect(items(useCaseFixture, 'Associations')).toEqual(['Customer and Make booking', 'Hire staff and Record kayak return', 'Manager and View weekly report']);
    expect(items(useCaseFixture, '<<includes>> relationships')).toEqual(['Make booking includes Take payment']);
    expect(items(useCaseFixture, '<<extends>> relationships')).toEqual(['Apply member discount extends Make booking']);
  });

  it('Gantt chart: every task with its duration, dependencies, timing, and critical or spare time', () => {
    const tasks = items(ganttFixture, 'Tasks');
    expect(tasks).toHaveLength(ganttFixture.tasks.length);
    expect(tasks[0]).toBe('A Interview stakeholders: 3 days, no dependencies, runs in days 1 to 3, critical');
    expect(tasks[2]).toBe('C Design mock-ups: 2 days, after A, runs in days 4 to 5, 2 days spare');
    expect(tasks[3]).toBe('D Design sign-off: 0 days, after C, milestone at the end of day 5, 2 days spare');
    // The study design names the critical path, but not slack or float.
    expect(text(ganttFixture)).not.toMatch(/slack|float/i);
    expect(tasks[4]).toContain('after B and D');
    expect(describeFigure(ganttFixture).summary).toBe('Gantt chart of 7 tasks, measured in days. The project takes 16 days. Critical path: A, B, E, G.');
  });

  it('Gantt chart without the critical path keeps it and spare time out of the description', () => {
    const plain: Gantt = { ...ganttFixture, showCriticalPath: false, unit: 'week' };
    const d = describeFigure(plain);
    expect(d.summary).toContain('The critical path is not marked.');
    expect(d.sections[0].items[1]).toBe('B Write the SRS: 4 weeks, after A, runs in weeks 4 to 7');
    expect(text(plain)).not.toMatch(/spare|slack|float|, critical|Critical path:/i);
  });

  it("Gantt chart: explicit starts, a milestone at a task's finish, and plans that cannot be scheduled", () => {
    const booked: Gantt = { ...ganttFixture, tasks: [{ id: 'A', name: 'Venue booked', duration: 2, dependsOn: [], start: 4 }] };
    expect(items(booked, 'Tasks')[0]).toBe('A Venue booked: 2 days, no dependencies, not before day 5, runs in days 5 to 6, critical');
    const handover: Gantt = { ...ganttFixture, tasks: [{ id: 'A', name: 'Beta test', duration: 3, dependsOn: [], milestone: true }] };
    expect(items(handover, 'Tasks')[0]).toBe('A Beta test: 3 days, no dependencies, runs in days 1 to 3, milestone at the end of day 3, critical');
    const loop: Gantt = { ...ganttFixture, tasks: [{ id: 'A', name: 'Loop', duration: 1, dependsOn: ['A'] }] };
    expect(describeFigure(loop).summary).toMatch(/can't be drawn\. Gantt tasks form a dependency cycle/);
    expect(items(loop, 'Tasks')[0]).toBe('A Loop: 1 day, after A');
  });

  it("object description: VCAA's three rows, each property written name (type), each method with its parameters", () => {
    expect(describeFigure(objectFixture).sections.map((s) => s.heading)).toEqual(['Name', 'Properties/Attributes', 'Methods']);
    expect(items(objectFixture, 'Name')).toEqual(['Booking']);
    expect(items(objectFixture, 'Properties/Attributes')).toEqual([
      'bookingId (integer)',
      'customerName (string)',
      'hireDate (date/time)',
      'kayakCount (integer)',
      'deposit (floating point)',
      'isPaid (Boolean)',
    ]);
    expect(items(objectFixture, 'Methods')).toEqual(['calculateTotal()', 'confirmBooking()', 'cancelBooking(reason)']);
    expect(describeFigure(objectFixture).summary).toBe('Object description for Booking, with 6 properties and 3 methods.');
  });

  it('object description: a property without a data type, descriptions, empty rows and marks', () => {
    const noted: ObjectDescription = {
      ...objectFixture,
      properties: [{ name: 'notes' }, { name: 'deposit', type: 'floating point', description: 'Paid when booking' }],
      methods: [],
    };
    expect(items(noted, 'Properties/Attributes')).toEqual(['notes', 'deposit (floating point): Paid when booking']);
    expect(items(noted, 'Methods')).toEqual(['None']);
    const d = describeFigure(objectFixture, new Map([['kayakCount', 'A'], ['cancelBooking(reason)', 'B']]));
    expect(d.sections[0]).toEqual({ heading: 'Marked on the figure', items: ['A: property kayakCount', 'B: method cancelBooking(reason)'] });
  });

  it('pseudocode: every numbered line and the index base', () => {
    const d = describeFigure(pseudocodeFixture);
    expect(d.summary).toBe('Pseudocode listing of 7 numbered lines. Arrays are indexed from 0.');
    expect(d.sections[0].items[3]).toBe('Line 4: total ← total + kayaks[i]');
  });

  it('table: every column and every cell, as plain text', () => {
    expect(items(tableFixture, 'Columns')).toEqual(tableFixture.columns);
    expect(items(tableFixture, 'Rows')[2]).toBe('Row 3: Test number 3; Input 7; Expected output Error: enter 1 to 6 kayaks; Actual output (empty)');
  });

  it('mock-up: every element in reading order and every note', () => {
    const elements = items(mockupFixture, 'Elements, top to bottom');
    expect(elements).toHaveLength(mockupFixture.elements.length);
    expect(elements[0]).toBe('Window titled "Book a kayak"');
    expect(elements).toContain('Text box "e.g. Mia Nguyen" (note 2)');
    expect(elements).toContain('List box with items "Apollo Bay", "Lorne" and "Skenes Creek"');
    expect(elements).toContain('Divider');
    expect(elements).toContain('Check box "I am a club member"');
    expect(items(mockupFixture, 'Notes')).toEqual([
      '1. The logo links to the home screen. (Image placeholder "Logo")',
      '2. Existence check: the name is required. (Text box "e.g. Mia Nguyen")',
      '3. Disabled until every field is valid. (Button "Book now")',
    ]);
  });

  it('lists marked elements first and ignores unknown ids', () => {
    const d = describeFigure(ganttFixture, new Map([['C', 'A'], ['zz', 'B']]));
    expect(d.sections[0]).toEqual({ heading: 'Marked on the figure', items: ['A: task C Design mock-ups'] });
  });
});

describe('plainInline', () => {
  it('drops Markdown emphasis and code markers', () => {
    expect(plainInline('**Error**: use `total` *now*')).toBe('Error: use total now');
  });
});

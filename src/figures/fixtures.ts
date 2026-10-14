/**
 * One sample figure of each kind, laid out the way content authors will write them. Tests render
 * these; they also serve as worked examples of the coordinates in content/README.md. The
 * organisation is invented.
 */
import type { ContextDiagram, Dfd, Figure, Gantt, Mockup, ObjectDescription, PseudocodeFigure, TableFigure, UseCaseDiagram } from '../content/schema';

export const contextFixture: ContextDiagram = {
  id: 'fx-context',
  kind: 'context',
  title: 'Context diagram for the Otway Kayak Hire booking system',
  width: 640,
  height: 400,
  system: { label: 'Kayak booking system', x: 320, y: 200 },
  entities: [
    { id: 'customer', label: 'Customer', x: 96, y: 72 },
    { id: 'gateway', label: 'Payment gateway', x: 96, y: 328 },
    { id: 'staff', label: 'Hire staff', x: 544, y: 72 },
    { id: 'manager', label: 'Manager', x: 544, y: 328 },
  ],
  flows: [
    { from: 'customer', to: 'system', label: 'booking_request' },
    { from: 'system', to: 'customer', label: 'booking_confirmation' },
    { from: 'system', to: 'gateway', label: 'payment_request' },
    { from: 'gateway', to: 'system', label: 'payment_result' },
    { from: 'system', to: 'staff', label: 'daily_hire_list' },
    { from: 'system', to: 'manager', label: 'weekly_report' },
  ],
};

/**
 * The Level 1 DFD of the system in `contextFixture`, consistent with it: the same entities, and the
 * same flows to and from them. It keeps every VCAA rule (every process and store has an input and
 * an output, every flow joins a process, no flows cross). The store sits between the processes
 * above and below it, so its flows meet its lines rather than its open ends, as in VCAA's diagrams.
 */
export const dfdFixture: Dfd = {
  id: 'fx-dfd',
  kind: 'dfd',
  level: 1,
  width: 800,
  height: 490,
  caption: 'Level 1 DFD for the Kayak booking system.',
  nodes: [
    { id: 'customer', type: 'entity', label: 'Customer', x: 88, y: 80 },
    { id: 'book', type: 'process', label: 'Make booking', x: 370, y: 80 },
    { id: 'bookings', type: 'store', label: 'Bookings', x: 370, y: 250 },
    { id: 'pay', type: 'process', label: 'Take payment', x: 660, y: 80 },
    { id: 'gateway', type: 'entity', label: 'Payment gateway', x: 660, y: 250, w: 160 },
    { id: 'report', type: 'process', label: 'Produce reports', x: 370, y: 410 },
    { id: 'manager', type: 'entity', label: 'Manager', x: 88, y: 410 },
    { id: 'staff', type: 'entity', label: 'Hire staff', x: 660, y: 410 },
  ],
  flows: [
    { id: 'f1', from: 'customer', to: 'book', label: 'booking_request' },
    { id: 'f2', from: 'bookings', to: 'book', label: 'current_bookings' },
    { id: 'f3', from: 'book', to: 'pay', label: 'amount_due' },
    { id: 'f4', from: 'pay', to: 'gateway', label: 'payment_request' },
    { id: 'f5', from: 'gateway', to: 'pay', label: 'payment_result' },
    { id: 'f6', from: 'pay', to: 'book', label: 'payment_receipt' },
    { id: 'f7', from: 'book', to: 'bookings', label: 'new_booking' },
    { id: 'f8', from: 'book', to: 'customer', label: 'booking_confirmation' },
    { id: 'f9', from: 'bookings', to: 'report', label: 'booking_list' },
    { id: 'f10', from: 'report', to: 'staff', label: 'daily_hire_list' },
    { id: 'f11', from: 'report', to: 'manager', label: 'weekly_report' },
  ],
};

/**
 * Each actor is a role, a kind of person who uses the system; the payment gateway, an external
 * entity in the DFD, is not drawn as one. <<includes>> points from the base use case to the
 * included one (every booking takes a payment); <<extends>> from the extending use case to the
 * base (a discount applies to some bookings only). As in the 2025 examination's diagram, the
 * included and extending use cases have no actor of their own.
 */
export const useCaseFixture: UseCaseDiagram = {
  id: 'fx-usecase',
  kind: 'usecase',
  width: 760,
  height: 440,
  system: { label: 'Kayak hire system', x: 410, y: 220, w: 440, h: 400 },
  actors: [
    { id: 'customer', label: 'Customer', x: 72, y: 120 },
    { id: 'staff', label: 'Hire staff', x: 72, y: 330 },
    { id: 'manager', label: 'Manager', x: 690, y: 100 },
  ],
  useCases: [
    { id: 'book', label: 'Make booking', x: 330, y: 100 },
    { id: 'report', label: 'View weekly report', x: 524, y: 100, rx: 76 },
    { id: 'pay', label: 'Take payment', x: 470, y: 210 },
    { id: 'discount', label: 'Apply member discount', x: 330, y: 300, rx: 96 },
    { id: 'return', label: 'Record kayak return', x: 400, y: 378 },
  ],
  links: [
    { from: 'customer', to: 'book', type: 'association' },
    // Labels beside their lines, as VCAA sets them.
    { from: 'book', to: 'pay', type: 'includes', labelAt: { x: 462, y: 150 } },
    { from: 'discount', to: 'book', type: 'extends', labelAt: { x: 282, y: 200 } },
    { from: 'staff', to: 'return', type: 'association' },
    { from: 'manager', to: 'report', type: 'association' },
  ],
};

export const ganttFixture: Gantt = {
  id: 'fx-gantt',
  kind: 'gantt',
  title: 'Project plan for the booking system',
  unit: 'day',
  showCriticalPath: true,
  tasks: [
    { id: 'A', name: 'Interview stakeholders', duration: 3, dependsOn: [] },
    { id: 'B', name: 'Write the SRS', duration: 4, dependsOn: ['A'] },
    { id: 'C', name: 'Design mock-ups', duration: 2, dependsOn: ['A'] },
    { id: 'D', name: 'Design sign-off', duration: 0, dependsOn: ['C'], milestone: true },
    { id: 'E', name: 'Build the booking module', duration: 6, dependsOn: ['B', 'D'] },
    { id: 'F', name: 'Set up the payment gateway', duration: 3, dependsOn: ['B'] },
    { id: 'G', name: 'Beta test', duration: 3, dependsOn: ['E', 'F'] },
  ],
};

/**
 * Written as VCAA writes one: data types in the study design's names (lower case but for Boolean),
 * and a method's parameters inside its brackets.
 */
export const objectFixture: ObjectDescription = {
  id: 'fx-object',
  kind: 'object',
  name: 'Booking',
  properties: [
    { name: 'bookingId', type: 'integer' },
    { name: 'customerName', type: 'string' },
    { name: 'hireDate', type: 'date/time' },
    { name: 'kayakCount', type: 'integer' },
    { name: 'deposit', type: 'floating point' },
    { name: 'isPaid', type: 'Boolean' },
  ],
  methods: [{ name: 'calculateTotal()' }, { name: 'confirmBooking()' }, { name: 'cancelBooking(reason)' }],
};

export const pseudocodeFixture: PseudocodeFigure = {
  id: 'fx-pseudo',
  kind: 'pseudocode',
  title: 'Algorithm to total the kayaks booked',
  indexBase: 0,
  code: ['BEGIN', '    total ← 0', '    FOR i ← 0 TO 4', '        total ← total + kayaks[i]', '    ENDFOR', '    DISPLAY "Total: " + total', 'END'].join('\n'),
};

export const tableFixture: TableFigure = {
  id: 'fx-table',
  kind: 'table',
  title: 'Test table for the kayak count',
  columns: ['Test', 'Kayaks', 'Expected output', 'Actual output'],
  rows: [
    ['1', '`0`', 'Error: enter 1 to 6 kayaks', ''],
    ['2', '`1`', 'Accepted', ''],
    ['3', '`7`', '**Error**: enter 1 to 6 kayaks', ''],
  ],
};

export const mockupFixture: Mockup = {
  id: 'fx-mockup',
  kind: 'mockup',
  title: 'Mock-up of the booking screen',
  width: 480,
  height: 440,
  elements: [
    { type: 'window', x: 240, y: 220, w: 448, h: 408, text: 'Book a kayak' },
    { type: 'heading', x: 150, y: 70, w: 240, h: 28, text: 'Your booking' },
    { type: 'image', x: 380, y: 96, w: 104, h: 64, text: 'Logo', note: 'The logo links to the home screen.' },
    { type: 'label', x: 96, y: 114, w: 112, h: 20, text: 'Full name' },
    { type: 'textbox', x: 170, y: 142, w: 260, h: 32, text: 'e.g. Mia Nguyen', note: 'Existence check: the name is required.' },
    { type: 'dropdown', x: 170, y: 192, w: 260, h: 32, text: 'Single kayak' },
    { type: 'checkbox', x: 150, y: 234, w: 220, h: 20, text: 'I am a club member' },
    { type: 'radio', x: 110, y: 266, w: 140, h: 20, text: 'Morning' },
    { type: 'radio', x: 260, y: 266, w: 140, h: 20, text: 'Afternoon' },
    { type: 'list', x: 170, y: 324, w: 260, h: 72, text: 'Apollo Bay\nLorne\nSkenes Creek' },
    { type: 'divider', x: 240, y: 374, w: 416, h: 2 },
    { type: 'button', x: 392, y: 400, w: 112, h: 32, text: 'Book now', note: 'Disabled until every field is valid.' },
  ],
};

export const FIXTURES: Figure[] = [
  contextFixture,
  dfdFixture,
  useCaseFixture,
  ganttFixture,
  objectFixture,
  pseudocodeFixture,
  tableFixture,
  mockupFixture,
];

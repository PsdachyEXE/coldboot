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

export const dfdFixture: Dfd = {
  id: 'fx-dfd',
  kind: 'dfd',
  level: 1,
  width: 720,
  height: 460,
  caption: 'Part of the Level 1 DFD for the booking system.',
  nodes: [
    { id: 'customer', type: 'entity', label: 'Customer', x: 96, y: 96 },
    { id: 'p1', type: 'process', number: '1', label: 'Check availability', x: 336, y: 96 },
    { id: 'p2', type: 'process', number: '2', label: 'Record booking', x: 336, y: 300 },
    { id: 'p3', type: 'process', number: '3', label: 'Take payment', x: 600, y: 300 },
    { id: 'd1', type: 'store', number: 'D1', label: 'Kayaks', x: 600, y: 96 },
    { id: 'd2', type: 'store', number: 'D2', label: 'Bookings', x: 96, y: 300 },
    { id: 'gateway', type: 'entity', label: 'Payment gateway', x: 600, y: 424, w: 160, h: 40 },
  ],
  flows: [
    { id: 'f1', from: 'customer', to: 'p1', label: 'hire_request' },
    { id: 'f2', from: 'd1', to: 'p1', label: 'kayak_details' },
    { id: 'f3', from: 'p1', to: 'customer', label: 'available_kayaks' },
    { id: 'f4', from: 'customer', to: 'p2', label: 'booking_details', via: [{ x: 96, y: 200 }, { x: 250, y: 220 }] },
    { id: 'f5', from: 'p2', to: 'd2', label: 'booking_record' },
    { id: 'f6', from: 'p2', to: 'p3', label: 'amount_due' },
    { id: 'f7', from: 'p3', to: 'gateway', label: 'payment_request', labelAt: { x: 530, y: 374 } },
  ],
};

export const useCaseFixture: UseCaseDiagram = {
  id: 'fx-usecase',
  kind: 'usecase',
  width: 760,
  height: 440,
  system: { label: 'Kayak hire system', x: 400, y: 220, w: 420, h: 400 },
  actors: [
    { id: 'customer', label: 'Customer', x: 72, y: 120 },
    { id: 'staff', label: 'Hire staff', x: 72, y: 330 },
    { id: 'gateway', label: 'Payment gateway', x: 690, y: 210 },
  ],
  useCases: [
    { id: 'book', label: 'Make booking', x: 330, y: 100 },
    { id: 'pay', label: 'Take payment', x: 470, y: 210 },
    { id: 'discount', label: 'Apply member discount', x: 330, y: 300, rx: 96 },
    { id: 'return', label: 'Record kayak return', x: 400, y: 378 },
  ],
  links: [
    { from: 'customer', to: 'book', type: 'association' },
    { from: 'book', to: 'pay', type: 'includes' },
    { from: 'discount', to: 'book', type: 'extends' },
    { from: 'staff', to: 'return', type: 'association' },
    { from: 'gateway', to: 'pay', type: 'association' },
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

export const objectFixture: ObjectDescription = {
  id: 'fx-object',
  kind: 'object',
  name: 'Booking',
  properties: [
    { name: 'bookingId', type: 'Integer' },
    { name: 'customerName', type: 'String' },
    { name: 'kayakCount', type: 'Integer' },
    { name: 'deposit', type: 'Floating point' },
    { name: 'isPaid', type: 'Boolean' },
  ],
  methods: [{ name: 'calculateTotal()' }, { name: 'confirmBooking()' }, { name: 'cancelBooking()' }],
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
  columns: ['Test number', 'Input', 'Expected output', 'Actual output'],
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

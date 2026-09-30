/**
 * The `usecase` bank: five invented Australian organisations, each with a scenario, three actors,
 * four use cases, the relationships between them, and the people, things and data in the scenario
 * that are not actors.
 *
 * Every system fits one hand-laid layout (below): a main actor and a staff actor on the left, an
 * external system on the right, and four use cases inside the boundary. Use case 1 always
 * includes use case 2 (which the external system takes part in); use case 3 extends use case 1
 * (it happens only sometimes); the staff actor has use case 4. The scenario states which steps
 * always happen and which are optional, so includes and extends can be told apart from the text.
 */
import type { UseCaseDiagram } from '../../content/schema';

export type ActorSlot = 'a1' | 'a2' | 'a3';
export type UseCaseSlot = 'u1' | 'u2' | 'u3' | 'u4';

export interface Relationship {
  id: string;
  base: string;
  other: string;
  type: 'includes' | 'extends';
  /** Says whether the step always happens or only sometimes. */
  statement: string;
}

export interface UseCaseSystem {
  id: string;
  org: string;
  system: string;
  actors: Record<ActorSlot, string>;
  useCases: Record<UseCaseSlot, string>;
  /** The scenario, stating who uses the system and which steps always or only sometimes happen. */
  scenario: string;
  /** u1 includes u2 (always) and u3 extends u1 (sometimes), in the scenario's words. */
  always: string;
  sometimes: string;
  /** Candidates that are not actors, each with why not. */
  notActors: readonly { label: string; why: string }[];
  /** Why each actor is one. */
  actorWhy: Record<ActorSlot, string>;
  /** More includes and extends questions on the same system, beyond the two in the diagram. */
  extra: readonly Relationship[];
}

export const SYSTEMS: readonly UseCaseSystem[] = [
  {
    id: 'bookshop',
    org: 'Harbourside Books in Williamstown',
    system: 'Online ordering system',
    actors: { a1: 'Customer', a2: 'Warehouse staff', a3: 'Payment gateway' },
    useCases: { u1: 'Place order', u2: 'Take payment', u3: 'Apply gift voucher', u4: 'Update stock' },
    scenario:
      'Harbourside Books in Williamstown wants an online ordering system. Customers place orders for books. Every order is paid for by card, through a payment gateway, as it is placed. A customer who has a gift voucher can apply it to an order. Warehouse staff update the stock levels when deliveries arrive.',
    always: 'Every order is paid for as it is placed.',
    sometimes: 'A gift voucher is applied only when the customer has one.',
    notActors: [
      { label: 'Online ordering system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Order details', why: 'it is data that moves through the system, not someone or something using it' },
      { label: 'Book publishers', why: 'the shop orders from publishers by phone, so they never interact with the system' },
    ],
    actorWhy: {
      a1: 'customers place orders',
      a2: 'warehouse staff update stock levels',
      a3: 'the payment gateway is an external system that takes part in payments',
    },
    extra: [
      { id: 'bookshop-wrap', base: 'Place order', other: 'Choose gift wrapping', type: 'extends', statement: 'Customers can ask for gift wrapping if they want it.' },
      { id: 'bookshop-address', base: 'Place order', other: 'Enter delivery address', type: 'includes', statement: 'Every order is posted, so every order needs a delivery address.' },
    ],
  },
  {
    id: 'swim',
    org: 'Seaview Swim School in Warrnambool',
    system: 'Enrolment system',
    actors: { a1: 'Parent', a2: 'Swim instructor', a3: 'Payment gateway' },
    useCases: { u1: 'Enrol child', u2: 'Pay term fees', u3: 'Claim sibling discount', u4: 'Record attendance' },
    scenario:
      'Seaview Swim School in Warrnambool wants an enrolment system. Parents enrol their children in classes online, and every enrolment includes paying the term fees through a payment gateway. A parent who already has another child enrolled can claim a sibling discount. Swim instructors record attendance at each class.',
    always: 'Every enrolment includes paying the term fees.',
    sometimes: 'The sibling discount is claimed only when another child is already enrolled.',
    notActors: [
      { label: 'Enrolment system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Class timetable', why: 'it is data the system stores and shows, not a user of it' },
      { label: 'The council that owns the pool', why: 'the scenario never has the council using the system' },
    ],
    actorWhy: {
      a1: 'parents enrol their children',
      a2: 'swim instructors record attendance',
      a3: 'the payment gateway is an external system that takes the fees',
    },
    extra: [
      { id: 'swim-time', base: 'Enrol child', other: 'Choose class time', type: 'includes', statement: 'Every enrolment is for a particular class time, which the parent chooses.' },
      { id: 'swim-medical', base: 'Enrol child', other: 'Add medical notes', type: 'extends', statement: 'Parents add medical notes only if their child has a condition the instructor should know about.' },
    ],
  },
  {
    id: 'bikes',
    org: 'Coastal Bike Hire in Lorne',
    system: 'Bike booking system',
    actors: { a1: 'Rider', a2: 'Mechanic', a3: 'SMS service' },
    useCases: { u1: 'Book a bike', u2: 'Send confirmation text', u3: 'Add a child seat', u4: 'Log bike repair' },
    scenario:
      'Coastal Bike Hire in Lorne wants a bike booking system. Riders book bikes online, and every booking sends the rider a confirmation text through an SMS service. A rider travelling with a young child can add a child seat to the booking. Mechanics log each repair they make to a bike.',
    always: 'Every booking sends a confirmation text.',
    sometimes: 'A child seat is added only when the rider needs one.',
    notActors: [
      { label: 'Bike booking system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Bikes', why: 'bikes are things the system keeps records about; they do not use it' },
      { label: 'Booking details', why: 'it is data that moves through the system, not a user of it' },
    ],
    actorWhy: {
      a1: 'riders book bikes',
      a2: 'mechanics log repairs',
      a3: 'the SMS service is an external system that sends the texts',
    },
    extra: [
      { id: 'bikes-conditions', base: 'Book a bike', other: 'Accept hire conditions', type: 'includes', statement: 'Every rider must accept the hire conditions before a booking is made.' },
      { id: 'bikes-insurance', base: 'Book a bike', other: 'Add damage cover', type: 'extends', statement: 'Riders can pay extra for damage cover if they want it.' },
    ],
  },
  {
    id: 'library',
    org: 'Ridgeway Community Library in Sale',
    system: 'Library loans system',
    actors: { a1: 'Member', a2: 'Librarian', a3: 'Email service' },
    useCases: { u1: 'Borrow item', u2: 'Send due date email', u3: 'Pay overdue fine', u4: 'Add new item' },
    scenario:
      'Ridgeway Community Library in Sale wants a loans system. Members borrow books and games at a self-service kiosk, and every loan sends the member an email with the due date through an email service. A member who has an overdue fine must pay it while borrowing, before the loan goes through. Librarians add new items to the collection.',
    always: 'Every loan sends a due date email.',
    sometimes: 'A fine is paid only when the member has one.',
    notActors: [
      { label: 'Library loans system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Self-service kiosk', why: 'it is part of the system: the hardware members use to reach it' },
      { label: 'Book', why: 'books are items the system keeps records about; they do not use it' },
    ],
    actorWhy: {
      a1: 'members borrow items',
      a2: 'librarians add new items',
      a3: 'the email service is an external system that sends the emails',
    },
    extra: [
      { id: 'library-card', base: 'Borrow item', other: 'Scan membership card', type: 'includes', statement: 'Every loan starts with the member scanning their membership card.' },
      { id: 'library-reserve', base: 'Search catalogue', other: 'Reserve item', type: 'extends', statement: 'Members reserve an item only when the one they want is already on loan.' },
    ],
  },
  {
    id: 'camping',
    org: 'Wombat Ridge Camping Ground in Halls Gap',
    system: 'Campsite booking system',
    actors: { a1: 'Camper', a2: 'Ranger', a3: 'Payment gateway' },
    useCases: { u1: 'Book campsite', u2: 'Pay deposit', u3: 'Book powered site', u4: 'Record site check' },
    scenario:
      'Wombat Ridge Camping Ground in Halls Gap wants a campsite booking system. Campers book sites online, and every booking includes paying a deposit through a payment gateway. Campers with caravans can choose a powered site when they book. Rangers record a check of each site after campers leave.',
    always: 'Every booking includes paying a deposit.',
    sometimes: 'A powered site is booked only by campers who need power.',
    notActors: [
      { label: 'Campsite booking system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Campsite map', why: 'it is information the system shows, not a user of it' },
      { label: 'The regional tourism office', why: 'the scenario never has the tourism office using the system' },
    ],
    actorWhy: {
      a1: 'campers book sites',
      a2: 'rangers record site checks',
      a3: 'the payment gateway is an external system that takes the deposits',
    },
    extra: [
      { id: 'camping-dates', base: 'Book campsite', other: 'Choose arrival date', type: 'includes', statement: 'Every booking is for a particular arrival date.' },
      { id: 'camping-firewood', base: 'Book campsite', other: 'Order firewood', type: 'extends', statement: 'Campers can order firewood with a booking if they want a campfire.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// The layout: explicit coordinates, no auto-layout
// ---------------------------------------------------------------------------

export const WIDTH = 800;
export const HEIGHT = 460;
export const BOUNDARY = { x: 430, y: 230, w: 380, h: 420 };

export const ACTOR_AT: Record<ActorSlot, { x: number; y: number }> = {
  a1: { x: 100, y: 110 },
  a2: { x: 100, y: 340 },
  a3: { x: 725, y: 220 },
};

/** Where the staff actor stands when the error puts it inside the boundary. */
export const A2_INSIDE = { x: 300, y: 372 };

export const USE_CASE_AT: Record<UseCaseSlot, { x: number; y: number; rx?: number }> = {
  u1: { x: 430, y: 80 },
  u2: { x: 520, y: 220, rx: 90 },
  u3: { x: 340, y: 290, rx: 88 },
  u4: { x: 470, y: 385 },
};

/** The actor-to-actor error's line runs down the left edge, clear of the actors' labels. */
export const ACTOR_LINK_VIA = [
  { x: 28, y: 110 },
  { x: 28, y: 340 },
];

export type UseCaseError = 'actor-inside' | 'actor-actor' | 'includes-optional' | 'extends-always';
export const USE_CASE_ERRORS: readonly UseCaseError[] = ['actor-inside', 'actor-actor', 'includes-optional', 'extends-always'];

/** Highlight keys for the diagram's elements. */
export const LINK_KEYS = {
  a1u1: 'a1->u1',
  u1u2: 'u1->u2',
  u3u1: 'u3->u1',
  a3u2: 'a3->u2',
  a2u4: 'a2->u4',
  /** The errors' links. */
  a1a2: 'a1->a2',
  u1u3: 'u1->u3',
  u2u1: 'u2->u1',
} as const;

/** The system's diagram, correct or with one convention error. */
export function diagramFor(sys: UseCaseSystem, error: UseCaseError | null, id = `usecase-${sys.id}`): UseCaseDiagram {
  const actors = (['a1', 'a2', 'a3'] as const).map((slot) => {
    const at = error === 'actor-inside' && slot === 'a2' ? A2_INSIDE : ACTOR_AT[slot];
    return { id: slot, label: sys.actors[slot], x: at.x, y: at.y };
  });
  const useCases = (['u1', 'u2', 'u3', 'u4'] as const).map((slot) => ({ id: slot, label: sys.useCases[slot], ...USE_CASE_AT[slot] }));
  const links: UseCaseDiagram['links'] = [
    { from: 'a1', to: 'u1', type: 'association' },
    error === 'extends-always' ? { from: 'u2', to: 'u1', type: 'extends' } : { from: 'u1', to: 'u2', type: 'includes' },
    error === 'includes-optional' ? { from: 'u1', to: 'u3', type: 'includes' } : { from: 'u3', to: 'u1', type: 'extends' },
    { from: 'a3', to: 'u2', type: 'association' },
    { from: 'a2', to: 'u4', type: 'association' },
  ];
  if (error === 'actor-actor') links.push({ from: 'a1', to: 'a2', type: 'association', via: ACTOR_LINK_VIA });
  return {
    id,
    kind: 'usecase',
    title: `Use case diagram: ${sys.system}`,
    width: WIDTH,
    height: HEIGHT,
    system: { label: sys.system, ...BOUNDARY },
    actors,
    useCases,
    links,
  };
}

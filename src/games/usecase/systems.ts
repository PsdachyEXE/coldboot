/**
 * The `usecase` bank: five invented Australian organisations, each with a scenario, three actors,
 * four use cases, the relationships between them, and the things in the scenario that are not
 * actors.
 *
 * An actor is a role: a kind of user who interacts with the system (Customer, Ranger). The system
 * itself, a device, an organisation, data, and anyone who never uses the system are not actors,
 * and every scenario names some of each. External services (a payment gateway, an SMS service)
 * are kept out of the scenarios: some textbooks draw them as actors, which a role-based reading
 * doesn't, so a question on them would have two answers.
 *
 * Every system fits one hand-laid layout (below): the main user (a1) and a staff role (a2) on the
 * left, a second staff role (a3) on the right, and four use cases inside the boundary. a1 and a3
 * both take part in use case 1, the base use case; it always includes use case 2, and use case 3
 * extends it (it happens only when a condition is met). Neither use case 2 nor 3 has an actor of
 * its own, as in the 2025 examination's diagram. a2 has use case 4. The scenario states which
 * step always happens and which only sometimes, so includes and extends can be told apart from
 * the text.
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

/** What a candidate that isn't an actor is. */
export type NotActorKind = 'system' | 'device' | 'organisation' | 'data' | 'non-user';

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
  /** Candidates that are not actors, each with what it is and why not. */
  notActors: readonly { label: string; kind: NotActorKind; why: string }[];
  /** Why each actor is one: the role and what it does with the system. */
  actorWhy: Record<ActorSlot, string>;
  /** More includes and extends questions on the same system, beyond the two in the diagram. */
  extra: readonly Relationship[];
}

export const SYSTEMS: readonly UseCaseSystem[] = [
  {
    id: 'bookshop',
    org: 'Harbourside Books in Williamstown',
    system: 'Online ordering system',
    actors: { a1: 'Customer', a2: 'Warehouse worker', a3: 'Sales assistant' },
    useCases: { u1: 'Place order', u2: 'Take payment', u3: 'Apply gift voucher', u4: 'Update stock' },
    scenario:
      'Harbourside Books in Williamstown wants an online ordering system. Customers place orders for books from their mobile phones, and sales assistants place orders for customers who ring the shop. The system stores the order details. Every order is paid for by card as it is placed. A customer who has a gift voucher can apply it to an order. Warehouse workers update the stock levels when deliveries arrive. The shop still orders its books from book publishers by phone.',
    always: 'Every order is paid for as it is placed.',
    sometimes: 'A gift voucher is applied only when the customer has one.',
    notActors: [
      { label: 'Online ordering system', kind: 'system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Mobile phone', kind: 'device', why: 'it is a device customers use to reach the system (the customer is the actor)' },
      { label: 'Book publishers', kind: 'non-user', why: 'the shop orders from them by phone, so they never interact with the system' },
      { label: 'Order details', kind: 'data', why: 'it is data that moves through the system, not someone using it' },
    ],
    actorWhy: {
      a1: 'customers place orders',
      a2: 'warehouse workers update stock levels',
      a3: 'sales assistants place orders for customers who ring',
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
    actors: { a1: 'Parent', a2: 'Swim instructor', a3: 'Receptionist' },
    useCases: { u1: 'Enrol child', u2: 'Pay term fees', u3: 'Claim sibling discount', u4: 'Record attendance' },
    scenario:
      'Seaview Swim School in Warrnambool wants an enrolment system. Parents enrol their children in classes online, and the receptionist enrols children for parents who come to the front desk. Every enrolment includes paying the term fees. A parent who already has another child enrolled can claim a sibling discount. Parents choose a class from the class timetable. Swim instructors record attendance at each class on a tablet. The pool belongs to the local council, which has no part in enrolments.',
    always: 'Every enrolment includes paying the term fees.',
    sometimes: 'The sibling discount is claimed only when another child is already enrolled.',
    notActors: [
      { label: 'Enrolment system', kind: 'system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Tablet', kind: 'device', why: 'it is a device instructors use to reach the system (the swim instructor is the actor)' },
      { label: 'The local council', kind: 'organisation', why: 'it is an organisation with no part in enrolments, so it never interacts with the system' },
      { label: 'Class timetable', kind: 'data', why: 'it is data the system stores and shows, not a user of it' },
    ],
    actorWhy: {
      a1: 'parents enrol their children',
      a2: 'swim instructors record attendance',
      a3: 'the receptionist enrols children at the front desk',
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
    actors: { a1: 'Rider', a2: 'Mechanic', a3: 'Shop assistant' },
    useCases: { u1: 'Book a bike', u2: 'Send confirmation text', u3: 'Add a child seat', u4: 'Log bike repair' },
    scenario:
      "Coastal Bike Hire in Lorne wants a bike booking system. Riders book bikes online, and shop assistants book bikes for riders who walk in. Every booking sends a confirmation text to the rider's phone. A rider travelling with a young child can add a child seat to the booking. Mechanics log each repair they make to a bike. The system keeps the booking details of every hire, and Coastal Bike Hire's owner hopes it will put an end to double bookings.",
    always: 'Every booking sends a confirmation text.',
    sometimes: 'A child seat is added only when the rider needs one.',
    notActors: [
      { label: 'Bike booking system', kind: 'system', why: 'it is the system itself, drawn as the boundary' },
      { label: "Rider's phone", kind: 'device', why: 'it is a device that receives the text (the rider is the actor)' },
      { label: 'Coastal Bike Hire', kind: 'organisation', why: 'it is the business that owns the system (its people use the system in roles such as shop assistant)' },
      { label: 'Booking details', kind: 'data', why: 'it is data that moves through the system, not a user of it' },
    ],
    actorWhy: {
      a1: 'riders book bikes',
      a2: 'mechanics log repairs',
      a3: 'shop assistants book bikes for riders who walk in',
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
    actors: { a1: 'Member', a2: 'Librarian', a3: 'Volunteer' },
    useCases: { u1: 'Borrow item', u2: 'Send due date email', u3: 'Pay overdue fine', u4: 'Add new item' },
    scenario:
      'Ridgeway Community Library in Sale wants a library loans system. Members borrow books and games at a self-service kiosk, and volunteers at the front desk lend items to members who need help. Every loan sends the member an email with the due date. A member who has an overdue fine must pay it while borrowing, before the loan goes through. Librarians add new items to the collection. Ridgeway Community Library is run by a committee of local residents.',
    always: 'Every loan sends a due date email.',
    sometimes: 'A fine is paid only when the member has one.',
    notActors: [
      { label: 'Library loans system', kind: 'system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Self-service kiosk', kind: 'device', why: 'it is a device members use to reach the system (the member is the actor)' },
      { label: 'Ridgeway Community Library', kind: 'organisation', why: 'it is the organisation that owns the system (its people use the system in roles such as librarian)' },
      { label: 'Book', kind: 'data', why: 'books are items the system keeps records about, not users of it' },
    ],
    actorWhy: {
      a1: 'members borrow items',
      a2: 'librarians add new items',
      a3: 'volunteers lend items to members at the front desk',
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
    actors: { a1: 'Camper', a2: 'Ranger', a3: 'Booking officer' },
    useCases: { u1: 'Book campsite', u2: 'Pay deposit', u3: 'Book powered site', u4: 'Record site check' },
    scenario:
      'Wombat Ridge Camping Ground in Halls Gap wants a campsite booking system. Campers book sites online, and the booking officer books sites for campers who phone. Every booking includes paying a deposit. Campers with caravans can choose a powered site when they book. The system shows campers a campsite map. Rangers record a check of each site on a tablet after campers leave. The regional tourism office promotes the camping ground but has no access to bookings.',
    always: 'Every booking includes paying a deposit.',
    sometimes: 'A powered site is booked only by campers who need power.',
    notActors: [
      { label: 'Campsite booking system', kind: 'system', why: 'it is the system itself, drawn as the boundary' },
      { label: 'Tablet', kind: 'device', why: 'it is a device rangers use to reach the system (the ranger is the actor)' },
      { label: 'The regional tourism office', kind: 'organisation', why: 'it is an organisation with no access to bookings, so it never interacts with the system' },
      { label: 'Campsite map', kind: 'data', why: 'it is information the system shows, not a user of it' },
    ],
    actorWhy: {
      a1: 'campers book sites',
      a2: 'rangers record site checks',
      a3: 'the booking officer books sites for campers who phone',
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

/**
 * The errors: an actor inside the boundary; an association between two actors; <<includes>> for a
 * step that happens only sometimes; <<extends>> for a step that always happens; and a relationship
 * of the right type drawn the wrong way (<<includes>> pointing into the base use case, or
 * <<extends>> pointing out of it, the 2025 examination's most-chosen wrong answer).
 */
export type UseCaseError = 'actor-inside' | 'actor-actor' | 'includes-optional' | 'extends-always' | 'includes-reversed' | 'extends-reversed';
export const USE_CASE_ERRORS: readonly UseCaseError[] = ['actor-inside', 'actor-actor', 'includes-optional', 'extends-always', 'includes-reversed', 'extends-reversed'];

/** Highlight keys for the diagram's elements: an actor's id, or a link's `from->to`. */
export const LINK_KEYS = {
  a1u1: 'a1->u1',
  u1u2: 'u1->u2',
  u3u1: 'u3->u1',
  a3u1: 'a3->u1',
  a2u4: 'a2->u4',
  /** The errors' links: between two actors, and u1 and u2 or u1 and u3 the other way round. */
  a1a2: 'a1->a2',
  u1u3: 'u1->u3',
  u2u1: 'u2->u1',
} as const;

type Link = UseCaseDiagram['links'][number];

/** The link between u1 and u2: <<includes>> from the base, unless an error changes it. */
function mainLink(error: UseCaseError | null): Link {
  if (error === 'extends-always') return { from: 'u2', to: 'u1', type: 'extends' };
  if (error === 'includes-reversed') return { from: 'u2', to: 'u1', type: 'includes' };
  return { from: 'u1', to: 'u2', type: 'includes' };
}

/** The link between u1 and u3: <<extends>> into the base, unless an error changes it. */
function optionalLink(error: UseCaseError | null): Link {
  if (error === 'includes-optional') return { from: 'u1', to: 'u3', type: 'includes' };
  if (error === 'extends-reversed') return { from: 'u1', to: 'u3', type: 'extends' };
  return { from: 'u3', to: 'u1', type: 'extends' };
}

/**
 * The system's diagram, correct or with one error. Associations are plain lines (no arrowheads);
 * <<includes>> points from the base use case to the included one, and <<extends>> from the
 * extending use case to the base.
 */
export function diagramFor(sys: UseCaseSystem, error: UseCaseError | null, id = `usecase-${sys.id}`): UseCaseDiagram {
  const actors = (['a1', 'a2', 'a3'] as const).map((slot) => {
    const at = error === 'actor-inside' && slot === 'a2' ? A2_INSIDE : ACTOR_AT[slot];
    return { id: slot, label: sys.actors[slot], x: at.x, y: at.y };
  });
  const useCases = (['u1', 'u2', 'u3', 'u4'] as const).map((slot) => ({ id: slot, label: sys.useCases[slot], ...USE_CASE_AT[slot] }));
  const links: Link[] = [
    { from: 'a1', to: 'u1', type: 'association' },
    mainLink(error),
    optionalLink(error),
    { from: 'a3', to: 'u1', type: 'association' },
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

/**
 * The `dfd` bank: six invented Australian businesses, each written for the same hand-laid Level 1
 * DFD layout and its matching context diagram. The layout (coordinates below, no auto-layout):
 *
 *   e1 entity          p1 process 1        d1 store
 *   d2 store           p2 process 2        e2 entity
 *   d3 store           p3 process 3        e3 entity
 *
 * Every business follows the same story: a customer (e1) makes a request that process 1 checks
 * against reference data (d1) and records (d2); process 2 fulfils it with a staff member (e2);
 * process 3 settles it with an outside organisation (e3) and records the result (d3). Labels,
 * flow names and the injected convention errors vary by business; a seed can also mirror the
 * layout left to right.
 *
 * Process labels are verb phrases. Each business also has noun labels for its processes (for the
 * "process named with a noun" error), chosen so their first word can't be read as a verb, and
 * labels for the flows the other errors add.
 */

export const ENTITY_SLOTS = ['e1', 'e2', 'e3'] as const;
export const PROCESS_SLOTS = ['p1', 'p2', 'p3'] as const;
export const STORE_SLOTS = ['d1', 'd2', 'd3'] as const;
export const FLOW_SLOTS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11'] as const;

export type EntitySlot = (typeof ENTITY_SLOTS)[number];
export type ProcessSlot = (typeof PROCESS_SLOTS)[number];
export type StoreSlot = (typeof STORE_SLOTS)[number];
export type NodeSlot = EntitySlot | ProcessSlot | StoreSlot;
export type FlowSlot = (typeof FLOW_SLOTS)[number];

export interface DfdSystem {
  id: string;
  org: string;
  /** The context diagram's single process. */
  system: string;
  entities: Record<EntitySlot, string>;
  processes: Record<ProcessSlot, string>;
  /** Noun names for each process, for the "process named with a noun" error. */
  nouns: Record<ProcessSlot, string>;
  stores: Record<StoreSlot, string>;
  flows: Record<FlowSlot, string>;
  /** Labels for the flows the errors add. */
  wrong: {
    /** A flow between e2 and e3, in the direction given. */
    entityEntity: { from: 'e2' | 'e3'; label: string };
    /** d2 straight to e1. */
    storeToCustomer: string;
    /** d1 straight to e2. */
    storeToStaff: string;
    /** d2 straight to d3. */
    storeToStore: string;
  };
}

export const SYSTEMS: readonly DfdSystem[] = [
  {
    id: 'cafe',
    org: 'Saltbush Café in Mildura',
    system: 'Online ordering system',
    entities: { e1: 'Customer', e2: 'Kitchen staff', e3: 'Payment gateway' },
    processes: { p1: 'Take order', p2: 'Prepare order', p3: 'Take payment' },
    nouns: { p1: 'Customer orders', p2: 'Kitchen dockets', p3: 'Card payments' },
    stores: { d1: 'Menu', d2: 'Orders', d3: 'Payments' },
    flows: {
      f1: 'order_details',
      f2: 'order_confirmation',
      f3: 'menu_items',
      f4: 'new_order',
      f5: 'order_record',
      f6: 'kitchen_docket',
      f7: 'order_ready',
      f8: 'order_total',
      f9: 'payment_request',
      f10: 'payment_result',
      f11: 'payment_record',
    },
    wrong: { entityEntity: { from: 'e3', label: 'payment_result' }, storeToCustomer: 'order_record', storeToStaff: 'menu_items', storeToStore: 'order_total' },
  },
  {
    id: 'bikes',
    org: 'Ridgeline Bike Hire in Bright',
    system: 'Bike hire system',
    entities: { e1: 'Rider', e2: 'Workshop staff', e3: 'Payment gateway' },
    processes: { p1: 'Book bike', p2: 'Prepare bike', p3: 'Take deposit' },
    nouns: { p1: 'Rider bookings', p2: 'Workshop jobs', p3: 'Payment receipts' },
    stores: { d1: 'Bikes', d2: 'Bookings', d3: 'Deposits' },
    flows: {
      f1: 'booking_request',
      f2: 'booking_confirmed',
      f3: 'bike_availability',
      f4: 'new_booking',
      f5: 'booking_details',
      f6: 'preparation_list',
      f7: 'bike_ready',
      f8: 'hire_charge',
      f9: 'deposit_request',
      f10: 'deposit_result',
      f11: 'deposit_record',
    },
    wrong: { entityEntity: { from: 'e3', label: 'deposit_result' }, storeToCustomer: 'booking_details', storeToStaff: 'bike_list', storeToStore: 'hire_charge' },
  },
  {
    id: 'garden',
    org: 'Tallowood Garden Supplies in Geelong',
    system: 'Online order system',
    entities: { e1: 'Customer', e2: 'Warehouse staff', e3: 'Courier' },
    processes: { p1: 'Take order', p2: 'Pack order', p3: 'Arrange delivery' },
    nouns: { p1: 'Customer orders', p2: 'Parcels', p3: 'Delivery dockets' },
    stores: { d1: 'Products', d2: 'Orders', d3: 'Deliveries' },
    flows: {
      f1: 'order_details',
      f2: 'order_confirmation',
      f3: 'product_details',
      f4: 'new_order',
      f5: 'order_record',
      f6: 'pick_list',
      f7: 'order_packed',
      f8: 'parcel_details',
      f9: 'pickup_request',
      f10: 'tracking_number',
      f11: 'delivery_record',
    },
    wrong: { entityEntity: { from: 'e2', label: 'parcel_details' }, storeToCustomer: 'order_record', storeToStaff: 'product_details', storeToStore: 'delivery_address' },
  },
  {
    id: 'swim',
    org: 'Kookaburra Swim School in Wodonga',
    system: 'Enrolment system',
    entities: { e1: 'Parent', e2: 'Swim instructor', e3: 'Payment gateway' },
    processes: { p1: 'Enrol student', p2: 'Allocate class', p3: 'Collect fees' },
    nouns: { p1: 'Student enrolments', p2: 'Class lists', p3: 'Term fees' },
    stores: { d1: 'Classes', d2: 'Enrolments', d3: 'Fee payments' },
    flows: {
      f1: 'enrolment_form',
      f2: 'enrolment_confirmed',
      f3: 'class_details',
      f4: 'new_enrolment',
      f5: 'enrolment_details',
      f6: 'class_list',
      f7: 'available_times',
      f8: 'term_fee',
      f9: 'payment_request',
      f10: 'payment_result',
      f11: 'fee_record',
    },
    wrong: { entityEntity: { from: 'e3', label: 'payment_result' }, storeToCustomer: 'enrolment_details', storeToStaff: 'class_details', storeToStore: 'term_fee' },
  },
  {
    id: 'vet',
    org: 'Bluegum Vet Clinic in Bairnsdale',
    system: 'Appointment system',
    entities: { e1: 'Pet owner', e2: 'Vet', e3: 'Pet insurer' },
    processes: { p1: 'Book appointment', p2: 'Record consultation', p3: 'Lodge claim' },
    nouns: { p1: 'Appointment bookings', p2: 'Consultation notes', p3: 'Insurance claims' },
    stores: { d1: 'Vet rosters', d2: 'Appointments', d3: 'Claims' },
    flows: {
      f1: 'appointment_request',
      f2: 'appointment_time',
      f3: 'vet_availability',
      f4: 'new_appointment',
      f5: 'appointment_details',
      f6: 'daily_list',
      f7: 'consultation_notes',
      f8: 'consultation_fee',
      f9: 'claim_details',
      f10: 'claim_outcome',
      f11: 'claim_record',
    },
    wrong: { entityEntity: { from: 'e2', label: 'consultation_notes' }, storeToCustomer: 'appointment_details', storeToStaff: 'vet_roster', storeToStore: 'consultation_fee' },
  },
  {
    id: 'mechanic',
    org: 'Redgum Auto Repairs in Shepparton',
    system: 'Service booking system',
    entities: { e1: 'Car owner', e2: 'Mechanic', e3: 'Parts supplier' },
    processes: { p1: 'Book service', p2: 'Allocate job', p3: 'Order parts' },
    nouns: { p1: 'Workshop bookings', p2: 'Job sheets', p3: 'Parts invoices' },
    stores: { d1: 'Service prices', d2: 'Jobs', d3: 'Parts orders' },
    flows: {
      f1: 'service_request',
      f2: 'booking_confirmed',
      f3: 'service_price',
      f4: 'new_job',
      f5: 'job_details',
      f6: 'job_sheet',
      f7: 'parts_list',
      f8: 'parts_needed',
      f9: 'parts_order',
      f10: 'delivery_date',
      f11: 'parts_order_record',
    },
    wrong: { entityEntity: { from: 'e2', label: 'parts_list' }, storeToCustomer: 'job_details', storeToStaff: 'service_price', storeToStore: 'parts_needed' },
  },
];

// ---------------------------------------------------------------------------
// Layout: explicit coordinates
// ---------------------------------------------------------------------------

export const DFD_WIDTH = 770;
/** External entities are a little wider than the default, so "Payment gateway" fits on one line. */
export const ENTITY_W = 144;
export const DFD_HEIGHT = 450;

export const NODE_AT: Record<NodeSlot, { x: number; y: number }> = {
  e1: { x: 100, y: 70 },
  p1: { x: 390, y: 80 },
  d1: { x: 670, y: 70 },
  d2: { x: 100, y: 232 },
  p2: { x: 390, y: 235 },
  e2: { x: 670, y: 235 },
  d3: { x: 100, y: 400 },
  p3: { x: 390, y: 400 },
  e3: { x: 670, y: 400 },
};

/** The flows of a correct Level 1 DFD, by slot. */
export const FLOW_ENDS: Record<FlowSlot, { from: NodeSlot; to: NodeSlot }> = {
  f1: { from: 'e1', to: 'p1' },
  f2: { from: 'p1', to: 'e1' },
  f3: { from: 'd1', to: 'p1' },
  f4: { from: 'p1', to: 'd2' },
  f5: { from: 'd2', to: 'p2' },
  f6: { from: 'p2', to: 'e2' },
  f7: { from: 'e2', to: 'p2' },
  f8: { from: 'p2', to: 'p3' },
  f9: { from: 'p3', to: 'e3' },
  f10: { from: 'e3', to: 'p3' },
  f11: { from: 'p3', to: 'd3' },
};

export const CONTEXT_WIDTH = 700;
export const CONTEXT_HEIGHT = 400;
export const CONTEXT_SYSTEM_AT = { x: 380, y: 200 };
export const CONTEXT_ENTITY_AT: Record<EntitySlot, { x: number; y: number }> = {
  e1: { x: 96, y: 200 },
  e2: { x: 600, y: 80 },
  e3: { x: 600, y: 320 },
};

/** The flows a context diagram shows: every DFD flow with an external entity at one end. */
export const CONTEXT_FLOWS: readonly FlowSlot[] = ['f1', 'f2', 'f6', 'f7', 'f9', 'f10'];

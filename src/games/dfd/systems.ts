/**
 * The `dfd` bank: six invented Australian businesses, each written for the same hand-laid Level 1
 * DFD layout and its matching context diagram. The layout (coordinates below, no auto-layout):
 *
 *   e1 entity          p1 process          d1 store
 *   d2 store           p2 process          e2 entity
 *   d3 store           p3 process          e3 entity
 *
 * Every business follows the same story: a customer (e1) makes a request that p1 checks against
 * reference data (d1, which p1 also updates) and records (d2); p2 fulfils it with a staff member
 * (e2), reading the result p3 stored (d3); p3 settles it with an outside organisation (e3) and
 * records the result (d3). So the correct diagram keeps every rule in VCAA's outcome-specific
 * requirements: each process and each data store has at least one input and one output, no
 * process sends out a flow named like one it receives, every entity sends or receives data, and
 * no two flows cross. Labels, flow names and the injected errors vary by business; a seed also
 * picks one of four views of the layout (mirrored left to right, flipped top to bottom, both, or
 * neither).
 *
 * Processes and data stores are known by name alone, as in VCAA's diagrams: no process numbers and
 * no store ids. Process names are verb phrases.
 */

export const ENTITY_SLOTS = ['e1', 'e2', 'e3'] as const;
export const PROCESS_SLOTS = ['p1', 'p2', 'p3'] as const;
export const STORE_SLOTS = ['d1', 'd2', 'd3'] as const;
export const FLOW_SLOTS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13'] as const;

export type EntitySlot = (typeof ENTITY_SLOTS)[number];
export type ProcessSlot = (typeof PROCESS_SLOTS)[number];
export type StoreSlot = (typeof STORE_SLOTS)[number];
export type NodeSlot = EntitySlot | ProcessSlot | StoreSlot;
export type FlowSlot = (typeof FLOW_SLOTS)[number];

export interface DfdSystem {
  id: string;
  org: string;
  /** The context diagram's system. */
  system: string;
  entities: Record<EntitySlot, string>;
  processes: Record<ProcessSlot, string>;
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
    /** e2 straight to d1 (the 2025 examination's error: an entity writing to a store). */
    staffToStore: string;
    /** d2 straight to d3. */
    storeToStore: string;
    /** e1 to p2, a sound flow drawn where it crosses p1's flow to d2. */
    crossing: string;
  };
}

export const SYSTEMS: readonly DfdSystem[] = [
  {
    id: 'cafe',
    org: 'Saltbush Café in Mildura',
    system: 'Online ordering system',
    entities: { e1: 'Customer', e2: 'Kitchen staff', e3: 'Payment gateway' },
    processes: { p1: 'Take order', p2: 'Prepare order', p3: 'Take payment' },
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
      f12: 'sold_out_items',
      f13: 'paid_orders',
    },
    wrong: {
      entityEntity: { from: 'e3', label: 'payment_result' },
      storeToCustomer: 'order_record',
      storeToStaff: 'menu_items',
      staffToStore: 'sold_out_items',
      storeToStore: 'order_total',
      crossing: 'special_requests',
    },
  },
  {
    id: 'bikes',
    org: 'Ridgeline Bike Hire in Bright',
    system: 'Bike hire system',
    entities: { e1: 'Rider', e2: 'Workshop staff', e3: 'Payment gateway' },
    processes: { p1: 'Book bike', p2: 'Prepare bike', p3: 'Take deposit' },
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
      f12: 'bike_booked',
      f13: 'deposit_status',
    },
    wrong: {
      entityEntity: { from: 'e3', label: 'deposit_result' },
      storeToCustomer: 'booking_details',
      storeToStaff: 'bike_list',
      staffToStore: 'bike_condition',
      storeToStore: 'hire_charge',
      crossing: 'rider_height',
    },
  },
  {
    id: 'garden',
    org: 'Tallowood Garden Supplies in Geelong',
    system: 'Online order system',
    entities: { e1: 'Customer', e2: 'Warehouse staff', e3: 'Courier' },
    processes: { p1: 'Take order', p2: 'Pack order', p3: 'Arrange delivery' },
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
      f12: 'stock_reserved',
      f13: 'delivery_label',
    },
    wrong: {
      entityEntity: { from: 'e2', label: 'parcel_details' },
      storeToCustomer: 'order_record',
      storeToStaff: 'product_details',
      staffToStore: 'stock_count',
      storeToStore: 'delivery_address',
      crossing: 'gift_message',
    },
  },
  {
    id: 'swim',
    org: 'Kookaburra Swim School in Wodonga',
    system: 'Enrolment system',
    entities: { e1: 'Parent', e2: 'Swim instructor', e3: 'Payment gateway' },
    processes: { p1: 'Enrol student', p2: 'Allocate class', p3: 'Collect fees' },
    stores: { d1: 'Classes', d2: 'Enrolments', d3: 'Fee payments' },
    flows: {
      f1: 'enrolment_form',
      f2: 'confirmation',
      f3: 'class_details',
      f4: 'new_enrolment',
      f5: 'enrolment_details',
      f6: 'class_list',
      f7: 'available_times',
      f8: 'term_fee',
      f9: 'payment_request',
      f10: 'payment_result',
      f11: 'fee_record',
      f12: 'place_taken',
      f13: 'fee_status',
    },
    wrong: {
      entityEntity: { from: 'e3', label: 'payment_result' },
      storeToCustomer: 'enrolment_details',
      storeToStaff: 'class_details',
      staffToStore: 'class_times',
      storeToStore: 'term_fee',
      crossing: 'swimming_level',
    },
  },
  {
    id: 'vet',
    org: 'Bluegum Vet Clinic in Bairnsdale',
    system: 'Appointment system',
    entities: { e1: 'Pet owner', e2: 'Vet', e3: 'Pathology lab' },
    processes: { p1: 'Book appointment', p2: 'Record consultation', p3: 'Order tests' },
    stores: { d1: 'Vet rosters', d2: 'Appointments', d3: 'Test results' },
    flows: {
      f1: 'booking_request',
      f2: 'appointment_time',
      f3: 'vet_availability',
      f4: 'new_appointment',
      f5: 'visit_details',
      f6: 'daily_list',
      f7: 'consultation_notes',
      f8: 'test_request',
      f9: 'sample_details',
      f10: 'lab_report',
      f11: 'result_record',
      f12: 'slot_taken',
      f13: 'past_results',
    },
    wrong: {
      entityEntity: { from: 'e2', label: 'consultation_notes' },
      storeToCustomer: 'visit_details',
      storeToStaff: 'vet_roster',
      staffToStore: 'roster_change',
      storeToStore: 'tests_needed',
      crossing: 'symptoms',
    },
  },
  {
    id: 'mechanic',
    org: 'Redgum Auto Repairs in Shepparton',
    system: 'Service booking system',
    entities: { e1: 'Car owner', e2: 'Mechanic', e3: 'Parts supplier' },
    processes: { p1: 'Book service', p2: 'Allocate job', p3: 'Order parts' },
    stores: { d1: 'Workshop bays', d2: 'Jobs', d3: 'Parts orders' },
    flows: {
      f1: 'service_request',
      f2: 'booking_confirmed',
      f3: 'bay_availability',
      f4: 'new_job',
      f5: 'job_details',
      f6: 'job_sheet',
      f7: 'parts_list',
      f8: 'parts_needed',
      f9: 'parts_order',
      f10: 'delivery_date',
      f11: 'parts_order_record',
      f12: 'bay_booked',
      f13: 'parts_arrival',
    },
    wrong: {
      entityEntity: { from: 'e2', label: 'parts_list' },
      storeToCustomer: 'job_details',
      storeToStaff: 'bay_list',
      staffToStore: 'bay_status',
      storeToStore: 'parts_needed',
      crossing: 'fault_description',
    },
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
  d2: { x: 100, y: 262 },
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
  f12: { from: 'p1', to: 'd1' },
  f13: { from: 'd3', to: 'p2' },
};

/**
 * Where the two labels sit when the crossing error is drawn (e1 to p2, across p1 to d2), so that
 * neither hides the point where the lines cross: the added flow's just below the start of its
 * line, clear of the labels on the pair of flows between e1 and p1, and the crossed flow's
 * towards d2.
 */
export const CROSSING_LABELS = { added: { x: 160, y: 140 }, crossed: { x: 184, y: 209 } } as const;

export const CONTEXT_WIDTH = 780;
export const CONTEXT_HEIGHT = 400;
export const CONTEXT_SYSTEM_AT = { x: 390, y: 200 };
/**
 * e2 and e3 sit 174 units in from the edge, so a label pinned beside the line between them (the
 * entity-to-entity error) fits on the canvas in every view.
 */
export const CONTEXT_ENTITY_AT: Record<EntitySlot, { x: number; y: number }> = {
  e1: { x: 100, y: 200 },
  e2: { x: CONTEXT_WIDTH - 174, y: 80 },
  e3: { x: CONTEXT_WIDTH - 174, y: 320 },
};

/** The flows a context diagram shows: every DFD flow with an external entity at one end. */
export const CONTEXT_FLOWS: readonly FlowSlot[] = ['f1', 'f2', 'f6', 'f7', 'f9', 'f10'];

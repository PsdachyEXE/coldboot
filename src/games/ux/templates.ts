/**
 * The `ux` mock-up bank: nine hand-laid app screens for invented organisations, drawn with the
 * 'mockup' figure kind from explicit coordinates. Each template can show some of the eight
 * weaknesses; building one with a weakness changes only the elements that weakness is about, so
 * the screen has exactly one. Built without a weakness, every screen is sound: actions are buttons
 * of a usable size, secrets are masked, card numbers show only their last four digits, files use a
 * standard format, and a form of several screens shows the user where they are.
 *
 * A seed varies the organisation, the wording and the details on each screen. Layouts are written
 * as left and top edges and converted to the centre points the schema uses. Phone screens are 320
 * units wide so they fit a 360 px phone without scrolling; desktop screens are 480 wide.
 */
import type { Mockup } from '../../content/schema';
import { textWidth } from '../../figures/text';
import { pick, type Rng } from '../prng';
import type { ScreenFacts, UxRole, Weakness } from './weakness';

type El = Mockup['elements'][number];

export interface Part {
  el: El;
  role: UxRole | null;
}

export interface UxScreen {
  template: string;
  weakness: Weakness | null;
  figure: Mockup;
  /** Parallel to figure.elements. */
  roles: (UxRole | null)[];
  /** One line above the mock-up: who uses the screen, and anything the weakness depends on. */
  scenario: string;
  facts: ScreenFacts;
}

interface Built {
  /** Screen name for the figure title, e.g. "Book a court". */
  screen: string;
  width: number;
  height: number;
  parts: Part[];
  scenario: string;
  facts: Omit<ScreenFacts, 'buttons' | 'device' | 'flat'>;
}

export interface UxTemplate {
  id: string;
  device: 'phone' | 'desktop';
  weaknesses: readonly Weakness[];
  build(weakness: Weakness | null, rng: Rng): Built;
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

const PHONE_W = 320;
const DESK_W = 480;
/** Content edges: phone screens run from 24 to 296, desktop windows from 32 to 448. */
const L = 24;
const CW = 272;
const DL = 32;

const ACTION: UxRole = { kind: 'action' };

function box(type: El['type'], left: number, top: number, w: number, h: number, text?: string, opts: { note?: string; role?: UxRole } = {}): Part {
  const el: El = { type, x: left + w / 2, y: top + h / 2, w, h };
  if (text !== undefined) el.text = text;
  if (opts.note) el.note = opts.note;
  return { el, role: opts.role ?? null };
}

/** A label box as wide as its text plus room for a note's callout at its top-right corner. */
function labelWidth(text: string): number {
  return Math.ceil((textWidth(text) + 16) / 4) * 4;
}

function label(text: string, left: number, top: number, opts: { note?: string; role?: UxRole } = {}): Part {
  return box('label', left, top, labelWidth(text), 20, text, opts);
}

function frame(title: string, width: number, height: number): Part {
  return box('window', 8, 8, width - 16, height - 16, title);
}

/** An action: a button, or (flat-action) the same words as plain text, with a note saying what it does. */
function action(text: string, left: number, top: number, w: number, h: number, flat: boolean, does: string): Part {
  if (!flat) return box('button', left, top, w, h, text, { role: ACTION });
  return box('label', left, top + (h - 20) / 2, labelWidth(text), 20, text, { role: ACTION, note: does });
}

/** A − and + stepper centred on `cy`: 44-unit buttons, or 20-unit ones for tiny-targets. */
function stepper(left: number, cy: number, value: string, tiny: boolean, note: string): Part[] {
  if (tiny) {
    return [
      box('button', left, cy - 10, 20, 20, '−', { role: ACTION }),
      box('label', left + 24, cy - 10, 20, 20, value),
      box('button', left + 46, cy - 10, 20, 20, '+', { role: ACTION, note }),
    ];
  }
  return [
    box('button', left, cy - 22, 44, 44, '−', { role: ACTION }),
    box('label', left + 56, cy - 10, 24, 20, value),
    box('button', left + 92, cy - 22, 44, 44, '+', { role: ACTION }),
  ];
}

const DOTS = (n: number) => '•'.repeat(n);

// ---------------------------------------------------------------------------
// The bank
// ---------------------------------------------------------------------------

const court: UxTemplate = {
  id: 'court',
  device: 'phone',
  weaknesses: ['flat-action', 'full-card', 'tiny-targets'],
  build(weakness, rng) {
    const org = pick(rng, [
      { name: 'Wattle Park Tennis Club', app: 'Wattle Park Tennis' },
      { name: 'Riverbend Tennis Club', app: 'Riverbend Tennis' },
      { name: 'Kurrajong Tennis Club', app: 'Kurrajong Tennis' },
    ]);
    const day = pick(rng, ['Saturday', 'Sunday', 'Wednesday']);
    const times = pick(rng, [
      ['8:00 am', '9:00 am', '10:00 am'],
      ['4:00 pm', '5:00 pm', '6:00 pm'],
      ['6:00 pm', '7:00 pm', '8:00 pm'],
    ]);
    const card = pick(rng, [
      { full: '4556 7375 8689 4821', last4: '4821' },
      { full: '5217 2940 1183 0937', last4: '0937' },
      { full: '4024 0071 5236 5516', last4: '5516' },
    ]);
    const height = 424;
    const parts: Part[] = [
      frame(org.app, PHONE_W, height),
      box('heading', L, 48, 200, 28, 'Book a court'),
      label('Day', L, 88),
      box('dropdown', L, 110, CW, 36, day),
      label('Time', L, 158),
      box('list', L, 180, CW, 72, times.join('\n'), { note: 'Only times still free are listed.' }),
      label('Players', L, 276),
      ...stepper(120, 286, '2', weakness === 'tiny-targets', 'The − and + buttons are about 3 mm across on the phone.'),
      label(weakness === 'full-card' ? `Pay with card ${card.full}` : `Pay with card ${DOTS(4)} ${card.last4}`, L, 328, { role: { kind: 'card' } }),
      action('Book now', L, 360, CW, 44, weakness === 'flat-action', 'Tapping this text books the court.'),
    ];
    return {
      screen: 'Book a court',
      width: PHONE_W,
      height,
      parts,
      scenario: `Members of ${org.name} book courts in the club's phone app.`,
      facts: { card: { last4: card.last4 }, small: { name: 'The − and + buttons', size: 'about 3 mm' } },
    };
  },
};

const library: UxTemplate = {
  id: 'library',
  device: 'desktop',
  weaknesses: ['flat-action', 'secret-shown'],
  build(weakness, rng) {
    const org = pick(rng, ['Eastgate Libraries', 'Two Rivers Regional Library', 'Bluestone Shire Libraries']);
    const number = pick(rng, ['2300 1184 5521', '2300 4417 0263', '2300 9052 7718']);
    const password = pick(rng, ['Wombat!2026', 'Platypus#77', 'Koala-Tree-9']);
    const height = 344;
    const parts: Part[] = [
      frame(org, DESK_W, height),
      box('heading', DL, 48, 300, 28, 'Sign in to your account'),
      label('Library card number', DL, 90),
      box('textbox', DL, 112, 260, 36, number, { note: 'The number on the back of the library card.' }),
      label('Password', DL, 160),
      // The note is the same either way: it says the box holds what was typed, not a hint.
      box('textbox', DL, 182, 260, 36, weakness === 'secret-shown' ? password : DOTS(password.length), {
        role: { kind: 'secret' },
        note: 'The member has typed their password here.',
      }),
      action('Sign in', DL, 238, 120, 40, weakness === 'flat-action', 'Clicking this text signs the member in.'),
      label('Forgotten your password? Ask at the desk.', DL, 296),
    ];
    return {
      screen: 'Sign in',
      width: DESK_W,
      height,
      parts,
      scenario: `Members of ${org} sign in on the library's website to renew their loans, often on the library's shared computers.`,
      facts: { secret: { label: 'Password', noun: 'password' } },
    };
  },
};

const members: UxTemplate = {
  id: 'members',
  device: 'desktop',
  weaknesses: ['flat-action', 'closed-export'],
  build(weakness, rng) {
    const org = pick(rng, [
      { name: 'Kookaburra Rowing Club', app: 'MemberBase', ext: '.mbx' },
      { name: 'Corio Bay Sailing Club', app: 'ClubKeeper', ext: '.ckp' },
      { name: 'Gumnut Netball Association', app: 'TeamRoll', ext: '.trl' },
    ]);
    const closed = weakness === 'closed-export';
    const height = 320;
    const parts: Part[] = [
      frame(org.app, DESK_W, height),
      box('heading', DL, 48, 240, 28, 'Export members'),
      label('Members to export', DL, 90),
      box('list', DL, 112, 220, 96, 'All members\nSenior members\nJunior members\nLife members'),
      label('Include', 288, 90),
      box('checkbox', 288, 116, 160, 20, 'Contact details'),
      box('checkbox', 288, 146, 160, 20, 'Membership type'),
      box('checkbox', 288, 176, 160, 20, 'Payments made'),
      label('Save as', DL, 228),
      box('dropdown', DL, 250, 280, 36, closed ? `${org.app} file (${org.ext})` : 'CSV file (.csv)', {
        role: { kind: 'format', direction: 'export' },
        note: closed ? `${org.ext} files open only in ${org.app}.` : 'Spreadsheet programs open CSV files.',
      }),
      action('Export', 336, 250, 112, 36, weakness === 'flat-action', 'Clicking this text saves the file.'),
    ];
    return {
      screen: 'Export members',
      width: DESK_W,
      height,
      parts,
      scenario: `${org.name}'s secretary uses ${org.app} to send the member list to the treasurer, who keeps the club's accounts in a spreadsheet program.`,
      facts: {
        format: {
          direction: 'export',
          app: org.app,
          ext: org.ext,
          open: 'CSV',
          other: "the treasurer's spreadsheet program",
          fix: 'A fix: offer a standard format such as CSV, which spreadsheet programs open.',
        },
      },
    };
  },
};

const roll: UxTemplate = {
  id: 'roll',
  device: 'desktop',
  weaknesses: ['flat-action', 'closed-import'],
  build(weakness, rng) {
    const org = pick(rng, [
      { name: 'Mount Ridley College', app: 'RollCall', ext: '.rlx' },
      { name: 'Lakeside Secondary College', app: 'ClassMate', ext: '.cmt' },
      { name: 'Yarra Flats High School', app: 'MarkBook', ext: '.mbk' },
    ]);
    const group = pick(rng, ['9B Science', '10A English', '8C Maths']);
    const closed = weakness === 'closed-import';
    // Either of the two actions may be the one drawn as plain text.
    const flat = weakness === 'flat-action' ? pick(rng, ['Browse', 'Import']) : null;
    const height = 320;
    const parts: Part[] = [
      frame(org.app, DESK_W, height),
      box('heading', DL, 48, 260, 28, 'Import a class list'),
      label('Class', DL, 90),
      box('dropdown', DL, 112, 200, 36, group),
      label('File', DL, 160),
      box('textbox', DL, 182, 280, 36, 'Choose a file'),
      action('Browse', 336, 182, 112, 36, flat === 'Browse', 'Clicking this text opens the file list.'),
      label('File type', DL, 230),
      box('dropdown', DL, 252, 280, 36, closed ? `${org.app} file (${org.ext}) only` : 'CSV file (.csv)', {
        role: { kind: 'format', direction: 'import' },
        note: 'The student system exports class lists as CSV files.',
      }),
      action('Import', 336, 252, 112, 36, flat === 'Import', 'Clicking this text imports the file.'),
    ];
    return {
      screen: 'Import a class list',
      width: DESK_W,
      height,
      parts,
      scenario: `Teachers at ${org.name} mark the roll in ${org.app}. Each term they import their class lists from the school's student system, which exports CSV files.`,
      facts: {
        format: {
          direction: 'import',
          app: org.app,
          ext: org.ext,
          open: 'CSV',
          other: "the school's student system",
          fix: `A fix: let ${org.app} import CSV files, the format the student system exports.`,
        },
      },
    };
  },
};

const bakery: UxTemplate = {
  id: 'bakery',
  device: 'phone',
  weaknesses: ['flat-action', 'hidden-tap', 'tiny-targets'],
  build(weakness, rng) {
    const org = pick(rng, [
      { name: 'Silky Oak Bakery', app: 'Silky Oak Bakery' },
      { name: 'Banksia Bakehouse', app: 'Banksia Bakehouse' },
      { name: 'Tuart Street Bakery', app: 'Tuart Street Bakery' },
    ]);
    const item = pick(rng, [
      { name: 'Sourdough loaf', price: '$9.50 each' },
      { name: 'Apple turnover', price: '$5.20 each' },
      { name: 'Lamington', price: '$4.80 each' },
    ]);
    const hidden = weakness === 'hidden-tap';
    // Without the Ingredients button, the price sits under the photo and what follows moves up.
    const y = hidden ? -20 : 0;
    const height = 404 + y;
    const parts: Part[] = [
      frame(org.app, PHONE_W, height),
      box('heading', L, 48, 200, 28, item.name),
      box('image', L, 88, CW, 112, 'Photo', hidden ? { role: ACTION, note: 'Tapping the photo shows the ingredients.' } : {}),
      ...(hidden ? [] : [box('button', L, 208, 136, 40, 'Ingredients', { role: ACTION })]),
      label(item.price, hidden ? L : 176, hidden ? 212 : 218),
      label('Quantity', L, 276 + y),
      ...stepper(120, 286 + y, '1', weakness === 'tiny-targets', 'The − and + buttons are about 3 mm across on the phone.'),
      action('Add to order', L, 336 + y, CW, 44, weakness === 'flat-action', 'Tapping this text adds the item to the order.'),
    ];
    return {
      screen: item.name,
      width: PHONE_W,
      height,
      parts,
      scenario: `Customers of ${org.name} order in the bakery's phone app. Many check the ingredients before they order.`,
      facts: {
        photo: { name: 'photo', does: 'shows the ingredients', cue: 'Ingredients' },
        small: { name: 'The − and + buttons', size: 'about 3 mm' },
      },
    };
  },
};

const signup: UxTemplate = {
  id: 'signup',
  device: 'phone',
  weaknesses: ['flat-action', 'long-form'],
  build(weakness, rng) {
    const org = pick(rng, [
      { name: 'Southbank Swim School', app: 'Southbank Swim' },
      { name: 'Mallee Youth Choir', app: 'Mallee Youth Choir' },
      { name: 'Ironbark Junior Football Club', app: 'Ironbark Juniors' },
    ]);
    const long = weakness === 'long-form';
    const screens = long ? 10 : 3;
    // Without the progress label the fields move up, so its absence leaves no gap.
    const y = long ? -28 : 0;
    const height = 400 + y;
    const parts: Part[] = [
      frame(org.app, PHONE_W, height),
      box('heading', L, 48, 200, 28, 'Your details', { role: { kind: 'form', screens }, note: `Screen 2 of ${screens} in the sign-up form.` }),
      ...(long ? [] : [label(`Step 2 of ${screens}`, L, 84, { role: { kind: 'progress' } })]),
      label('Given name', L, 112 + y),
      box('textbox', L, 134 + y, CW, 36),
      label('Family name', L, 182 + y),
      box('textbox', L, 204 + y, CW, 36),
      label('Date of birth', L, 252 + y),
      box('textbox', L, 274 + y, 160, 36, 'dd/mm/yyyy'),
      box('button', L, 330 + y, 120, 44, 'Back', { role: ACTION }),
      action('Next', 176, 330 + y, 120, 44, weakness === 'flat-action', 'Tapping this text opens the next screen.'),
    ];
    return {
      screen: 'Your details',
      width: PHONE_W,
      height,
      parts,
      scenario: `Families enrol with ${org.name} in its phone app, usually on the go.`,
      facts: { form: { screens, step: 2 } },
    };
  },
};

const clockOn: UxTemplate = {
  id: 'clock-on',
  device: 'phone',
  weaknesses: ['flat-action', 'secret-shown', 'tiny-targets'],
  build(weakness, rng) {
    const org = pick(rng, ['Riverina Fresh Foods', 'Coastline Aged Care', 'Ranges Hardware']);
    const staff = pick(rng, ['4417', '2086', '3391']);
    const pin = pick(rng, ['7302', '5918', '6047']);
    const tiny = weakness === 'tiny-targets';
    // Keys 1 to 9 in three rows, then 0 in the middle.
    const size = tiny ? { w: 24, h: 20, gapX: 32, gapY: 28, top: 236 } : { w: 80, h: 40, gapX: 96, gapY: 48, top: 232 };
    const keys: Part[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit, i) => {
      const row = i === 9 ? 3 : Math.floor(i / 3);
      const col = i === 9 ? 1 : i % 3;
      const note = tiny && digit === '3' ? 'Each key is about 4 mm across on the tablet.' : undefined;
      return box('button', L + col * size.gapX, size.top + row * size.gapY, size.w, size.h, digit, { role: ACTION, note });
    });
    const actionTop = size.top + 3 * size.gapY + size.h + 16;
    const height = actionTop + 44 + 24;
    const parts: Part[] = [
      frame('Staff clock-on', PHONE_W, height),
      box('heading', L, 48, 200, 28, 'Clock on'),
      label('Staff number', L, 88),
      box('textbox', L, 110, CW, 36, staff),
      label('PIN', L, 158),
      box('textbox', L, 180, CW, 36, weakness === 'secret-shown' ? pin : DOTS(4), { role: { kind: 'secret' }, note: 'The staff member has typed their PIN here.' }),
      ...keys,
      action('Clock on', L, actionTop, CW, 44, weakness === 'flat-action', 'Tapping this text clocks the staff member on.'),
    ];
    return {
      screen: 'Clock on',
      width: PHONE_W,
      height,
      parts,
      scenario: `Staff at ${org} clock on at a shared tablet beside the staff entrance, often with other staff waiting behind them.`,
      facts: { secret: { label: 'PIN', noun: 'PIN' }, small: { name: 'The number keys', size: 'about 4 mm' } },
    };
  },
};

const tickets: UxTemplate = {
  id: 'tickets',
  device: 'phone',
  weaknesses: ['flat-action', 'full-card', 'closed-export'],
  build(weakness, rng) {
    const org = pick(rng, [
      { name: 'Bellarine Folk Festival', app: 'Folk Fest', ext: '.fft' },
      { name: 'Grampians Jazz Weekend', app: 'Jazz Days', ext: '.jzd' },
      { name: 'Tamar Valley Food Fair', app: 'Food Fair', ext: '.tvf' },
    ]);
    const order = pick(rng, ['2 adult tickets, Saturday', '1 adult ticket, Sunday', '2 child tickets, Friday']);
    const card = pick(rng, [
      { full: '4556 7375 8689 9855', last4: '9855' },
      { full: '5389 6140 2271 3064', last4: '3064' },
      { full: '4916 3308 7745 1202', last4: '1202' },
    ]);
    const closed = weakness === 'closed-export';
    const height = 320;
    const parts: Part[] = [
      frame(org.app, PHONE_W, height),
      box('heading', L, 48, 220, 28, 'Order confirmed'),
      label(order, L, 88),
      label(weakness === 'full-card' ? `Paid with card ${card.full}` : `Paid with card ${DOTS(4)} ${card.last4}`, L, 116, { role: { kind: 'card' } }),
      label('Add to your calendar', L, 156),
      box('dropdown', L, 178, 204, 36, closed ? `${org.app} file (${org.ext})` : 'Calendar file (.ics)', {
        role: { kind: 'format', direction: 'export' },
        note: closed ? `${org.ext} files open only in the ${org.app} app.` : 'Calendar apps import .ics files.',
      }),
      box('button', 240, 178, 56, 36, 'Add', { role: ACTION }),
      action('Email my tickets', L, 250, CW, 44, weakness === 'flat-action', 'Tapping this text emails the tickets.'),
    ];
    return {
      screen: 'Order confirmed',
      width: PHONE_W,
      height,
      parts,
      scenario: `Visitors buy tickets to the ${org.name} in its phone app, then add the event to the calendar app on their phone.`,
      facts: {
        card: { last4: card.last4 },
        format: {
          direction: 'export',
          app: org.app,
          ext: org.ext,
          open: 'a calendar file (.ics)',
          other: "the phone's calendar app",
          fix: 'A fix: offer a standard calendar file (.ics), which calendar apps import.',
        },
      },
    };
  },
};

const report: UxTemplate = {
  id: 'report',
  device: 'phone',
  weaknesses: ['flat-action', 'hidden-tap', 'long-form'],
  build(weakness, rng) {
    const org = pick(rng, [
      { name: 'Wirrawee Shire Council', app: 'Wirrawee Fix It' },
      { name: 'Coolart Shire Council', app: 'Coolart Report' },
      { name: 'Tallong City Council', app: 'Tallong Report' },
    ]);
    const problem = pick(rng, ['Pothole', 'Broken streetlight', 'Graffiti']);
    const long = weakness === 'long-form';
    const hidden = weakness === 'hidden-tap';
    const screens = long ? 10 : 2;
    // Nothing leaves a gap: without the progress label or the photo button, what follows moves up.
    const y = long ? -28 : 0;
    const next = 412 + y - (hidden ? 56 : 0);
    const height = next + 44 + 24;
    const parts: Part[] = [
      frame(org.app, PHONE_W, height),
      box('heading', L, 48, 220, 28, 'Report a problem', { role: { kind: 'form', screens }, note: `Screen 1 of ${screens} in the report form.` }),
      ...(long ? [] : [label(`Step 1 of ${screens}`, L, 84, { role: { kind: 'progress' } })]),
      label('Problem', L, 112 + y),
      box('dropdown', L, 134 + y, CW, 36, problem),
      label('Where is it?', L, 182 + y),
      box('textbox', L, 204 + y, CW, 36, 'Street address'),
      box('image', L, 252 + y, CW, 96, 'Photo', hidden ? { role: ACTION, note: 'Tapping the photo area opens the camera.' } : {}),
      ...(hidden ? [] : [box('button', L, 356 + y, 160, 40, 'Add a photo', { role: ACTION })]),
      action('Next', 176, next, 120, 44, weakness === 'flat-action', 'Tapping this text opens the next screen.'),
    ];
    return {
      screen: 'Report a problem',
      width: PHONE_W,
      height,
      parts,
      scenario: `Residents report problems such as potholes to ${org.name} in its phone app, often while standing in the street.`,
      facts: { form: { screens, step: 1 }, photo: { name: 'photo area', does: 'opens the camera', cue: 'Add a photo' } },
    };
  },
};

export const TEMPLATES: readonly UxTemplate[] = [court, library, members, roll, bakery, signup, clockOn, tickets, report];

export function templateById(id: string): UxTemplate {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`unknown ux template ${id}`);
  return t;
}

export function templatesFor(weakness: Weakness): UxTemplate[] {
  return TEMPLATES.filter((t) => t.weaknesses.includes(weakness));
}

/** Builds a template's screen, with one weakness or none. */
export function buildScreen(template: UxTemplate, weakness: Weakness | null, rng: Rng): UxScreen {
  if (weakness && !template.weaknesses.includes(weakness)) throw new Error(`ux template ${template.id} can't show ${weakness}`);
  const b = template.build(weakness, rng);
  const elements = b.parts.map((p) => p.el);
  const flat = b.parts.find((p) => p.role?.kind === 'action' && p.el.type === 'label');
  const buttons = b.parts.filter((p) => p.role?.kind === 'action' && p.el.type === 'button' && (p.el.text ?? '').length > 1).map((p) => p.el.text!);
  const hasNotes = elements.some((e) => e.note);
  const figure: Mockup = {
    id: `ux-${template.id}`,
    kind: 'mockup',
    title: `Mock-up of the ${b.screen} screen`,
    ...(hasNotes ? { caption: "The numbered notes are the designer's." } : {}),
    width: b.width,
    height: b.height,
    elements,
  };
  return {
    template: template.id,
    weakness,
    figure,
    roles: b.parts.map((p) => p.role),
    scenario: b.scenario,
    facts: { ...b.facts, device: template.device, buttons, ...(flat ? { flat: flat.el.text } : {}) },
  };
}

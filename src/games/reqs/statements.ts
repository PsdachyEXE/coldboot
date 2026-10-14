/**
 * The `reqs` bank: statements written by six invented Australian organisations about software
 * they want built. Each statement has exactly one reading: a functional requirement (something
 * the solution does, including the data it takes in, the output it produces and how it
 * manipulates and validates data), a non-functional requirement (a quality the finished solution
 * must have), a constraint (a condition that limits the project or the options open to it) or
 * scope (what the solution will and won't cover).
 *
 * Non-functional types are the five qualities the PSM specifications name: usability,
 * reliability, portability, robustness and maintainability. Response-time targets are left out:
 * the PSM names speed of processing as a technical constraint, so such a line has two readings.
 * Security is left out too: a security statement reads too easily as a function (a login screen,
 * encryption), as a technical constraint (the PSM lists security there) or as a legal one. A
 * robustness line is about coping with unexpected input or actions, and a reliability line about
 * working, or being available, time after time; a line about surviving a dropped connection
 * without losing data reads as either, so the bank has none.
 *
 * Constraint kinds are the PSM specifications' five: economic (cost and time), technical (such as
 * the equipment available and compatibility with it), social (the users' level of expertise),
 * legal (intellectual property, ownership and privacy of data) and usability (accessibility,
 * usefulness, ease of use). U3O2-KK06 lists the first four; usability is the PSM's addition, so
 * it can be a constraint as well as a non-functional requirement.
 *
 * Every reason line teaches the distinction, above all constraint versus non-functional
 * requirement: a constraint limits the project (money, time, law, equipment, the users it must
 * suit); a non-functional requirement is a quality of the finished solution that testing can
 * measure.
 */

export const CATEGORIES = ['functional', 'non-functional', 'constraint', 'scope'] as const;
export type Category = (typeof CATEGORIES)[number];

/** In the PSM specifications' order. */
export const NFR_TYPES = ['usability', 'reliability', 'portability', 'robustness', 'maintainability'] as const;
export type NfrType = (typeof NFR_TYPES)[number];

/** The qualities VCAA's own worked example uses; easy rounds ask only about these. */
export const CORE_NFR_TYPES: readonly NfrType[] = ['reliability', 'usability', 'portability'];

/** In the PSM specifications' order. */
export const CONSTRAINT_KINDS = ['economic', 'technical', 'social', 'legal', 'usability'] as const;
export type ConstraintKind = (typeof CONSTRAINT_KINDS)[number];

/** The four kinds U3O2-KK06 lists; easy rounds ask only about these. */
export const CORE_CONSTRAINT_KINDS: readonly ConstraintKind[] = ['economic', 'technical', 'social', 'legal'];

export interface Organisation {
  id: string;
  name: string;
  project: string;
}

export interface Statement {
  id: string;
  org: string;
  text: string;
  category: Category;
  type?: NfrType;
  /** For a constraint: its kind. */
  kind?: ConstraintKind;
  /** One line on why it belongs in its category. */
  why: string;
  /** For a non-functional requirement: why it concerns its quality. */
  typeWhy?: string;
  /** For a constraint: why it is that kind. */
  kindWhy?: string;
  /** A classic confusion (a constraint that sounds like a quality, a scope line that sounds like a feature): more of these on --hard. */
  tricky?: boolean;
}

export const ORGANISATIONS: readonly Organisation[] = [
  { id: 'library', name: 'Ironbark Community Library in Castlemaine', project: 'a loans app' },
  { id: 'physio', name: 'Riverbend Physiotherapy in Wangaratta', project: 'an appointment booking system' },
  { id: 'freight', name: 'Southern Cross Freight in Dandenong', project: 'a delivery tracking system' },
  { id: 'surf', name: 'Tidewater Surf Life Saving Club in Torquay', project: 'a patrol roster app' },
  { id: 'school', name: 'Karingal Primary School in Frankston', project: 'an excursion permission app' },
  { id: 'bakery', name: 'Bellbird Bakery in Daylesford', project: 'an online ordering website' },
];

const NFR_WHY = 'It sets a quality the finished solution must have, which testing can measure, rather than something it does: a non-functional requirement.';
const ROBUST_WHY = "It names no task the solution performs; it sets how well the solution must cope when something unexpected happens, a quality testing can measure. That makes it non-functional.";
const DEADLINE_KIND = 'A deadline limits the time available, and the PSM counts time, with cost, as an economic constraint.';
const BUDGET_KIND = 'A limit on money is an economic constraint (cost).';

export const STATEMENTS: readonly Statement[] = [
  // Ironbark Community Library: a loans app
  {
    id: 'library-f1',
    org: 'library',
    text: 'The app must let members search the catalogue by title, author or subject.',
    category: 'functional',
    why: 'Searching the catalogue is something the app does with its data, so it is a functional requirement.',
  },
  {
    id: 'library-f2',
    org: 'library',
    text: 'The app must email a member a reminder two days before a loan is due.',
    category: 'functional',
    why: 'Sending a reminder is an output the app produces. The two days says when it happens, not how well, so it is still functional.',
    tricky: true,
  },
  {
    id: 'library-n1',
    org: 'library',
    text: 'A member using the app for the first time must be able to reserve a book within three minutes, without help.',
    category: 'non-functional',
    type: 'usability',
    why: NFR_WHY,
    typeWhy: 'How quickly a new user can complete a task without help measures how easy the app is to learn and use: usability.',
  },
  {
    id: 'library-n2',
    org: 'library',
    text: 'The app must run on Android phones, iPhones and in a desktop web browser.',
    category: 'non-functional',
    type: 'portability',
    why: 'It asks for a quality of the finished app, the range of platforms it runs on, rather than a limit the library is stuck with: a non-functional requirement.',
    typeWhy: 'Running on several different platforms is portability.',
  },
  {
    id: 'library-n3',
    org: 'library',
    text: 'The app must not crash, whatever a member types into the search box.',
    category: 'non-functional',
    type: 'robustness',
    why: "It doesn't name a particular check the app makes on the input; it sets a quality: the app copes with anything typed without failing. That makes it non-functional.",
    typeWhy: 'Coping with unexpected or invalid input without crashing is robustness.',
    tricky: true,
  },
  {
    id: 'library-n4',
    org: 'library',
    text: 'It must be possible to add a new kind of loan, such as tool loans, by changing only one module of the code.',
    category: 'non-functional',
    type: 'maintainability',
    why: 'It describes a quality of how the solution is built, not a feature members use: a non-functional requirement.',
    typeWhy: 'How easily developers can change and extend the code is maintainability.',
  },
  {
    id: 'library-c1',
    org: 'library',
    text: 'The library has $8000 to spend on developing the app.',
    category: 'constraint',
    kind: 'economic',
    why: 'A budget limits the project. It is not something the app does or a quality it has, so it is a constraint.',
    kindWhy: BUDGET_KIND,
  },
  {
    id: 'library-c2',
    org: 'library',
    text: 'The app must be finished before the new library wing opens on 1 March.',
    category: 'constraint',
    kind: 'economic',
    why: 'A deadline limits when the project must be delivered. It says nothing about what the app does or how well, so it is a constraint.',
    kindWhy: DEADLINE_KIND,
  },
  {
    id: 'library-c3',
    org: 'library',
    text: 'Some members are vision impaired and find small text hard to read.',
    category: 'constraint',
    kind: 'usability',
    why: 'It describes users the design must allow for, which limits how the app can be designed. It sets no target for the finished app and names nothing it does, so it is a constraint.',
    kindWhy: "Users' accessibility needs are a usability constraint: the PSM's usability constraints cover accessibility, usefulness and ease of use.",
    tricky: true,
  },
  {
    id: 'library-c4',
    org: 'library',
    text: 'Many of the volunteers who staff the loans desk have only basic computer skills.',
    category: 'constraint',
    kind: 'social',
    why: "The volunteers' skills limit how complex the app can be. The line names nothing the app does and sets no target for it, so it is a constraint.",
    kindWhy: "The users' level of expertise is a social constraint.",
  },
  {
    id: 'library-s1',
    org: 'library',
    text: 'The app will handle loans and reservations, but it will not collect overdue fines.',
    category: 'scope',
    why: 'It sets the boundary of the solution: what the app will cover and what it will not. That is scope.',
  },
  // Riverbend Physiotherapy: an appointment booking system
  {
    id: 'physio-f1',
    org: 'physio',
    text: 'The system must let patients cancel an appointment online up to 24 hours before it starts.',
    category: 'functional',
    why: 'Cancelling an appointment is something the system does. The 24 hours is a rule of that function, not a quality, so it is functional.',
    tricky: true,
  },
  {
    id: 'physio-f2',
    org: 'physio',
    text: "The system must print each physiotherapist's list of appointments for the day.",
    category: 'functional',
    why: 'Producing a printed list is an output the system must create, so it is a functional requirement.',
  },
  {
    id: 'physio-n1',
    org: 'physio',
    text: 'The system must keep working, without crashing, if a patient presses the Book button several times in a row.',
    category: 'non-functional',
    type: 'robustness',
    why: ROBUST_WHY,
    typeWhy: 'Coping with something unexpected a user does, such as pressing a button again and again, without crashing is robustness.',
  },
  {
    id: 'physio-n2',
    org: 'physio',
    text: 'The booking system must run through a full month of clinic days without a single failure.',
    category: 'non-functional',
    type: 'reliability',
    why: NFR_WHY,
    typeWhy: 'Working correctly, day after day, without failing is reliability.',
  },
  {
    id: 'physio-n3',
    org: 'physio',
    text: 'Reception staff must be able to book a returning patient in with no more than four clicks.',
    category: 'non-functional',
    type: 'usability',
    why: NFR_WHY,
    typeWhy: 'How few steps a user needs to complete a task measures how easy the system is to use: usability.',
  },
  {
    id: 'physio-c1',
    org: 'physio',
    text: 'Patient health information must be collected, stored and shared only as Victorian health records law allows.',
    category: 'constraint',
    kind: 'legal',
    why: 'A law the clinic must obey limits how the system can be built and used. The clinic has no choice about it, so it is a constraint.',
    kindWhy: 'A law about the privacy of data is a legal constraint.',
    tricky: true,
  },
  {
    id: 'physio-c2',
    org: 'physio',
    text: "The system must run on the clinic's three existing Windows laptops.",
    category: 'constraint',
    kind: 'technical',
    why: 'It limits the solution to hardware the clinic already owns, so it is a constraint. Portability would ask for the system to run on several different platforms.',
    kindWhy: 'The equipment available, and staying compatible with it, is a technical constraint.',
    tricky: true,
  },
  {
    id: 'physio-c3',
    org: 'physio',
    text: 'Some patients have limited use of their hands after an injury and cannot use a mouse.',
    category: 'constraint',
    kind: 'usability',
    why: 'It describes users the design must allow for, which limits how the system can be designed. It sets no target for the finished system and names nothing it does, so it is a constraint.',
    kindWhy: "Users' accessibility needs are a usability constraint: the PSM's usability constraints cover accessibility, usefulness and ease of use.",
    tricky: true,
  },
  {
    id: 'physio-s1',
    org: 'physio',
    text: 'Online payment is outside this project: patients will keep paying at the front desk.',
    category: 'scope',
    why: 'It states what the solution will not cover, a boundary on the project, so it is scope.',
  },
  // Southern Cross Freight: a delivery tracking system
  {
    id: 'freight-f1',
    org: 'freight',
    text: 'The system must record the time each parcel is scanned onto a truck.',
    category: 'functional',
    why: 'Recording a scan time is something the system does with its input, so it is a functional requirement.',
  },
  {
    id: 'freight-f2',
    org: 'freight',
    text: "The system must calculate each delivery's charge from the parcel's weight and the distance travelled.",
    category: 'functional',
    why: 'Calculating a charge is processing the system performs, so it is a functional requirement.',
  },
  {
    id: 'freight-f3',
    org: 'freight',
    text: "The system must produce a report of any driver's deliveries for any month in the past five years.",
    category: 'functional',
    why: 'Producing a report is an output the system creates. The five years says which data the report can cover, not how well the system works, so it is still functional.',
    tricky: true,
  },
  {
    id: 'freight-n1',
    org: 'freight',
    text: "The driver app must keep working, without crashing, when a driver scans a damaged barcode that can't be read.",
    category: 'non-functional',
    type: 'robustness',
    why: ROBUST_WHY,
    typeWhy: 'Coping with input it cannot use, such as an unreadable barcode, without crashing is robustness.',
  },
  {
    id: 'freight-n2',
    org: 'freight',
    text: 'The driver app must work on both Android and iOS phones.',
    category: 'non-functional',
    type: 'portability',
    why: NFR_WHY,
    typeWhy: 'Working on more than one operating system is portability.',
  },
  {
    id: 'freight-n3',
    org: 'freight',
    text: 'Each module must be documented well enough that another developer can find and fix a fault in it without help from the original developer.',
    category: 'non-functional',
    type: 'maintainability',
    why: 'It sets a quality of the solution for the people who will look after it, not a feature drivers use: a non-functional requirement.',
    typeWhy: 'How easily other developers can find and fix faults is maintainability.',
  },
  {
    id: 'freight-n4',
    org: 'freight',
    text: 'The tracking system must be available 24 hours a day, 7 days a week, because trucks run overnight.',
    category: 'non-functional',
    type: 'reliability',
    why: NFR_WHY,
    typeWhy: 'Being available whenever it is needed is reliability.',
  },
  {
    id: 'freight-c1',
    org: 'freight',
    text: 'Development must cost no more than $25 000.',
    category: 'constraint',
    kind: 'economic',
    why: 'A cost limit restricts the project, not the finished system, so it is a constraint.',
    kindWhy: BUDGET_KIND,
  },
  {
    id: 'freight-c2',
    org: 'freight',
    text: 'The system must be in use before the Christmas rush begins on 1 December.',
    category: 'constraint',
    kind: 'economic',
    why: 'A deadline limits when the project must be delivered. It is not a quality of the system, so it is a constraint.',
    kindWhy: DEADLINE_KIND,
  },
  {
    id: 'freight-c3',
    org: 'freight',
    text: 'The system must work with the barcode scanners the company already owns.',
    category: 'constraint',
    kind: 'technical',
    why: 'It limits the solution to equipment the company already has, so it is a constraint rather than a quality the company has chosen.',
    kindWhy: 'The equipment available, and staying compatible with it, is a technical constraint.',
    tricky: true,
  },
  {
    id: 'freight-s1',
    org: 'freight',
    text: 'The first version will cover deliveries in metropolitan Melbourne only; country runs will be added later.',
    category: 'scope',
    why: 'It draws a boundary around what this version of the solution covers, so it is scope.',
  },
  // Tidewater Surf Life Saving Club: a patrol roster app
  {
    id: 'surf-f1',
    org: 'surf',
    text: 'The app must let a patrol captain swap two members between patrols.',
    category: 'functional',
    why: 'Swapping members is an action the app performs, so it is a functional requirement.',
  },
  {
    id: 'surf-f2',
    org: 'surf',
    text: 'The app must send each member a text message when they are rostered on.',
    category: 'functional',
    why: 'Sending a message is an output the app produces, so it is a functional requirement.',
  },
  {
    id: 'surf-n1',
    org: 'surf',
    text: 'Members aged from 13 to 80 must be able to find their next patrol without reading any instructions.',
    category: 'non-functional',
    type: 'usability',
    why: NFR_WHY,
    typeWhy: 'Whether the intended users can use the app without instructions is usability.',
  },
  {
    id: 'surf-n2',
    org: 'surf',
    text: 'The roster must be available at any time of day throughout the patrol season, from October to April.',
    category: 'non-functional',
    type: 'reliability',
    why: NFR_WHY,
    typeWhy: 'Being available whenever it is needed is reliability.',
  },
  {
    id: 'surf-n3',
    org: 'surf',
    text: 'The app must run on phones, tablets and desktop computers without changes.',
    category: 'non-functional',
    type: 'portability',
    why: 'It asks for a quality of the finished app, running on many kinds of device, rather than tying it to equipment the club already has: a non-functional requirement.',
    typeWhy: 'Running on different kinds of device without changes is portability.',
  },
  {
    id: 'surf-c1',
    org: 'surf',
    text: 'The club can spend at most $3000 on the app, the money raised at its annual fundraiser.',
    category: 'constraint',
    kind: 'economic',
    why: 'A spending limit restricts the project, not what the app does or how well, so it is a constraint.',
    kindWhy: BUDGET_KIND,
  },
  {
    id: 'surf-c2',
    org: 'surf',
    text: "Most of the club's patrol captains have never used a smartphone app.",
    category: 'constraint',
    kind: 'social',
    why: "The captains' inexperience limits how complex the app can be. The line names nothing the app does and sets no target for it, so it is a constraint.",
    kindWhy: "The users' level of expertise is a social constraint.",
  },
  {
    id: 'surf-c3',
    org: 'surf',
    text: 'Several club members are colour-blind.',
    category: 'constraint',
    kind: 'usability',
    why: 'It describes users the design must allow for, which limits how the app can show information. It sets no target for the finished app, so it is a constraint.',
    kindWhy: "Users' accessibility needs are a usability constraint: the PSM's usability constraints cover accessibility, usefulness and ease of use.",
    tricky: true,
  },
  {
    id: 'surf-s1',
    org: 'surf',
    text: 'The app will manage patrol rosters, but not club membership fees.',
    category: 'scope',
    why: "It says what the solution will and won't cover, so it is scope.",
    tricky: true,
  },
  // Karingal Primary School: an excursion permission app
  {
    id: 'school-f1',
    org: 'school',
    text: 'The app must let a parent give or refuse permission for each excursion.',
    category: 'functional',
    why: "Recording a parent's answer is something the app does, so it is a functional requirement.",
  },
  {
    id: 'school-f2',
    org: 'school',
    text: 'The app must show a teacher which students do not yet have permission for an excursion.',
    category: 'functional',
    why: 'Producing that list is an output the app creates, so it is a functional requirement.',
  },
  {
    id: 'school-f3',
    org: 'school',
    text: "The app must check that a parent's mobile number has exactly 10 digits before saving it.",
    category: 'functional',
    why: 'Checking an input before it is saved is validation, something the app does with its data, so it is a functional requirement.',
    tricky: true,
  },
  {
    id: 'school-n1',
    org: 'school',
    text: 'A parent must be able to give permission in under one minute on their first try.',
    category: 'non-functional',
    type: 'usability',
    why: 'Giving permission is the function; the one-minute target on a first try sets how well it must work, a quality testing can measure. That makes it non-functional.',
    typeWhy: 'How quickly a first-time user can complete a task measures ease of use: usability.',
    tricky: true,
  },
  {
    id: 'school-n2',
    org: 'school',
    text: 'The app must stay available every school day from 7 am to 10 pm.',
    category: 'non-functional',
    type: 'reliability',
    why: NFR_WHY,
    typeWhy: 'Staying available whenever it is needed is reliability.',
  },
  {
    id: 'school-c1',
    org: 'school',
    text: "Students' personal information must be handled as Victorian privacy law requires of government schools.",
    category: 'constraint',
    kind: 'legal',
    why: 'A law the school must obey limits how the app can be built and used, so it is a constraint rather than a quality the school has chosen.',
    kindWhy: 'A law about the privacy of data is a legal constraint.',
    tricky: true,
  },
  {
    id: 'school-c2',
    org: 'school',
    text: 'The app must be ready for the first excursion of Term 1.',
    category: 'constraint',
    kind: 'economic',
    why: 'A deadline limits when the project must be delivered, so it is a constraint.',
    kindWhy: DEADLINE_KIND,
  },
  {
    id: 'school-c3',
    org: 'school',
    text: 'Many parents at the school have little experience using apps or websites.',
    category: 'constraint',
    kind: 'social',
    why: "The parents' inexperience limits how complex the app can be. The line names nothing the app does and sets no target for it, so it is a constraint.",
    kindWhy: "The users' level of expertise is a social constraint.",
  },
  {
    id: 'school-s1',
    org: 'school',
    text: 'The app will handle excursion permission only; it will not take payments for excursions.',
    category: 'scope',
    why: 'It sets the boundary of what the solution will cover, so it is scope.',
  },
  // Bellbird Bakery: an online ordering website
  {
    id: 'bakery-f1',
    org: 'bakery',
    text: 'The website must let customers order a cake for pick-up on a date they choose.',
    category: 'functional',
    why: 'Taking an order is something the website does, so it is a functional requirement.',
  },
  {
    id: 'bakery-f2',
    org: 'bakery',
    text: "The website must calculate an order's total, including GST.",
    category: 'functional',
    why: 'Calculating a total is processing the website performs, so it is a functional requirement.',
  },
  {
    id: 'bakery-n1',
    org: 'bakery',
    text: "The website must keep working, without losing the customer's order, if the Back button is pressed part-way through checkout.",
    category: 'non-functional',
    type: 'robustness',
    why: ROBUST_WHY,
    typeWhy: 'Coping with something unexpected the user does, without failing or losing data, is robustness.',
  },
  {
    id: 'bakery-n2',
    org: 'bakery',
    text: 'A returning customer must be able to repeat a previous order in three clicks or fewer.',
    category: 'non-functional',
    type: 'usability',
    why: NFR_WHY,
    typeWhy: 'How few steps a task takes measures how easy the website is to use: usability.',
  },
  {
    id: 'bakery-n3',
    org: 'bakery',
    text: 'The code must be structured so that another developer can add a new payment method without rewriting the existing modules.',
    category: 'non-functional',
    type: 'maintainability',
    why: 'It is a quality of how the code is built, not a feature customers see: a non-functional requirement.',
    typeWhy: 'How easily the code can be changed and extended is maintainability.',
  },
  {
    id: 'bakery-c1',
    org: 'bakery',
    text: 'The bakery can spend no more than $5000 on the website.',
    category: 'constraint',
    kind: 'economic',
    why: 'A budget limits the project. It is not a feature or a quality of the website, so it is a constraint.',
    kindWhy: BUDGET_KIND,
  },
  {
    id: 'bakery-c2',
    org: 'bakery',
    text: 'The website must fit within the storage of the web hosting plan the bakery already pays for.',
    category: 'constraint',
    kind: 'technical',
    why: 'It limits the website to the capacity the bakery already has, so it is a constraint rather than a quality of the website.',
    kindWhy: 'The capacity of the equipment available is a technical constraint.',
  },
  {
    id: 'bakery-c3',
    org: 'bakery',
    text: "Photos and recipes on the website must not breach anyone's copyright.",
    category: 'constraint',
    kind: 'legal',
    why: 'Copyright law limits what the website can use, whatever the bakery would like, so it is a constraint.',
    kindWhy: 'A law protecting intellectual property is a legal constraint.',
  },
  {
    id: 'bakery-s1',
    org: 'bakery',
    text: 'Wholesale orders from cafés are not part of this project.',
    category: 'scope',
    why: 'It states what the solution will not cover, so it is scope.',
  },
];

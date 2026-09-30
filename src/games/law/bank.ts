/**
 * The `law` bank, written by hand at the level of mainstream textbook summaries, never finer legal
 * detail. The rules the scenarios rely on:
 *
 * - Privacy Act 1988 (Cth), with the Australian Privacy Principles: binds Australian Government
 *   agencies, and private organisations with an annual turnover above $3 million, plus some smaller
 *   businesses such as health service providers. It doesn't cover state or local government.
 * - Privacy and Data Protection Act 2014 (Vic): binds the Victorian public sector (departments,
 *   councils, government schools) and the contracted service providers its contracts bind. Being
 *   based in Victoria doesn't bring a private business under it. Health information is left to
 *   the Health Records Act.
 * - Health Records Act 2001 (Vic): health information held by Victorian public and private sector
 *   organisations alike.
 * - Copyright Act 1968 (Cth): code, images and text are copyright works; reusing them needs the
 *   owner's permission or a licence, and being published online doesn't make them free to copy.
 *
 * Every scenario has exactly one best Act. Where two genuinely apply (a private Victorian health
 * provider comes under both the Privacy Act and the Health Records Act), the question asks for the
 * Victorian Act or the Commonwealth Act, and the feedback names both. Turnovers are stated and sit
 * far from $3 million, so no answer turns on the threshold. No real organisation is named.
 *
 * `facts` records what the story says, so the reasons offered in a "why" question are statements
 * that are plainly false for that scenario, plus the one true reason for its Act (the tests check
 * both).
 */

export const ACTS = ['privacy', 'pdp', 'health', 'copyright'] as const;
export type Act = (typeof ACTS)[number];

export const ACT_LABELS: Record<Act, string> = {
  privacy: 'Privacy Act 1988 (Cth)',
  pdp: 'Privacy and Data Protection Act 2014 (Vic)',
  health: 'Health Records Act 2001 (Vic)',
  copyright: 'Copyright Act 1968 (Cth)',
};

export type Sector = 'cth-agency' | 'vic-public' | 'vic-contractor' | 'private' | 'person';

export interface Facts {
  sector: Sector;
  /** Stated in the story for every private business. */
  turnoverAbove3m?: boolean;
  healthProvider?: boolean;
  healthInfo?: boolean;
  inVictoria?: boolean;
  /** The scenario is about reusing someone else's code, images or text. */
  reuse?: boolean;
}

export const REASON_KEYS = ['agency', 'turnover', 'health-provider', 'vic-public', 'vic-contractor', 'health-info', 'reuse'] as const;
export type ReasonKey = (typeof REASON_KEYS)[number];

export interface Reason {
  /** The Act this is a reason for. */
  act: Act;
  /** The reason as a statement about the scenario. */
  text: string;
  holds: (f: Facts) => boolean;
}

export const REASONS: Record<ReasonKey, Reason> = {
  agency: { act: 'privacy', text: 'An Australian Government agency holds the information.', holds: (f) => f.sector === 'cth-agency' },
  turnover: {
    act: 'privacy',
    text: 'A private business with an annual turnover above $3 million holds the information.',
    holds: (f) => f.sector === 'private' && f.turnoverAbove3m === true,
  },
  'health-provider': {
    act: 'privacy',
    text: "A health service provider holds the information, so its turnover doesn't matter.",
    holds: (f) => f.healthProvider === true,
  },
  'vic-public': { act: 'pdp', text: 'A Victorian public sector body holds the information.', holds: (f) => f.sector === 'vic-public' },
  'vic-contractor': {
    act: 'pdp',
    text: "A contractor holds the information under a contract that binds it to a Victorian public sector body's privacy obligations.",
    holds: (f) => f.sector === 'vic-contractor',
  },
  'health-info': { act: 'health', text: 'It is health information, held by an organisation in Victoria.', holds: (f) => f.healthInfo === true && f.inVictoria === true },
  reuse: {
    act: 'copyright',
    text: "Someone else's code, images or text is being reused, which needs permission or a licence.",
    holds: (f) => f.reuse === true,
  },
};

export type Level = 1 | 2 | 3;

export interface LawScenario {
  id: string;
  act: Act;
  story: string;
  /** The question: which Act (or which Victorian or Commonwealth Act) applies. */
  ask: string;
  facts: Facts;
  /** One line on why that Act applies (and, where two apply, the other one too). */
  why: string;
  level: Level;
}

export const SCENARIOS: readonly LawScenario[] = [
  // Privacy Act 1988 (Cth)
  {
    id: 'agency-portal',
    act: 'privacy',
    story: 'An Australian Government agency is building an online portal where people update their contact details and bank account numbers.',
    ask: 'Which Act governs how the agency handles this personal information?',
    facts: { sector: 'cth-agency' },
    why: 'The Privacy Act binds Australian Government agencies, and its Australian Privacy Principles set the rules for personal information.',
    level: 1,
  },
  {
    id: 'jobs-app',
    act: 'privacy',
    story: "An Australian Government department collects job seekers' names, addresses and work histories through a new app.",
    ask: 'Which Act governs how the department handles this personal information?',
    facts: { sector: 'cth-agency' },
    why: 'As an Australian Government agency, the department is bound by the Privacy Act and its Australian Privacy Principles.',
    level: 1,
  },
  {
    id: 'retailer-melbourne',
    act: 'privacy',
    story: "A national online clothing retailer based in Melbourne, with an annual turnover of about $60 million, stores customers' names, delivery addresses and order histories.",
    ask: 'Which Act governs how the retailer handles this customer information?',
    facts: { sector: 'private', turnoverAbove3m: true, inVictoria: true },
    why: "The Privacy Act covers private businesses with an annual turnover above $3 million. Being based in Victoria doesn't bring a private business under the Victorian Act, which binds the Victorian public sector.",
    level: 2,
  },
  {
    id: 'airline',
    act: 'privacy',
    story: "An airline booking app, run by a Sydney company with an annual turnover of $200 million, keeps passengers' names, passport numbers and phone numbers.",
    ask: 'Which Act governs how the company handles this personal information?',
    facts: { sector: 'private', turnoverAbove3m: true, inVictoria: false },
    why: 'The Privacy Act covers private businesses with an annual turnover above $3 million, and names, passport numbers and phone numbers are personal information.',
    level: 1,
  },
  {
    id: 'energy-retailer',
    act: 'privacy',
    story: "A Geelong electricity retailer with an annual turnover of $45 million adds a feature that stores customers' concession card numbers and home addresses.",
    ask: 'Which Act governs how the retailer handles this personal information?',
    facts: { sector: 'private', turnoverAbove3m: true, inVictoria: true },
    why: "A private business with an annual turnover above $3 million is covered by the Privacy Act. The Victorian Act binds the public sector, not private businesses in Victoria.",
    level: 2,
  },
  {
    id: 'supermarket',
    act: 'privacy',
    story: 'A national supermarket chain with an annual turnover in the billions launches a loyalty app that records every purchase each member makes.',
    ask: 'Which Act governs how the chain handles this information about its members?',
    facts: { sector: 'private', turnoverAbove3m: true, inVictoria: false },
    why: "The Privacy Act covers private businesses with an annual turnover above $3 million, and a member's purchase history is personal information.",
    level: 1,
  },
  {
    id: 'gp-wodonga',
    act: 'privacy',
    story: "A general practice in Wodonga, Victoria, with an annual turnover of about $900,000, stores patients' medical histories in a new booking app.",
    ask: 'Which Commonwealth Act covers how the practice handles this information, even though its turnover is under $3 million?',
    facts: { sector: 'private', turnoverAbove3m: false, healthProvider: true, healthInfo: true, inVictoria: true },
    why: 'The Privacy Act covers health service providers whatever their turnover. As a Victorian organisation holding health information, the practice must also follow the Health Records Act (Vic).',
    level: 3,
  },
  {
    id: 'physio-traralgon',
    act: 'privacy',
    story: 'A two-person physiotherapy practice in Traralgon, Victoria, with an annual turnover under $3 million, keeps treatment notes in a cloud app.',
    ask: 'Which Commonwealth Act applies to how the practice handles these notes?',
    facts: { sector: 'private', turnoverAbove3m: false, healthProvider: true, healthInfo: true, inVictoria: true },
    why: 'Health service providers are covered by the Privacy Act even when their turnover is small. The Health Records Act (Vic) applies to these notes as well.',
    level: 3,
  },
  // Privacy and Data Protection Act 2014 (Vic)
  {
    id: 'council-potholes',
    act: 'pdp',
    story: "A Victorian local council is building an app for residents to report potholes, which records each resident's name, phone number and address.",
    ask: 'Which Act governs how the council handles this personal information?',
    facts: { sector: 'vic-public', inVictoria: true },
    why: "Local councils are part of the Victorian public sector, which the Privacy and Data Protection Act binds. The Privacy Act doesn't cover state and local government.",
    level: 1,
  },
  {
    id: 'vic-department',
    act: 'pdp',
    story: "A Victorian Government department is moving its records of grant applicants' names and business addresses to a new system.",
    ask: 'Which Act governs how the department handles this personal information?',
    facts: { sector: 'vic-public', inVictoria: true },
    why: 'Victorian Government departments are part of the Victorian public sector, which the Privacy and Data Protection Act binds.',
    level: 1,
  },
  {
    id: 'state-school',
    act: 'pdp',
    story: "A Victorian government secondary school stores students' home addresses and parents' phone numbers in a new enrolment system.",
    ask: 'Which Act governs how the school handles this personal information?',
    facts: { sector: 'vic-public', inVictoria: true },
    why: 'A government school is part of the Victorian public sector, so the Privacy and Data Protection Act applies to this personal information.',
    level: 2,
  },
  {
    id: 'council-library',
    act: 'pdp',
    story: "A public library run by a Victorian council records borrowers' names, addresses and loan histories.",
    ask: 'Which Act governs how the library handles this personal information?',
    facts: { sector: 'vic-public', inVictoria: true },
    why: 'The library is run by a council, which is part of the Victorian public sector, so the Privacy and Data Protection Act binds it.',
    level: 2,
  },
  {
    id: 'parking-contractor',
    act: 'pdp',
    story: "A small Melbourne software company is contracted by a Victorian council to run its parking permit system. The contract binds the company to the council's privacy obligations for residents' details.",
    ask: "Which Victorian Act must the company follow when it handles residents' details under this contract?",
    facts: { sector: 'vic-contractor', turnoverAbove3m: false, inVictoria: true },
    why: 'The Privacy and Data Protection Act binds the Victorian public sector and the contracted service providers that its contracts bind.',
    level: 3,
  },
  {
    id: 'grants-contractor',
    act: 'pdp',
    story: "A small Bendigo IT firm is contracted by a Victorian Government department to build and host a system storing applicants' names and addresses, under a contract that binds it to the department's privacy obligations.",
    ask: 'Which Victorian Act binds the firm for this work?',
    facts: { sector: 'vic-contractor', turnoverAbove3m: false, inVictoria: true },
    why: "A contracted service provider to the Victorian public sector is bound by the Privacy and Data Protection Act through its contract. The details aren't health information, so the Health Records Act doesn't apply.",
    level: 3,
  },
  // Health Records Act 2001 (Vic)
  {
    id: 'public-hospital',
    act: 'health',
    story: "A public hospital in Melbourne is replacing the system that stores patients' diagnoses and test results.",
    ask: 'Which Victorian Act governs how the hospital handles these records?',
    facts: { sector: 'vic-public', healthProvider: true, healthInfo: true, inVictoria: true },
    why: 'Health information held in Victoria, by public or private organisations, comes under the Health Records Act, even though the hospital is part of the Victorian public sector.',
    level: 2,
  },
  {
    id: 'physio-ballarat',
    act: 'health',
    story: "A small private physiotherapy clinic in Ballarat is building an app that stores clients' injury histories and treatment notes.",
    ask: 'Which Victorian Act governs how the clinic handles this health information?',
    facts: { sector: 'private', turnoverAbove3m: false, healthProvider: true, healthInfo: true, inVictoria: true },
    why: 'The Health Records Act covers health information held by private as well as public organisations in Victoria. As a health service provider, the clinic is also covered by the Privacy Act (Cth).',
    level: 2,
  },
  {
    id: 'maternal-child',
    act: 'health',
    story: "A Victorian council's maternal and child health service records babies' weights, immunisations and developmental checks.",
    ask: 'Which Victorian Act governs these records?',
    facts: { sector: 'vic-public', healthProvider: true, healthInfo: true, inVictoria: true },
    why: 'These are health records held in Victoria, so the Health Records Act applies, even though a council runs the service.',
    level: 3,
  },
  {
    id: 'psychology',
    act: 'health',
    story: "A small private psychology practice in Geelong stores notes about clients' mental health in new practice software.",
    ask: 'Which Victorian Act governs how the practice handles these notes?',
    facts: { sector: 'private', turnoverAbove3m: false, healthProvider: true, healthInfo: true, inVictoria: true },
    why: "Information about a person's mental health is health information, which the Health Records Act covers for private as well as public organisations in Victoria. As a health service provider, the practice is also covered by the Privacy Act (Cth).",
    level: 2,
  },
  {
    id: 'pharmacy',
    act: 'health',
    story: "A small pharmacy in Mildura keeps customers' prescription records in its dispensing software.",
    ask: 'Which Victorian Act governs these records?',
    facts: { sector: 'private', turnoverAbove3m: false, healthProvider: true, healthInfo: true, inVictoria: true },
    why: 'Prescription records are health information, which the Health Records Act covers for private organisations in Victoria. As a health service provider, the pharmacy is also covered by the Privacy Act (Cth).',
    level: 1,
  },
  {
    id: 'dental',
    act: 'health',
    story: "A small dental clinic in Bendigo stores patients' treatment histories and dental images in a new system.",
    ask: 'Which Victorian Act governs how the clinic handles this information?',
    facts: { sector: 'private', turnoverAbove3m: false, healthProvider: true, healthInfo: true, inVictoria: true },
    why: 'Treatment histories are health information, so the Health Records Act applies to this private Victorian clinic. As a health service provider, it is also covered by the Privacy Act (Cth).',
    level: 1,
  },
  // Copyright Act 1968 (Cth)
  {
    id: 'blog-code',
    act: 'copyright',
    story: "Jess, a freelance developer, copies a sorting function from a stranger's blog into a client's app. The blog says nothing about reuse.",
    ask: 'Which Act decides whether Jess may reuse this code?',
    facts: { sector: 'person', reuse: true },
    why: "Code is a copyright work. The blog's author owns it, so Jess needs permission or a licence; being published online doesn't make it free to copy.",
    level: 1,
  },
  {
    id: 'splash-photo',
    act: 'copyright',
    story: "A Year 12 student uses a photographer's image, found through a web search, as the splash screen of his app without asking permission.",
    ask: 'Which Act does using the image without permission risk breaching?',
    facts: { sector: 'person', reuse: true },
    why: "Images are copyright works, so using one without the owner's permission or a licence can breach the Copyright Act.",
    level: 1,
  },
  {
    id: 'help-pages',
    act: 'copyright',
    story: "A small Bendigo start-up copies the wording of a competitor's help pages into its own app.",
    ask: 'Which Act does copying this text breach?',
    facts: { sector: 'private', turnoverAbove3m: false, reuse: true, inVictoria: true },
    why: "Written text is a copyright work, so copying it needs the owner's permission.",
    level: 1,
  },
  {
    id: 'council-photo',
    act: 'copyright',
    story: "A developer building a Victorian council's new app wants to use a photo from a tourism company's website.",
    ask: 'Which Act decides whether the council may use the photo?',
    facts: { sector: 'vic-public', reuse: true, inVictoria: true },
    why: "Photos are copyright works, so the council needs the owner's permission or a licence, public sector or not.",
    level: 3,
  },
  {
    id: 'chart-library',
    act: 'copyright',
    story: "A team building a public hospital's app wants to include an open-source charting library. Its licence allows reuse as long as the authors are acknowledged.",
    ask: "Which Act protects the library's code, so that it can be reused only on the licence's terms?",
    facts: { sector: 'vic-public', healthProvider: true, healthInfo: true, reuse: true, inVictoria: true },
    why: "The library's code is a copyright work, and its licence gives permission to reuse it on conditions, such as acknowledging the authors.",
    level: 2,
  },
  {
    id: 'copied-game',
    act: 'copyright',
    story: 'A small Geelong game studio finds that another company has copied the source code of its game and is selling it.',
    ask: "Which Act protects the studio's code?",
    facts: { sector: 'private', turnoverAbove3m: false, reuse: true, inVictoria: true },
    why: 'Source code is a copyright work, so copying and selling it without permission breaches the Copyright Act.',
    level: 2,
  },
  {
    id: 'bank-photo',
    act: 'copyright',
    story: "A developer at a national bank with an annual turnover in the billions copies a photo from a website into the bank's app without a licence.",
    ask: 'Which Act does using the photo without a licence breach?',
    facts: { sector: 'private', turnoverAbove3m: true, reuse: true, inVictoria: false },
    why: "The photo is a copyright work. The bank's size decides which privacy law covers it, but using someone else's photo is a copyright matter.",
    level: 2,
  },
];

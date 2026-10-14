/**
 * The `threat` bank, written by hand. All of it is defensive and recognition-level: each scenario
 * describes a weakness in an invented development environment, and the student chooses the
 * security control that best addresses it. Nothing here shows how to exploit a weakness.
 *
 * The controls are the six that U4O2-KK04 lists, named as it names them. Multi-factor
 * authentication and backups are Essential Eight strategies, not items in that list, so they are
 * never offered as controls here (a password-only login is a weakness in identity and access
 * management). Version control keeps the code's history for rolling back; it is never presented
 * as a backup. A scenario's `risk` names the U4O2-KK03 vulnerability or risk it shows, where it
 * shows one: that list says "including", so a weakness may fall outside it.
 *
 * Every scenario has one best control. Hard questions offer five of the six controls, so each
 * story says enough (often which controls the team already has) that the others are clearly
 * wrong for it. A control that could still reasonably be argued is listed in the scenario's
 * alsoHelps, at most one per scenario, and is never offered as its distractor.
 *
 * The Essential Eight list follows the eight mitigation strategies the outcome-specific
 * requirements name for Unit 4, in their order. The distractors are security measures that are
 * not among the eight: several are the study design's own security controls (U4O2-KK04) and
 * strategies (U4O2-KK10), and none is another name for one of the eight.
 */

export const CONTROLS = ['vcs', 'iam', 'encryption', 'review', 'patching', 'separate'] as const;
export type Control = (typeof CONTROLS)[number];

/** The U4O2-KK04 list items, word for word. */
export const CONTROL_LABELS: Record<Control, string> = {
  vcs: 'Version control and code repositories',
  iam: 'Robust identity and access management',
  encryption: 'Encryption',
  review: 'Code review',
  patching: 'Regular updates and patches to software',
  separate: 'Separated development, testing and production environments',
};

export const RISKS = ['apis', 'malware', 'unpatched', 'iam', 'mitm', 'insider', 'incidents', 'third-party', 'review', 'combined'] as const;
export type Risk = (typeof RISKS)[number];

/** The U4O2-KK03 list items, word for word. */
export const RISK_LABELS: Record<Risk, string> = {
  apis: 'use of application programming interfaces (APIs)',
  malware: 'malware',
  unpatched: 'unpatched software',
  iam: 'poor identity and access management practices',
  mitm: 'man-in-the-middle attacks',
  insider: 'insider threats',
  incidents: 'cyber security incidents',
  'third-party': 'risks present from software acquired by third parties',
  review: 'ineffective code review practices',
  combined: 'combined development, testing and production environments',
};

export interface ThreatScenario {
  id: string;
  control: Control;
  /** The U4O2-KK03 vulnerability or risk the scenario shows, when it shows one of them. */
  risk?: Risk;
  /** The weakness, in one or two sentences. */
  story: string;
  /** One line on why the control is the best fit. */
  why: string;
  /** A second control that could be argued for this scenario, so it is never a distractor. */
  alsoHelps?: readonly Control[];
}

export const SCENARIOS: readonly ThreatScenario[] = [
  // Version control and code repositories
  {
    id: 'emailed-zips',
    control: 'vcs',
    story: "Developers at a Geelong freight company share code by emailing zipped copies, and last week two of them overwrote each other's changes with no record of what was lost.",
    why: "A shared code repository under version control records every change and merges each person's work, so nothing is overwritten without a trace.",
  },
  {
    id: 'no-history',
    control: 'vcs',
    story: 'A developer spent a week restructuring the booking code, then found it no longer worked. No history of changes was kept, so there is no way back to the version that did.',
    why: "Version control keeps the code's history, so the team can roll back to the last working version. The history is for rolling back the code, though; it isn't a backup.",
  },
  {
    id: 'latest-copy',
    control: 'vcs',
    story: "Copies of an app's code sit on each developer's laptop and in a shared folder, and nobody can tell which copy is the latest, so fixes keep being made to old versions.",
    why: 'Version control keeps one code repository that records every change, so everyone works from the most recent version.',
  },
  {
    id: 'main-copy',
    control: 'vcs',
    story: "Developers at a Ballarat studio write each new feature straight into the one shared copy of the code, so one developer's half-finished feature broke the whole team's builds for two days.",
    why: 'A code repository lets each new feature be built on its own branch, so the shared code keeps working, and the branch is merged only once the feature is finished and reviewed.',
    alsoHelps: ['review'],
  },
  // Robust identity and access management
  {
    id: 'shared-admin',
    control: 'iam',
    risk: 'iam',
    story: 'All six developers at a Bendigo software firm log in to the build server with one shared administrator account and password, so nothing done on the server can be traced to a person.',
    why: 'Robust identity and access management gives each person their own account, so every action can be traced, and gives each account only the access its role needs.',
    alsoHelps: ['vcs'],
  },
  {
    id: 'leaver',
    control: 'iam',
    risk: 'iam',
    story: 'A contractor finished working for a Shepparton agency two months ago, but her account can still read and change the code of its products.',
    why: 'Robust identity and access management removes access as soon as people leave or change roles, so her account should have been disabled the day she finished.',
  },
  {
    id: 'all-admin',
    control: 'iam',
    risk: 'iam',
    story: 'Every developer at a Mildura start-up has administrator rights on every system, including the live customer database, although most of them only build web pages.',
    why: 'Under robust identity and access management, each person can reach only the data and systems their duties need, and administrator rights go only to those who must have them.',
    alsoHelps: ['separate'],
  },
  {
    id: 'phished',
    control: 'iam',
    risk: 'iam',
    story: "Developers reach a Warrnambool company's code repository from home with only a username and password, and one password was stolen in a phishing email.",
    why: "Robust identity and access management includes strong authentication, such as multi-factor authentication, so a stolen password on its own can't open the repository.",
  },
  // Encryption
  {
    id: 'stolen-laptop',
    control: 'encryption',
    story: "A developer's laptop holding a client's source code and contracts was stolen from a car. Its drive isn't encrypted, so whoever has it can read the files.",
    why: 'Encrypting the drive makes the files unreadable to anyone without the key, even if the drive is taken out and read in another computer.',
    alsoHelps: ['iam'],
  },
  {
    id: 'hotel-wifi',
    control: 'encryption',
    risk: 'mitm',
    story: "A developer sends code to the company's repository over hotel Wi-Fi using a connection that isn't encrypted, so anyone else on the network could read it on the way.",
    why: 'Encrypting data in transit means an attacker sitting between the developer and the repository sees only scrambled data.',
  },
  {
    id: 'plain-api',
    control: 'encryption',
    risk: 'apis',
    story: "A store's app sends each customer's name and address to a delivery company's API over a plain web connection that isn't encrypted.",
    why: 'Encrypting the connection to the API, for example with HTTPS, stops anyone between the app and the delivery company from reading the details.',
  },
  {
    id: 'leaked-records',
    control: 'encryption',
    risk: 'incidents',
    story: "In a cyber security incident, a copy of a clinic's booking database ended up on a public file-sharing site, and anyone could read every patient's name and appointment notes because they were stored as plain text.",
    why: "Encrypting stored data means a copied file can't be read without the key, so a leaked copy reveals nothing useful.",
    alsoHelps: ['iam'],
  },
  // Code review
  {
    id: 'unreviewed-merge',
    control: 'review',
    risk: 'review',
    story: 'A team runs its tests in a separate testing environment, but no one apart from the author reads a change before it is merged, and a change that quietly removed an input check reached users.',
    why: 'Code review has a second developer read every change before it is merged, catching mistakes such as a removed check that the tests missed.',
    alsoHelps: ['iam'],
  },
  {
    id: 'hidden-bypass',
    control: 'review',
    risk: 'insider',
    story: "A developer's change went live without a second person reading it, and it contained a hidden way for its author to skip the login screen.",
    why: 'Code review makes it much harder for anyone to slip unauthorised code in unnoticed, because another developer reads every change.',
    alsoHelps: ['iam'],
  },
  {
    id: 'contractor-code',
    control: 'review',
    risk: 'third-party',
    story: "An outside firm wrote a module for a Geelong credit union's app, and its code was added to the product after passing the testing team's checks, without anyone in-house reading it.",
    why: "Reviewing code acquired from a third party before it is merged catches flaws, and anything that shouldn't be there, that testing alone can miss.",
  },
  {
    id: 'rushed-review',
    control: 'review',
    risk: 'review',
    story: 'Developers add code written by an AI assistant to the product, and reviewers approve each change after a quick glance because the deadline is close.',
    why: 'Thorough code review checks every change, including code an AI assistant wrote, for flaws before it is merged, instead of waving it through.',
  },
  // Regular updates and patches to software
  {
    id: 'old-tools',
    control: 'patching',
    risk: 'unpatched',
    story: "The team's code editor and build tools haven't been updated for two years, and several have security fixes that were never installed.",
    why: 'Regular updates and patches install those fixes, closing flaws that attackers already know about.',
  },
  {
    id: 'old-library',
    control: 'patching',
    risk: 'third-party',
    story: 'An app still uses an old version of a third-party library with a publicly known flaw, although a fixed version came out months ago.',
    why: 'Updating the library to the fixed version closes a flaw that is public knowledge.',
  },
  {
    id: 'unsupported-os',
    control: 'patching',
    risk: 'unpatched',
    story: "The developers' laptops run an operating system version that has stopped receiving security updates.",
    why: 'Moving to a supported version and keeping it patched closes known flaws that would otherwise never be fixed.',
  },
  {
    id: 'ransomware',
    control: 'patching',
    risk: 'malware',
    story: "Ransomware got into a Bendigo firm's build server through a flaw in its file-sharing software, although a fix for that flaw had been available for six months.",
    why: 'Installing updates and patches promptly closes known flaws before malware can use them to get in.',
  },
  // Separated development, testing and production environments
  {
    id: 'live-edit',
    control: 'separate',
    risk: 'combined',
    story: 'At a Mildura online store, developers edit code directly on the web server that customers use, and try out new features there too.',
    why: 'Separated environments keep unfinished and untested code away from the live system, which then changes only through a controlled release.',
  },
  {
    id: 'test-live-db',
    control: 'separate',
    risk: 'combined',
    story: 'Because the team has only one environment, it tests its new billing module against the live customer database.',
    why: "A separate testing environment with its own test data keeps experiments away from real customers' records, which don't belong in development or testing at all.",
  },
  {
    id: 'live-update',
    control: 'separate',
    risk: 'combined',
    story: 'A small team develops, tests and runs its booking app on the same server, and an update installed there without being tested took the live site offline for an afternoon.',
    why: 'Separated environments let an update be tested away from the live system first, so a faulty one never reaches customers.',
    alsoHelps: ['vcs'],
  },
  {
    id: 'api-version',
    control: 'separate',
    risk: 'apis',
    story: "A shop switched its live app to a payment service's new API version without trying it anywhere first, and checkouts failed for a day.",
    why: 'A separate testing environment lets the team try the new API version before it goes live, so a change that breaks checkouts is caught there.',
    alsoHelps: ['vcs'],
  },
];

/** The eight mitigation strategies, in the outcome-specific requirements' order. */
export const ESSENTIAL_EIGHT = [
  'Patch applications',
  'Patch operating systems',
  'Multi-factor authentication',
  'Restrict administrative privileges',
  'Application control',
  'Restrict Microsoft Office macros',
  'User application hardening',
  'Regular backups',
] as const;

/** Security measures that are not among the eight: study design controls and strategies first. */
export const NOT_ESSENTIAL_EIGHT = [
  'Encryption',
  'Code review',
  'Version control and code repositories',
  'Separated development, testing and production environments',
  'Developer training focused on secure development',
  'Development of risk management plans',
  'Firewalls',
  'Antivirus software',
  'Penetration testing',
  'Network segmentation',
] as const;

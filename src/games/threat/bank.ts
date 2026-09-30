/**
 * The `threat` bank, written by hand. All of it is defensive and recognition-level: each scenario
 * describes a weakness in an invented development environment, and the student chooses the
 * control that best addresses it. Nothing here shows how to exploit a weakness.
 *
 * Every scenario has one best control. Controls that could reasonably be argued for a weakness
 * (for example version control for lost files, next to backups) are listed in ALSO_HELPS or a
 * scenario's alsoHelps and are never offered as its distractors, so the other options are
 * clearly wrong for it.
 *
 * The Essential Eight lists follow the Australian Cyber Security Centre's eight mitigation
 * strategies, named as content card c-u4o2-kk07-005 names them. The distractors are real security
 * measures that are not among the eight, chosen so that none is another name for one of them.
 */

export const CONTROLS = ['iam', 'secrets', 'separate', 'backups', 'patching', 'mfa', 'review', 'vcs', 'encryption', 'physical'] as const;
export type Control = (typeof CONTROLS)[number];

export const CONTROL_LABELS: Record<Control, string> = {
  iam: 'Identity and access management: an account for each person, with least privilege',
  secrets: 'A secrets manager, with code review to catch secrets before they are merged',
  separate: 'Separate development, testing and production environments',
  backups: 'Regular backups, tested by restoring them',
  patching: 'Patching and updating tools, libraries and systems',
  mfa: 'Multi-factor authentication',
  review: 'Code review before changes are merged',
  vcs: 'Version control',
  encryption: 'Encryption of stored data',
  physical: 'Physical security, such as a locked room with logged access',
};

/** Controls that also help against a category's weakness, so they are never its distractors. */
export const ALSO_HELPS: Record<Control, readonly Control[]> = {
  iam: ['mfa', 'vcs'],
  secrets: ['encryption', 'iam', 'review'],
  separate: ['iam', 'review'],
  backups: ['vcs'],
  patching: [],
  mfa: ['iam'],
  review: ['vcs', 'separate', 'secrets'],
  vcs: ['backups', 'review', 'iam'],
  encryption: ['backups', 'physical'],
  physical: ['encryption'],
};

export interface ThreatScenario {
  id: string;
  control: Control;
  /** The weakness, in one or two sentences. */
  story: string;
  /** One line on why the control is the best fit. */
  why: string;
  /** Extra controls that could be argued for this scenario only. */
  alsoHelps?: readonly Control[];
}

export const SCENARIOS: readonly ThreatScenario[] = [
  // Identity and access management
  {
    id: 'shared-admin',
    control: 'iam',
    story: 'All six developers at a Geelong freight company log in to the build server with one shared administrator account and password, so no change can be traced to a person.',
    why: 'An account for each person makes every action traceable, and least privilege gives each account only the access its role needs.',
  },
  {
    id: 'leaver',
    control: 'iam',
    story: 'A contractor finished working for a Ballarat software firm two months ago, but her account can still read and change the live code.',
    why: 'Identity and access management removes or changes access as people leave or change roles, so her account should have been disabled when she left.',
  },
  {
    id: 'all-admin',
    control: 'iam',
    story: 'Every developer at a Bendigo start-up has full administrator rights on every system, including the live customer database, although most of them only build web pages.',
    why: 'Least privilege gives each account only the access its role needs, so a mistake or a stolen account can do far less damage.',
  },
  // Secrets in the repository
  {
    id: 'db-password',
    control: 'secrets',
    story: "A developer at a travel agency wrote the database password into the source code and committed it to the team's shared repository.",
    why: 'A secrets manager keeps credentials out of the code, and code review catches secrets before they are merged. The exposed password must also be changed, because the repository history keeps it.',
  },
  {
    id: 'api-key',
    control: 'secrets',
    story: 'The key for a payment service is typed into a configuration file that is committed with the source code, which dozens of contractors can read.',
    why: 'Credentials belong in a secrets manager that only authorised systems can read, not in files kept with the code, and code review checks that none slip back in.',
  },
  {
    id: 'test-scripts',
    control: 'secrets',
    story: "Service passwords keep turning up in test scripts stored in a Shepparton agency's code repository.",
    why: 'A secrets manager gives scripts the passwords they need without writing them into the code, and code review catches any that are still typed in.',
  },
  // Separate environments
  {
    id: 'live-edit',
    control: 'separate',
    story: 'At a Mildura online store, developers edit code directly on the web server that customers use, and try out new features there too.',
    why: 'Separate environments keep unfinished and untested code away from the live system, which then changes only through a controlled release.',
  },
  {
    id: 'test-live-db',
    control: 'separate',
    story: 'Because the team has only one environment, it tests its new billing module against the live customer database.',
    why: "A separate testing environment with its own test data keeps experiments away from real customers' records.",
  },
  {
    id: 'one-server',
    control: 'separate',
    story: 'A small team develops, tests and runs its booking app on the same server, and an untested change took the live site offline for an afternoon.',
    why: 'Separate development, testing and production environments stop an untested change from reaching the live system.',
    alsoHelps: ['vcs', 'backups'],
  },
  // Backups
  {
    id: 'single-copy',
    control: 'backups',
    story: 'A design studio keeps its only copy of every project on one shared drive. Nothing is copied anywhere else, so a single drive failure would lose everything.',
    why: 'Regular backups, with a copy kept offline, let the studio restore its work whatever happens to the drive.',
  },
  {
    id: 'external-drive',
    control: 'backups',
    story: "A developer's only copy of a project's database sits on one external drive that has never been copied.",
    why: "Regular backups mean that losing one drive doesn't lose the data.",
  },
  {
    id: 'untested-backups',
    control: 'backups',
    story: 'A team copies its files to a backup drive every night, but no one has ever tried restoring from it, so nobody knows whether the copies can be read.',
    why: 'A backup only helps if it can be restored, so backups must be tested by restoring them regularly.',
  },
  // Patching
  {
    id: 'old-tools',
    control: 'patching',
    story: "The team's code editor and build tools haven't been updated for two years, and several have published security fixes that were never installed.",
    why: 'Patching installs the security fixes, closing flaws that attackers already know about.',
  },
  {
    id: 'old-library',
    control: 'patching',
    story: 'An app still uses an old version of a third-party library with a publicly known flaw, although a fixed version came out months ago.',
    why: 'Updating the library to the fixed version closes a flaw that is public knowledge.',
  },
  {
    id: 'unsupported-os',
    control: 'patching',
    story: "The developers' laptops run an operating system version that has stopped receiving security updates.",
    why: 'Updating to a supported version and keeping it patched closes known flaws that will otherwise never be fixed.',
  },
  // Multi-factor authentication
  {
    id: 'phished',
    control: 'mfa',
    story: "Developers reach the company's code repository from home with only a username and password, and one password was stolen in a phishing email.",
    why: "With multi-factor authentication, a stolen password alone can't log in: the attacker also needs the second factor, such as a code from the developer's phone.",
  },
  {
    id: 'cloud-console',
    control: 'mfa',
    story: "The cloud hosting console for a Geelong agritech firm opens with a password alone, and staff often reuse their passwords on other sites.",
    why: 'Multi-factor authentication stops a reused or leaked password from being enough to log in.',
  },
  {
    id: 'guessed',
    control: 'mfa',
    story: "An attacker guessed a developer's weak password and logged in to the build server from overseas, because a password was all it asked for.",
    why: 'Multi-factor authentication asks for a second factor, so a guessed password on its own gets nowhere.',
  },
  // Code review
  {
    id: 'unreviewed-merge',
    control: 'review',
    story: 'Any developer can merge changes into the main branch without anyone else reading them, and a change that removed an input check reached users.',
    why: 'Code review has a second developer read every change before it is merged, catching mistakes such as a removed check.',
    alsoHelps: ['iam'],
  },
  {
    id: 'hidden-bypass',
    control: 'review',
    story: "A developer's change went live without a second person checking it, and it contained a hidden way for its author to skip the login screen.",
    why: 'Code review makes it much harder for anyone to slip unauthorised code in unnoticed.',
  },
  {
    id: 'contractor-code',
    control: 'review',
    story: "A contractor's changes are merged straight into the product without the in-house team reading them first.",
    why: "Reviewing external code before merging it catches flaws and anything that shouldn't be there.",
    alsoHelps: ['iam'],
  },
  // Version control
  {
    id: 'emailed-zips',
    control: 'vcs',
    story: "Developers share code by emailing zipped copies, and last week two of them overwrote each other's work with no record of what was lost.",
    why: "Version control keeps every version and merges each person's changes, so nothing is silently overwritten.",
  },
  {
    id: 'no-history',
    control: 'vcs',
    story: "After a faulty update, the team can't go back to the previous working version, because no history of changes was kept.",
    why: 'Version control records every change, so the code can be rolled back to a known good version.',
  },
  {
    id: 'shared-folder',
    control: 'vcs',
    story: 'Nobody can tell who changed the discount calculation, or when, because the code files are edited directly in a shared folder.',
    why: 'Version control records every change with who made it and when.',
  },
  // Encryption
  {
    id: 'stolen-laptop',
    control: 'encryption',
    story: "A developer's laptop holding a copy of the customer database was stolen from a car. Its drive isn't encrypted, so whoever has it can read the data.",
    why: 'Encrypting the drive makes stolen data unreadable to anyone without the key.',
  },
  {
    id: 'lost-backup-drive',
    control: 'encryption',
    story: "A backup drive holding the source code and client records went missing on its way to off-site storage. The drive isn't encrypted.",
    why: 'Encrypted backups are unreadable to whoever finds or takes the drive.',
  },
  {
    id: 'lost-usb',
    control: 'encryption',
    story: 'A USB stick holding test data with real customer names and addresses was lost at a conference. Nothing on it is encrypted.',
    why: 'Encryption makes the data on a lost device unreadable without the key.',
  },
  // Physical security
  {
    id: 'desk-server',
    control: 'physical',
    story: "The server that holds a Bendigo team's code repository sits under a desk in an open-plan office that visitors walk through.",
    why: 'Physical security, such as a locked room with logged access, stops people simply walking up to the hardware.',
  },
  {
    id: 'propped-door',
    control: 'physical',
    story: 'The door to the server room is propped open during the day, and no one records who goes in.',
    why: 'A locked door with logged access controls who reaches the servers and records who did.',
  },
  {
    id: 'open-shelf',
    control: 'physical',
    story: 'Backup drives are kept on an open shelf beside the reception desk, where anyone walking past could pick one up.',
    why: 'Physical security, such as locked storage with logged access, keeps the drives out of reach.',
  },
];

/** The eight mitigation strategies. */
export const ESSENTIAL_EIGHT = [
  'Application control',
  'Patch applications',
  'Restrict Microsoft Office macros',
  'User application hardening',
  'Restrict administrative privileges',
  'Patch operating systems',
  'Multi-factor authentication',
  'Regular backups',
] as const;

/** Real security measures that are not among the eight. */
export const NOT_ESSENTIAL_EIGHT = [
  'Firewalls',
  'Antivirus software',
  'Security awareness training',
  'Penetration testing',
  'Encryption of stored data',
  'Intrusion detection systems',
  'Network segmentation',
  'Email content filtering',
  'Locked server rooms',
] as const;

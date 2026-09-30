/**
 * The four user experience characteristics of U3O2-KK15 (affordance, interoperability, security and
 * usability) and the weaknesses the `ux` mock-ups show, two for each characteristic. Every string a
 * student reads about a weakness is built here: the true reason, the same reason offered as a false
 * claim about a screen that doesn't have that weakness, the explanation, the fix, and why another
 * characteristic isn't the answer.
 *
 * Design principles (U3O2-KK16) never appear: the study design's list is unconfirmed (a verify
 * entry), so they are neither answers nor distractors.
 */

export const CHARACTERISTICS = ['affordance', 'interoperability', 'security', 'usability'] as const;
export type Characteristic = (typeof CHARACTERISTICS)[number];

export const CHARACTERISTIC_LABELS: Record<Characteristic, string> = {
  affordance: 'Affordance',
  interoperability: 'Interoperability',
  security: 'Security',
  usability: 'Usability',
};

export const WEAKNESSES = ['flat-action', 'hidden-tap', 'closed-export', 'closed-import', 'secret-shown', 'full-card', 'tiny-targets', 'long-form'] as const;
export type Weakness = (typeof WEAKNESSES)[number];

export const CHARACTERISTIC_OF: Record<Weakness, Characteristic> = {
  'flat-action': 'affordance',
  'hidden-tap': 'affordance',
  'closed-export': 'interoperability',
  'closed-import': 'interoperability',
  'secret-shown': 'security',
  'full-card': 'security',
  'tiny-targets': 'usability',
  'long-form': 'usability',
};

export function weaknessesOf(c: Characteristic): Weakness[] {
  return WEAKNESSES.filter((w) => CHARACTERISTIC_OF[w] === c);
}

/**
 * What an element of a mock-up is for, beside how it is drawn. Weaknesses are read from how an
 * element with a role is drawn: an action drawn as plain text, a secret shown in full, and so on.
 */
export type UxRole =
  /** Selecting it does something. Healthy when drawn as a button of a usable size. */
  | { kind: 'action' }
  /** A password or PIN. Healthy when every character is masked. */
  | { kind: 'secret' }
  /** A payment card number. Healthy when at most the last four digits show. */
  | { kind: 'card' }
  /** The file format a screen saves or reads. Healthy when it is a standard format. */
  | { kind: 'format'; direction: 'export' | 'import' }
  /** Shows how far through a form the user is, such as "Step 2 of 3". */
  | { kind: 'progress' }
  /** The screen is one of `screens` screens of a form. */
  | { kind: 'form'; screens: number };

/** What a built screen contains, for the reasons and feedback. */
export interface ScreenFacts {
  device: 'phone' | 'desktop';
  /** Text of the action drawn as plain text, when the weakness is flat-action. */
  flat?: string;
  /** Texts of the actions drawn as buttons (not keypad digits or steppers). */
  buttons: string[];
  secret?: { label: string; noun: string };
  card?: { last4: string };
  format?: {
    direction: 'export' | 'import';
    /** The app's own format, e.g. "MemberBase" and ".mbx". */
    app: string;
    ext: string;
    /** The standard format offered when healthy, e.g. "CSV" or "calendar files (.ics)". */
    open: string;
    /** Export: what can't open the app's own files ("the treasurer's spreadsheet program"). Import: where the files come from ("the school's student system"). */
    other: string;
    /** One line on the fix. */
    fix: string;
  };
  small?: { name: string; size: string };
  photo?: { name: string; does: string; cue: string };
  form?: { screens: number; step: number };
}

const tap = (f: ScreenFacts) => (f.device === 'phone' ? 'tapped' : 'clicked');

/** The characteristic's meaning, as the cards and glossary give it. */
const MEANING: Record<Characteristic, string> = {
  affordance: "Affordance is whether an element's look shows how to use it.",
  interoperability: 'Interoperability is how well a solution exchanges data with other systems.',
  security: "Security is about protecting users' data and accounts, so they can trust the solution.",
  usability: 'Usability is how easily users can learn and use a solution to finish their tasks.',
};

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`ux: this screen has no ${what}`);
  return value;
}

/**
 * The reason a weakness gives. On the screen that has it, this is the true reason; on any other
 * screen it is a false claim, specific to an element the screen has where it can be.
 */
export function reasonText(w: Weakness, f: ScreenFacts, isWeakness: boolean): string {
  switch (w) {
    case 'flat-action': {
      if (isWeakness) return `"${need(f.flat, 'flat action')}" works like a button but looks like plain text, so nothing shows that it can be ${tap(f)}.`;
      const b = f.buttons[0];
      return b ? `"${b}" looks like plain text, so nothing shows that it can be ${tap(f)}.` : `One of its actions looks like plain text, so nothing shows that it can be ${tap(f)}.`;
    }
    case 'hidden-tap':
      return f.photo
        ? `Tapping the ${f.photo.name} ${f.photo.does}, but nothing on it shows that it can be tapped.`
        : `A picture works as a button, but nothing shows that it can be ${tap(f)}.`;
    case 'closed-export':
      return f.format?.direction === 'export'
        ? `It saves only as ${f.format.app} files (${f.format.ext}), which ${f.format.other} can't open.`
        : "It saves data only in its own file format, which other programs can't open.";
    case 'closed-import':
      return f.format?.direction === 'import'
        ? `It imports only ${f.format.app} files (${f.format.ext}), but ${f.format.other} exports ${f.format.open} files.`
        : 'It imports only its own file format, not the files other systems export.';
    case 'secret-shown':
      return f.secret
        ? `The ${f.secret.label} box shows the ${f.secret.noun} as it is typed, so anyone who can see the screen can read it.`
        : 'It shows a password as it is typed, so anyone who can see the screen can read it.';
    case 'full-card':
      return f.card ? 'It shows the whole card number, so anyone who sees the screen could copy it.' : "It shows a customer's whole card number, so anyone who sees the screen could copy it.";
    case 'tiny-targets':
      if (f.small) return isWeakness ? `${f.small.name} are only ${f.small.size} across, too small to tap accurately.` : `${f.small.name} are too small to tap accurately.`;
      return f.device === 'phone' ? 'Its buttons are too small to tap accurately with a finger.' : 'Its buttons are too small to click accurately.';
    case 'long-form':
      if (isWeakness) return `The form runs over ${need(f.form, 'form').screens} screens, and nothing shows how far through it the user is.`;
      return f.form ? 'Nothing shows how far through the form the user is.' : 'It spreads one short task over many screens, with no sign of progress.';
  }
}

/** Why a false claim is false on this screen: the Q2 feedback for a wrong reason. */
export function rebuttal(w: Weakness, f: ScreenFacts): string {
  switch (w) {
    case 'flat-action':
      return f.buttons[0] ? `"${f.buttons[0]}" is drawn as a button, with a border.` : 'Every action here is drawn as a button.';
    case 'hidden-tap':
      return f.photo ? `The ${f.photo.name} has a "${f.photo.cue}" button under it.` : 'No picture here works as a button.';
    case 'closed-export':
      return f.format?.direction === 'export' ? `It saves as ${f.format.open}, which other programs open.` : "This screen doesn't save any files.";
    case 'closed-import':
      return f.format?.direction === 'import' ? `It imports ${f.format.open} files.` : "This screen doesn't import any files.";
    case 'secret-shown':
      return f.secret ? `The ${f.secret.label} box shows dots, not the ${f.secret.noun}.` : "There's no password on this screen.";
    case 'full-card':
      return f.card ? 'Only the last four digits of the card show.' : 'No card number appears on this screen.';
    case 'tiny-targets':
      return f.small ? `${f.small.name} are a comfortable size for a fingertip.` : 'Its buttons are a comfortable size.';
    case 'long-form':
      return f.form ? `"Step ${f.form.step} of ${f.form.screens}" shows how far through the form the user is.` : "This screen isn't part of a long form.";
  }
}

/** Why the characteristic is the weakest here: the meaning, applied to this screen. */
export function explanation(w: Weakness, f: ScreenFacts): string {
  const meaning = MEANING[CHARACTERISTIC_OF[w]];
  switch (w) {
    case 'flat-action':
      return `${meaning} "${f.flat}" is an action, but it is drawn as plain text, with no border or shading to show it can be ${tap(f)}.`;
    case 'hidden-tap': {
      const photo = need(f.photo, 'photo');
      return `${meaning} Tapping the ${photo.name} ${photo.does}, but it has no border, icon or label to show it can be tapped.`;
    }
    case 'closed-export': {
      const format = need(f.format, 'format');
      return `${meaning} ${format.app} files open only in ${format.app}, so ${format.other} can't use them.`;
    }
    case 'closed-import': {
      const format = need(f.format, 'format');
      return `${meaning} ${capital(format.other)} exports ${format.open} files, but ${format.app} imports only its own format, so the data would have to be typed in again.`;
    }
    case 'secret-shown': {
      const secret = need(f.secret, 'secret');
      return `${meaning} Anyone who can see the screen can read the ${secret.noun} and use the account.`;
    }
    case 'full-card':
      return `${meaning} Anyone who sees the screen could copy the whole card number and misuse it.`;
    case 'tiny-targets':
      return `${meaning} Buttons this small are hard to hit with a finger, so users tap the wrong one or have to try again.`;
    case 'long-form':
      return `${meaning} A ${need(f.form, 'form').screens}-screen form with no sign of progress leaves users unsure how much is left, and many give up.`;
  }
}

/** One line on how to fix the weakness. */
export function fixText(w: Weakness, f: ScreenFacts): string {
  switch (w) {
    case 'flat-action':
      return `A fix: draw "${f.flat}" as a button, with a border or shading.`;
    case 'hidden-tap':
      return `A fix: add a visible cue, such as a button labelled "${need(f.photo, 'photo').cue}".`;
    case 'closed-export':
    case 'closed-import':
      return need(f.format, 'format').fix;
    case 'secret-shown':
      return `A fix: show a dot for each character, so the ${need(f.secret, 'secret').noun} never appears on screen.`;
    case 'full-card':
      return `A fix: show only the last four digits, such as •••• ${need(f.card, 'card').last4}.`;
    case 'tiny-targets':
      return 'A fix: make the buttons big enough for a fingertip, with space between them.';
    case 'long-form':
      return 'A fix: ask only for what is needed, and show progress, such as "Step 2 of 3".';
  }
}

/** Why `chosen` isn't the weakest characteristic on a screen whose weakness is `w`. */
export function whyNot(chosen: Characteristic, w: Weakness, f: ScreenFacts): string {
  const actual = CHARACTERISTIC_OF[w];
  switch (chosen) {
    case 'affordance':
      if (w === 'tiny-targets') return "The buttons still look like buttons, so their look isn't the problem: they are too small to use easily.";
      if (w === 'long-form') return 'Every control looks like what it is. The problem is how long the task is.';
      return "Every control looks like what it is, so affordance isn't the weakness.";
    case 'usability':
      if (actual === 'affordance') return 'Poor affordance does make a screen harder to use, but the fault is how one element looks, which is affordance.';
      if (w === 'secret-shown') return `Showing the ${f.secret?.noun ?? 'password'} doesn't make the screen harder to use. It puts the account at risk, which is security.`;
      if (w === 'full-card') return "Showing the card number doesn't make the screen harder to use. It puts the customer's data at risk, which is security.";
      return 'The screen itself is easy to use. The problem is moving its data to or from other systems.';
    case 'security':
      if (f.secret) return `The ${f.secret.label} box shows dots, so nothing private is exposed.`;
      if (f.card) return 'Only the last four digits of the card show, so nothing private is exposed.';
      return "Nothing on this screen exposes private data, so security isn't the weakness.";
    case 'interoperability':
      if (f.format?.direction === 'export') return `It saves as ${f.format.open}, a standard format that other programs open.`;
      if (f.format?.direction === 'import') return `It imports ${f.format.open} files, the format ${f.format.other} exports.`;
      return "This screen doesn't exchange files with other systems, so interoperability isn't the weakness.";
  }
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

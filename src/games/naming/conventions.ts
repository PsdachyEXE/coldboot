/**
 * Naming conventions for `naming`: builders that write a list of words in each convention, and a
 * classifier that reads an identifier's shape. The tests run every generated identifier through the
 * classifier, so an answer is always checked a second way.
 *
 * The three conventions are the study design's: Hungarian notation, camel casing and snake casing
 * (VCAA writes "casing"). Hungarian prefixes are a convention, not a standard: teams choose their
 * own. The variable prefixes str, int and bool are the ones VCAA's own samples use; the rest follow
 * common practice. The game states this table in every question that needs it, and the man page
 * repeats it.
 */

export type Convention = 'camel' | 'snake' | 'hungarian';
/** Shapes that look like one of the three conventions but aren't. */
export type Lookalike = 'pascal' | 'kebab' | 'title-snake';
export type Shape = Convention | Lookalike;

export const CONVENTION_LABELS: Record<Convention, string> = {
  camel: 'camel casing',
  snake: 'snake casing',
  hungarian: 'Hungarian notation',
};

export const LOOKALIKE_LABELS: Record<Lookalike, string> = {
  pascal: 'Pascal casing',
  kebab: 'kebab casing',
  'title-snake': 'capitalised words joined by underscores',
};

export interface Prefix<T extends string> {
  prefix: T;
  /** What the prefix marks, e.g. "string" or "text box". Data types use the study design's names. */
  label: string;
}

/** One prefix per study design data type, in its order, then one for arrays. */
export const VARIABLE_PREFIXES = [
  { prefix: 'chr', label: 'character' },
  { prefix: 'str', label: 'string' },
  { prefix: 'int', label: 'integer' },
  { prefix: 'flt', label: 'floating point' },
  { prefix: 'dtm', label: 'date/time' },
  { prefix: 'bool', label: 'Boolean' },
  { prefix: 'arr', label: 'array' },
] as const satisfies readonly Prefix<string>[];

export const CONTROL_PREFIXES = [
  { prefix: 'txt', label: 'text box' },
  { prefix: 'btn', label: 'button' },
  { prefix: 'lbl', label: 'label' },
  { prefix: 'chk', label: 'check box' },
  { prefix: 'lst', label: 'list box' },
  { prefix: 'cbo', label: 'combo box' },
  { prefix: 'rdo', label: 'radio button' },
  { prefix: 'frm', label: 'form' },
] as const satisfies readonly Prefix<string>[];

export type VariablePrefix = (typeof VARIABLE_PREFIXES)[number]['prefix'];
export type ControlPrefix = (typeof CONTROL_PREFIXES)[number]['prefix'];
export type HungarianPrefix = VariablePrefix | ControlPrefix;

const ALL_PREFIXES: readonly HungarianPrefix[] = [...VARIABLE_PREFIXES, ...CONTROL_PREFIXES].map((p) => p.prefix);

export function prefixLabel(prefix: HungarianPrefix): string {
  return [...VARIABLE_PREFIXES, ...CONTROL_PREFIXES].find((p) => p.prefix === prefix)!.label;
}

export const VARIABLE_PREFIX_LINE = `Variable prefixes: ${VARIABLE_PREFIXES.map((p) => `${p.prefix} ${p.label}`).join(', ')}.`;
export const CONTROL_PREFIX_LINE = `Control prefixes: ${CONTROL_PREFIXES.map((p) => `${p.prefix} ${p.label}`).join(', ')}.`;

const capitalise = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export function toCamel(words: readonly string[]): string {
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : capitalise(w.toLowerCase()))).join('');
}

export function toSnake(words: readonly string[]): string {
  return words.map((w) => w.toLowerCase()).join('_');
}

export function toPascal(words: readonly string[]): string {
  return words.map((w) => capitalise(w.toLowerCase())).join('');
}

export function toKebab(words: readonly string[]): string {
  return words.map((w) => w.toLowerCase()).join('-');
}

export function toTitleSnake(words: readonly string[]): string {
  return words.map((w) => capitalise(w.toLowerCase())).join('_');
}

/** The prefix in lowercase, then each word starting with a capital: strFirstName, btnSave, boolHasPaid. */
export function toHungarian(prefix: HungarianPrefix, words: readonly string[]): string {
  return prefix + toPascal(words);
}

export function write(shape: Shape, words: readonly string[], prefix?: HungarianPrefix): string {
  switch (shape) {
    case 'camel':
      return toCamel(words);
    case 'snake':
      return toSnake(words);
    case 'hungarian':
      if (!prefix) throw new Error('Hungarian notation needs a prefix');
      return toHungarian(prefix, words);
    case 'pascal':
      return toPascal(words);
    case 'kebab':
      return toKebab(words);
    case 'title-snake':
      return toTitleSnake(words);
  }
}

const WORD = '[a-z0-9]+';
const CAP = '[A-Z][a-z0-9]*';
const HUNGARIAN = new RegExp(`^(${ALL_PREFIXES.join('|')})(${CAP})+$`);
const CAMEL = new RegExp(`^${WORD}(${CAP})+$`);
const SNAKE = new RegExp(`^${WORD}(_${WORD})+$`);
const PASCAL = new RegExp(`^${CAP}(${CAP})+$`);
const KEBAB = new RegExp(`^${WORD}(-${WORD})+$`);
const TITLE_SNAKE = new RegExp(`^${CAP}(_${CAP})+$`);

/**
 * Reads an identifier's shape, independently of how it was built. A table prefix followed by a
 * capital letter makes it Hungarian notation, even though the rest looks like camel casing. Every
 * shape needs at least two words (or a prefix and a word), since one lowercase word would be both
 * camel casing and snake casing. Null when the shape is none of these.
 */
export function classify(identifier: string): Shape | null {
  if (HUNGARIAN.test(identifier)) return 'hungarian';
  if (CAMEL.test(identifier)) return 'camel';
  if (SNAKE.test(identifier)) return 'snake';
  if (PASCAL.test(identifier)) return 'pascal';
  if (KEBAB.test(identifier)) return 'kebab';
  if (TITLE_SNAKE.test(identifier)) return 'title-snake';
  return null;
}

/** The Hungarian prefix an identifier starts with, if its shape is Hungarian notation. */
export function hungarianPrefix(identifier: string): HungarianPrefix | null {
  return HUNGARIAN.test(identifier) ? (ALL_PREFIXES.find((p) => identifier.startsWith(p)) ?? null) : null;
}

/**
 * Command terms accepted in short-answer items. The 2025 paper used the first eight;
 * the rest are common VCAA command terms. Extend this list if the source uses others.
 */
export const COMMAND_TERMS = [
  'state',
  'identify',
  'describe',
  'explain',
  'justify',
  'classify',
  'complete',
  'recommend',
  'outline',
  'name',
  'list',
  'compare',
  'discuss',
  'evaluate',
  'analyse',
  'propose',
  'determine',
  'calculate',
  'draw',
  'annotate',
  'modify',
  'write',
] as const;

export type CommandTerm = (typeof COMMAND_TERMS)[number];

export function isCommandTerm(value: string): value is CommandTerm {
  return (COMMAND_TERMS as readonly string[]).includes(value);
}

/** Suggested answer length: roughly one developed point per mark. */
export function suggestedLength(marks: number): string {
  if (marks <= 1) return 'One precise point, a sentence or less.';
  return `About ${marks} developed points, one per mark.`;
}

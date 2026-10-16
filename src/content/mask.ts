/** Hiding a term inside its own definition, for anywhere a definition is shown to ask for the term. */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wholeWord(spelling: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(spelling.trim())}(?![\\p{L}\\p{N}])`, 'giu');
}

/** Hides the term and its aliases where a definition happens to use them, so the answer isn't shown. */
export function maskDefinition(definition: string, spellings: readonly string[]): string {
  let out = definition;
  const longestFirst = [...spellings].filter((s) => s.trim()).sort((a, b) => b.length - a.length);
  for (const s of longestFirst) out = out.replace(wholeWord(s), '(this term)');
  return out;
}

/** The spellings (term or aliases) that a definition uses as whole words. */
export function namesInDefinition(definition: string, spellings: readonly string[]): string[] {
  return spellings.filter((s) => s.trim() && wholeWord(s).test(definition));
}

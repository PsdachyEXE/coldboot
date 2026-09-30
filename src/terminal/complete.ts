/**
 * Tab completion. Completes the word before the cursor: command names first, then game names after
 * `play` and `man`, KK and area ids after `drill`, and flags. One match completes the word and adds
 * a space; several extend it to their common prefix and are returned as options to print.
 */

export interface CompletionSources {
  commands: readonly string[];
  games: readonly string[];
  /** Topics `man` accepts (the games plus the drill). */
  manTopics: readonly string[];
  /** KK and area ids for `drill`. */
  drillTargets: readonly string[];
  /** Flags per command, with their dashes: { play: ['--easy', '--hard'] }. */
  flags: Readonly<Record<string, readonly string[]>>;
}

export interface Completion {
  /** The text before the cursor after completing. */
  line: string;
  /** Every match when there was more than one; empty otherwise. */
  options: string[];
}

function commonPrefix(words: readonly string[]): string {
  let n = words[0].length;
  for (const w of words.slice(1)) {
    let i = 0;
    while (i < n && i < w.length && w[i].toLowerCase() === words[0][i].toLowerCase()) i++;
    n = i;
  }
  return words[0].slice(0, n);
}

function candidatesFor(prior: readonly string[], word: string, src: CompletionSources): readonly string[] {
  if (!prior.length) return src.commands;
  const command = prior[0].toLowerCase();
  if (word.startsWith('-')) return src.flags[command] ?? [];
  const positional = prior.slice(1).filter((w) => !w.startsWith('--'));
  if (positional.length) return [];
  switch (command) {
    case 'play':
      return src.games;
    case 'man':
      return src.manTopics;
    case 'drill':
      return src.drillTargets;
    case 'help':
      return src.commands;
    case 'report':
      return ['current'];
    default:
      return [];
  }
}

/** Completes `before` (the input up to the cursor). */
export function complete(before: string, src: CompletionSources): Completion {
  const word = /(\S*)$/.exec(before)?.[1] ?? '';
  const head = before.slice(0, before.length - word.length);
  const prior = head.trim() ? head.trim().split(/\s+/) : [];
  const lower = word.toLowerCase();
  const matches = [...new Set(candidatesFor(prior, word, src))].filter((c) => c.toLowerCase().startsWith(lower));
  if (!matches.length) return { line: before, options: [] };
  if (matches.length === 1) return { line: `${head}${matches[0]} `, options: [] };
  const prefix = commonPrefix(matches);
  // The prefix always covers the typed word (matched ignoring case), and gives it the canonical case.
  return { line: prefix.length >= word.length ? head + prefix : before, options: matches };
}

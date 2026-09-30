/**
 * Command-line parsing: splits a line into words with shell-style quoting, then separates `--flags`
 * from positional arguments. `play sort --hard` gives { name: 'play', args: ['sort'], flags: ['hard'] }.
 */

export interface Token {
  value: string;
  /** True when any part of the word was quoted (a quoted word is never a flag). */
  quoted: boolean;
}

export type TokenizeResult = { ok: true; tokens: Token[] } | { ok: false; error: string };

/**
 * Words are separated by whitespace. Single quotes keep everything literally; double quotes allow
 * \" and \\; outside quotes a backslash keeps the next character. Adjacent parts join: a"b c" is "ab c".
 */
export function tokenize(line: string): TokenizeResult {
  const tokens: Token[] = [];
  let current = '';
  let inWord = false;
  let quoted = false;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && (line[i + 1] === '"' || line[i + 1] === '\\')) current += line[++i];
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      inWord = true;
      quoted = true;
    } else if (ch === '\\' && i + 1 < line.length) {
      current += line[++i];
      inWord = true;
    } else if (/\s/.test(ch)) {
      if (inWord) tokens.push({ value: current, quoted });
      current = '';
      inWord = false;
      quoted = false;
    } else {
      current += ch;
      inWord = true;
    }
  }
  if (quote) return { ok: false, error: `The line has an opening ${quote} without a closing one. Add the closing ${quote}, or remove the opening one.` };
  if (inWord) tokens.push({ value: current, quoted });
  return { ok: true, tokens };
}

export interface ParsedCommand {
  /** The command name, lower-cased. */
  name: string;
  /** Positional arguments, quotes removed. */
  args: string[];
  /** Flags without the leading dashes, lower-cased: `--Hard` gives 'hard'. */
  flags: string[];
  /** The line as typed, trimmed. */
  raw: string;
}

export type ParseResult = { ok: true; command: ParsedCommand | null } | { ok: false; error: string };

/** Parses one command line. An empty line gives `command: null`. A bare `--` ends the flags. */
export function parseCommandLine(line: string): ParseResult {
  const t = tokenize(line);
  if (!t.ok) return t;
  if (!t.tokens.length) return { ok: true, command: null };
  const [head, ...rest] = t.tokens;
  const args: string[] = [];
  const flags: string[] = [];
  let flagsDone = false;
  for (const token of rest) {
    if (!flagsDone && !token.quoted && token.value === '--') flagsDone = true;
    else if (!flagsDone && !token.quoted && /^--[^-]/.test(token.value)) flags.push(token.value.slice(2).toLowerCase());
    else args.push(token.value);
  }
  return { ok: true, command: { name: head.value.toLowerCase(), args, flags, raw: line.trim() } };
}

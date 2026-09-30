#!/usr/bin/env node
/**
 * Installer lint: cheap static guarantees for install.ps1 and uninstall.ps1, which students run with
 * `irm <url> | iex` inside their own PowerShell session. A script fails when it:
 *  - contains any non-ASCII byte (Windows PowerShell 5.1 can mangle non-ASCII text fetched through irm);
 *  - contains the word `exit` anywhere, comments included (under iex an exit statement closes the
 *    student's shell, and a stray word in a comment is cheap to reword and keeps the rule simple);
 *  - has any code outside a single `& { ... }` block (the block keeps the script's variables out of the
 *    student's session and lets `return` stop it early);
 *  - doesn't set `$ErrorActionPreference = 'Stop'` on its own line directly inside that block, before
 *    any download;
 *  - downloads anything, or is install.ps1, without setting `$ProgressPreference = 'SilentlyContinue'`
 *    the same way (the 5.1 progress bar slows downloads badly);
 *  - has an Invoke-WebRequest line without -UseBasicParsing (5.1 otherwise needs the Internet Explorer
 *    engine), or calls it through an alias (iwr, curl, wget) that would hide it from that check;
 *  - leaves a string, comment or brace open, which would hide code from the checks above.
 *
 * Strings and comments are blanked out before the code checks run, so a message that mentions
 * Invoke-WebRequest or a brace doesn't trip them. The non-ASCII and `exit` checks read the raw text.
 *
 * Usage: node scripts/installer-lint.mjs [file ...]   (defaults to install.ps1 and uninstall.ps1)
 */
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['install.ps1', 'uninstall.ps1'];

/** Characters after which `#` starts a comment rather than being part of a word. */
const COMMENT_START_AFTER = new Set([undefined, ' ', '\t', '\r', '\n', ';', '|', '&', '(', ')', '{', '}', ',', '=']);

const FRAME_NAMES = {
  sq: 'single-quoted string',
  dq: 'double-quoted string',
  hsq: "here-string (@' ... '@)",
  hdq: 'here-string (@" ... "@)',
  line: 'comment',
  block: 'block comment (<# ... #>)',
  bvar: 'braced variable (${...})',
  sub: 'subexpression $( ... ) inside a string',
};

/**
 * Scans PowerShell source. Returns `code` (the source with every comment and string blanked to spaces,
 * keeping line breaks so positions still match), `depthAtLine` (the brace depth at the start of each
 * line, counting only braces in code) and `problems` for anything left open or unbalanced.
 */
function scanPowerShell(source) {
  const out = source.split('');
  const depthAtLine = [0];
  const problems = [];
  const stack = [{ kind: 'code', line: 1 }];
  let depth = 0;
  let line = 1;
  let i = 0;

  const top = () => stack[stack.length - 1];
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' ';
  };
  const restOfLineIsBlank = (from) => {
    const end = source.indexOf('\n', from);
    return /^[ \t\r]*$/.test(source.slice(from, end === -1 ? source.length : end));
  };

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    const frame = top();

    if (ch === '\n') {
      line++;
      depthAtLine.push(depth);
      if (frame.kind === 'line') stack.pop();
      i++;
      // A here-string ends at a line that starts with its closing quote and @.
      const closer = frame.kind === 'hsq' ? "'@" : frame.kind === 'hdq' ? '"@' : null;
      if (closer && source.startsWith(closer, i)) {
        blank(i, i + 2);
        stack.pop();
        i += 2;
      }
      continue;
    }

    switch (frame.kind) {
      case 'code':
      case 'sub': {
        if (frame.kind === 'sub') blank(i, i + 1);
        if (ch === '`') {
          // An escaped character, or a line continuation (whose newline still counts as a line).
          if (frame.kind === 'sub' && next !== '\n') blank(i, i + 2);
          i += next === '\n' ? 1 : 2;
          continue;
        }
        if (ch === '<' && next === '#') {
          stack.push({ kind: 'block', line });
          blank(i, i + 2);
          i += 2;
          continue;
        }
        if (ch === '#' && COMMENT_START_AFTER.has(source[i - 1])) {
          stack.push({ kind: 'line', line });
          blank(i, i + 1);
          i++;
          continue;
        }
        if (ch === '@' && (next === "'" || next === '"') && restOfLineIsBlank(i + 2)) {
          stack.push({ kind: next === "'" ? 'hsq' : 'hdq', line });
          blank(i, i + 2);
          i += 2;
          continue;
        }
        if (ch === "'" || ch === '"') {
          stack.push({ kind: ch === "'" ? 'sq' : 'dq', line });
          blank(i, i + 1);
          i++;
          continue;
        }
        if (ch === '$' && next === '{') {
          stack.push({ kind: 'bvar', line });
          blank(i, i + 2);
          i += 2;
          continue;
        }
        if (frame.kind === 'code') {
          if (ch === '{') depth++;
          if (ch === '}') {
            depth--;
            if (depth < 0) {
              problems.push({ line, message: 'a closing brace } has no opening brace' });
              depth = 0;
            }
          }
        } else if (ch === '(') {
          frame.parens++;
        } else if (ch === ')') {
          if (frame.parens === 0) stack.pop();
          else frame.parens--;
        }
        i++;
        continue;
      }
      case 'sq':
        blank(i, i + 1);
        if (ch === "'" && next === "'") {
          blank(i, i + 2);
          i += 2;
          continue;
        }
        if (ch === "'") stack.pop();
        i++;
        continue;
      case 'dq':
        blank(i, i + 1);
        if (ch === '`') {
          if (next !== '\n') blank(i, i + 2);
          i += next === '\n' ? 1 : 2;
          continue;
        }
        if (ch === '"' && next === '"') {
          blank(i, i + 2);
          i += 2;
          continue;
        }
        if (ch === '"') stack.pop();
        if (ch === '$' && next === '(') {
          blank(i, i + 2);
          stack.push({ kind: 'sub', line, parens: 0 });
          i += 2;
          continue;
        }
        i++;
        continue;
      case 'bvar':
        blank(i, i + 1);
        if (ch === '`') {
          if (next !== '\n') blank(i, i + 2);
          i += next === '\n' ? 1 : 2;
          continue;
        }
        if (ch === '}') stack.pop();
        i++;
        continue;
      case 'block':
        blank(i, i + 1);
        if (ch === '#' && next === '>') {
          blank(i, i + 2);
          stack.pop();
          i += 2;
          continue;
        }
        i++;
        continue;
      default:
        // Line comments and here-string bodies run to the newline handled above.
        blank(i, i + 1);
        i++;
        continue;
    }
  }

  for (const frame of stack.slice(1)) {
    if (frame.kind === 'line') continue;
    problems.push({ line: frame.line, message: `${FRAME_NAMES[frame.kind]} is never closed` });
  }
  if (depth !== 0) problems.push({ line, message: `braces don't balance (${depth} left open at the end of the file)` });

  return { code: out.join(''), depthAtLine, problems };
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Checks one script. Returns `{ line, message }` problems, with line 0 for whole-file problems. */
function lintScript(fileName, bytes) {
  const problems = [];
  const text = bytes.toString('latin1');
  const rawLines = text.split('\n').map((l) => l.replace(/\r$/, ''));

  // Non-ASCII bytes.
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] > 0x7f) {
      problems.push({ line: lineOf(text, i), message: `non-ASCII byte 0x${bytes[i].toString(16)}` });
    }
  }

  // The word exit, anywhere.
  rawLines.forEach((raw, idx) => {
    if (/(^|[^A-Za-z0-9_$-])exit([^A-Za-z0-9_-]|$)/i.test(raw)) {
      problems.push({ line: idx + 1, message: `contains "exit": ${raw.trim()}` });
    }
  });

  const scan = scanPowerShell(text);
  problems.push(...scan.problems);
  const { code, depthAtLine } = scan;
  const codeLines = code.split('\n');

  // Everything inside one & { ... } block.
  const first = code.search(/\S/);
  if (first === -1) {
    problems.push({ line: 0, message: 'has no code; the body must be wrapped in & { ... }' });
  } else if (!/^&[ \t]*\{/.test(code.slice(first))) {
    problems.push({ line: lineOf(code, first), message: 'must start with & { so the whole body runs inside one script block' });
  } else {
    const open = code.indexOf('{', first);
    let depth = 0;
    let close = -1;
    for (let k = open; k < code.length; k++) {
      if (code[k] === '{') depth++;
      else if (code[k] === '}' && --depth === 0) {
        close = k;
        break;
      }
    }
    if (close === -1) {
      problems.push({ line: lineOf(code, open), message: 'the & { block is never closed' });
    } else {
      const after = code.slice(close + 1).search(/\S/);
      if (after !== -1) {
        problems.push({
          line: lineOf(code, close + 1 + after),
          message: 'has code after the & { ... } block; everything must run inside it',
        });
      }
    }
  }

  // Downloads.
  const downloadLines = [];
  codeLines.forEach((c, idx) => {
    if (/\bInvoke-(WebRequest|RestMethod)\b/i.test(c)) downloadLines.push(idx);
    if (/\bInvoke-WebRequest\b/i.test(c) && !/(^|\s)-UseBasicParsing\b/i.test(c)) {
      problems.push({ line: idx + 1, message: `Invoke-WebRequest without -UseBasicParsing on the same line: ${rawLines[idx].trim()}` });
    }
    const alias = /(^|[\s;|(&={])(iwr|curl|wget)(?=$|[\s;|)}])/i.exec(c);
    if (alias) {
      problems.push({
        line: idx + 1,
        message: `calls "${alias[2]}"; use Invoke-WebRequest by its full name so the -UseBasicParsing check can see it`,
      });
    }
  });
  const firstDownload = downloadLines.length ? downloadLines[0] : Infinity;

  // Preference variables, set directly inside the & { } block before any download.
  const requirePreference = (name, value) => {
    const pattern = new RegExp(`^\\s*\\$${name}\\s*=\\s*(['"])${value}\\1\\s*(#.*)?$`, 'i');
    const idx = rawLines.findIndex(
      (raw, k) => pattern.test(raw) && depthAtLine[k] === 1 && new RegExp(`\\$${name}\\b`, 'i').test(codeLines[k] ?? ''),
    );
    if (idx === -1) {
      problems.push({ line: 0, message: `must set $${name} = '${value}' on its own line directly inside the & { } block` });
    } else if (idx > firstDownload) {
      problems.push({ line: idx + 1, message: `sets $${name} after the first download on line ${firstDownload + 1}; set it first` });
    }
  };
  requirePreference('ErrorActionPreference', 'Stop');
  if (basename(fileName).toLowerCase() === 'install.ps1' || downloadLines.length) {
    requirePreference('ProgressPreference', 'SilentlyContinue');
  }

  return problems.sort((a, b) => a.line - b.line);
}

let failures = 0;
for (const rel of files) {
  let bytes;
  try {
    bytes = readFileSync(resolve(root, rel));
  } catch {
    console.error(`installer-lint: ${rel} is missing`);
    failures++;
    continue;
  }
  for (const problem of lintScript(rel, bytes)) {
    console.error(`installer-lint: ${rel}${problem.line ? `:${problem.line}` : ''}: ${problem.message}`);
    failures++;
  }
}

if (failures) {
  console.error(`installer-lint: ${failures} problem(s)`);
  process.exit(1);
}
console.info(`installer-lint: ${files.join(', ')} clean`);

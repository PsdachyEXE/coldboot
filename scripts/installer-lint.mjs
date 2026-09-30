#!/usr/bin/env node
/**
 * Installer lint. Fails when install.ps1 or uninstall.ps1:
 *  - contains any non-ASCII byte (Windows PowerShell 5.1 can mangle non-ASCII text fetched through irm), or
 *  - contains an `exit` statement (under `irm | iex` it closes the user's shell).
 * Comments are checked too: a stray `exit` in a comment is cheap to reword and keeps the rule simple.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['install.ps1', 'uninstall.ps1'];
let failures = 0;

for (const rel of files) {
  const path = resolve(root, rel);
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch {
    console.error(`installer-lint: ${rel} is missing`);
    failures++;
    continue;
  }
  const lines = bytes.toString('latin1').split(/\r?\n/);
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] > 0x7f) {
      const upto = bytes.subarray(0, i).toString('latin1');
      const line = upto.split('\n').length;
      console.error(`installer-lint: ${rel}:${line}: non-ASCII byte 0x${bytes[i].toString(16)}`);
      failures++;
    }
  }
  lines.forEach((text, idx) => {
    if (/(^|[^A-Za-z0-9_$-])exit([^A-Za-z0-9_-]|$)/i.test(text)) {
      console.error(`installer-lint: ${rel}:${idx + 1}: contains "exit": ${text.trim()}`);
      failures++;
    }
  });
}

if (failures) {
  console.error(`installer-lint: ${failures} problem(s)`);
  process.exit(1);
}
console.info(`installer-lint: ${files.join(', ')} clean`);

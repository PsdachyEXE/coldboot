/**
 * WCAG AA contrast check over every token pair the UI declares in src/ui/contrast-pairs.json.
 * Token values come from src/ui/tokens.css so the check can never drift from the real palette.
 *
 *   npm run contrast:check
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

export function parseTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[m[1]] = m[2].toUpperCase();
  }
  return tokens;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const REQUIRED = { text: 4.5, large: 3, ui: 3 } as const;
type Level = keyof typeof REQUIRED;

interface Pair {
  fg: string;
  bg: string;
  level: Level;
  use: string;
}

function main(): void {
  const tokens = parseTokens(readFileSync(resolve(root, 'src/ui/tokens.css'), 'utf8'));
  const { pairs } = JSON.parse(readFileSync(resolve(root, 'src/ui/contrast-pairs.json'), 'utf8')) as { pairs: Pair[] };
  let failures = 0;
  for (const p of pairs) {
    const fg = tokens[p.fg];
    const bg = tokens[p.bg];
    if (!fg || !bg) {
      console.error(`contrast: unknown token in pair ${p.fg} on ${p.bg}`);
      failures++;
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const need = REQUIRED[p.level];
    const ok = ratio >= need;
    if (!ok) failures++;
    console.info(`${ok ? 'pass' : 'FAIL'}  ${ratio.toFixed(2).padStart(5)}:1  need ${need}:1  ${p.fg} on ${p.bg}  (${p.use})`);
  }
  if (failures) {
    console.error(`contrast: ${failures} pair(s) below WCAG AA`);
    process.exit(1);
  }
  console.info(`contrast: ${pairs.length} pairs meet WCAG AA`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main();

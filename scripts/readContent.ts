/** Reads content/ from disk into the shape src/content/check.ts expects. Node only. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AREA_IDS, type AreaId } from '../src/content/schema';
import type { RawContent } from '../src/content/check';

export function readContentDir(root = resolve(import.meta.dirname, '..')): RawContent {
  const content = resolve(root, 'content');
  const readIf = (path: string): unknown => {
    if (!existsSync(path)) return undefined;
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
      return { __parseError: String(error) };
    }
  };
  const areas = {} as RawContent['areas'];
  for (const area of AREA_IDS) {
    const dir = resolve(content, area.toLowerCase());
    areas[area as AreaId] = {
      cards: readIf(resolve(dir, 'cards.json')),
      mcq: readIf(resolve(dir, 'mcq.json')),
      short: readIf(resolve(dir, 'short.json')),
    };
  }
  const csDir = resolve(content, 'case-studies');
  const caseStudies = existsSync(csDir)
    ? readdirSync(csDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => ({ file: `content/case-studies/${f}`, data: readIf(resolve(csDir, f)) }))
    : [];
  return {
    studyDesign: readIf(resolve(content, 'study-design.json')),
    areas,
    terms: readIf(resolve(content, 'terms.json')),
    psm: readIf(resolve(content, 'psm.json')),
    caseStudies,
  };
}

/**
 * Content check: every file passes its Zod schema, ids are unique, every KK reference exists,
 * MCQs are well formed, no duplicate stems, no raw HTML, and the Section 8.2 floors are met.
 *
 *   npm run content:check            strict (floors enforced), as in the deploy workflow
 *   npm run content:check -- --floors=warn   report floors without failing (branch CI while content is authored)
 */
import { checkContent } from '../src/content/check';
import { readContentDir } from './readContent';

const floorsWarn = process.argv.includes('--floors=warn');
const report = checkContent(readContentDir());

for (const w of report.warnings) console.warn(`warn  ${w}`);
for (const e of report.errors) console.error(`error ${e}`);
for (const f of report.floorErrors) (floorsWarn ? console.warn : console.error)(`${floorsWarn ? 'warn ' : 'error'} floor: ${f}`);

const t = report.totals;
console.info(`content: ${t.cards} cards (${t.terms} glossary), ${t.mcq} MCQs, ${t.short} short answers, ${t.caseStudies} case studies`);

const failed = report.errors.length > 0 || (!floorsWarn && report.floorErrors.length > 0);
if (failed) {
  console.error(`content-check: ${report.errors.length} error(s), ${report.floorErrors.length} floor shortfall(s)`);
  process.exit(1);
}
console.info('content-check: ok');

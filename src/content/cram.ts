/**
 * Learn's front page (docs/LEARN.md, D-225): the whole course as short definitions, grouped by
 * area, from content/cram.json. Each entry is condensed from content that was already checked and
 * names the items it came from. The file is small, so it ships inside the Learn chunk; bundled
 * content is validated in CI, so its shape is trusted here.
 */
import raw from '../../content/cram.json';
import type { CramArea, CramFile } from './schema';

export const cramAreas: readonly CramArea[] = (raw as CramFile).areas;

/** How many definitions the list holds in all. */
export const cramTotal: number = cramAreas.reduce((n, a) => n + a.entries.length, 0);

/**
 * Exam screen states in the URL (`/exam`, `/exam?mini=1`, `/exam?sit=1`, `/exam?report=<id>`), so a
 * reload returns to the same place. Built here rather than in src/app/paths.ts because only the
 * exam screen reads them.
 */
import { paths } from '../app/paths';
import type { ExamMode, SectionId } from './store';

/** The paper in progress: sitting it, or marking it once submitted. */
export const examSitPath = `${paths.exam}?sit=1`;

export function examReportPath(id: string): string {
  return `${paths.exam}?${new URLSearchParams({ report: id }).toString()}`;
}

export const SECTION_LETTER: Record<SectionId, string> = { a: 'A', b: 'B', c: 'C' };
export const SECTION_KIND: Record<SectionId, string> = { a: 'multiple choice', b: 'short answer', c: 'case study' };

export function modeName(mode: ExamMode): string {
  return mode === 'full' ? 'Full paper' : 'Mini paper';
}

const longDate = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "Wednesday 30 September 2026". */
export function formatDate(ts: number): string {
  return longDate.format(new Date(ts)).replace(',', '');
}

/** Question numbers in words, with runs of three or more as ranges: "4, 7 and 12", "1 to 3 and 5 to 13". */
export function numberList(numbers: readonly number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    if (j - i >= 2) parts.push(`${sorted[i]} to ${sorted[j]}`);
    else for (let k = i; k <= j; k++) parts.push(String(sorted[k]));
    i = j + 1;
  }
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

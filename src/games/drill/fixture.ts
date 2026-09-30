/** Test fixture: a small content index with MCQs on a few KKs. Imported by tests only. */
import { buildIndex, type ContentIndex } from '../../content/loader';
import type { KkId, Mcq, PsmFile } from '../../content/schema';

export function fixtureMcq(id: string, kk: KkId[]): Mcq {
  return {
    id,
    kk,
    stem: `Which option is right for ${id}?`,
    options: ['One', 'Two', 'Three', 'Four'],
    answer: 2,
    explanation: 'Because **three**.',
    whyWrong: ['Not one.', 'Not two.', '', 'Not four.'],
    difficulty: 1,
    source: 'textbook',
  };
}

const EMPTY_PSM = { stages: [], specifications: [], cards: [], mcq: [], short: [] } as unknown as PsmFile;

export function fixtureContent(): ContentIndex {
  const u3o1 = [
    ...Array.from({ length: 6 }, (_, i) => fixtureMcq(`m-u3o1-kk12-00${i}`, ['U3O1-KK12'])),
    ...Array.from({ length: 4 }, (_, i) => fixtureMcq(`m-u3o1-kk04-00${i}`, ['U3O1-KK04'])),
    fixtureMcq('m-u3o1-kk10-000', ['U3O1-KK10', 'U3O1-KK04']),
  ];
  const u4o2 = Array.from({ length: 5 }, (_, i) => fixtureMcq(`m-u4o2-kk04-00${i}`, ['U4O2-KK04']));
  return buildIndex({
    areas: [
      { cards: [], mcq: u3o1, short: [] },
      { cards: [], mcq: [], short: [] },
      { cards: [], mcq: [], short: [] },
      { cards: [], mcq: u4o2, short: [] },
    ],
    terms: [],
    psm: EMPTY_PSM,
    caseStudies: [],
  });
}

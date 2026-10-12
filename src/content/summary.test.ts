import { describe, expect, it } from 'vitest';
import bundledSummary from 'virtual:coldboot-content-summary';
import { loadAllContent } from './loader';
import { countFor, summarise } from './summary';
import { fxCard, fxCaseStudy, fxMcq, fxShort } from '../app/study/testing';

describe('summarise', () => {
  it('counts an item under each KK it is tagged with, and once in the totals', () => {
    const summary = summarise({
      cards: [fxCard('c-u3o1-kk04-001', ['U3O1-KK04']), fxCard('t-array', ['TERMS'])],
      mcq: [fxMcq('m-u3o1-kk04-001', ['U3O1-KK04', 'U3O1-KK05']), fxMcq('m-u3o1-kk05-001', ['U3O1-KK05'])],
      short: [fxShort('s-u3o1-kk04-001', ['U3O1-KK04'])],
      caseStudies: [fxCaseStudy('cs-01')],
    });
    expect(summary.kk['U3O1-KK04']).toEqual({ cards: 1, mcq: 1, short: 1 });
    expect(countFor(summary, 'U3O1-KK05', 'mcq')).toBe(2);
    expect(countFor(summary, 'U3O2-KK01', 'short')).toBe(0);
    expect(summary.total).toEqual({ cards: 2, mcq: 2, short: 1 });
    const cs = fxCaseStudy('cs-01');
    expect(summary.caseStudies).toEqual([{ id: 'cs-01', title: cs.title, questions: cs.questions.length, totalMarks: cs.totalMarks }]);
  });
});

describe('the build summary', () => {
  it('matches the content the app loads', async () => {
    expect(bundledSummary).toEqual(summarise(await loadAllContent()));
  });
});

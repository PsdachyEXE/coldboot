/**
 * content/cram.json, Learn's short definitions (D-225): the file as written, and each rule the
 * checker holds it to, shown by breaking a copy of it one way at a time.
 */
import { describe, expect, it } from 'vitest';
import { checkContent } from '../src/content/check';
import { CRAM_AREA_IDS, CRAM_MAX_WORDS, type Card, type CramFile } from '../src/content/schema';
import { readContentDir } from '../scripts/readContent';

const raw = readContentDir();
const cram = raw.cram as CramFile;
const glossary = raw.terms as Card[];

/** The checker's errors about cram.json once `change` has been applied to a copy of it. */
function errorsAfter(change: (file: CramFile) => void): string[] {
  const copy = structuredClone(cram);
  change(copy);
  return checkContent({ ...raw, cram: copy }).errors.filter((e) => e.startsWith('content/cram.json'));
}

const entry = (file: CramFile, area: string, term: string) => file.areas.find((a) => a.id === area)!.entries.find((e) => e.term === term)!;

describe('cram.json', () => {
  it('covers the course in five short sections', () => {
    expect(cram.areas.map((a) => a.id)).toEqual([...CRAM_AREA_IDS]);
    const total = cram.areas.reduce((n, a) => n + a.entries.length, 0);
    expect(total).toBeGreaterThanOrEqual(120);
    expect(total).toBeLessThanOrEqual(170);
    for (const area of cram.areas) {
      expect(area.entries.length, area.id).toBeGreaterThanOrEqual(20);
      expect(area.entries.length, area.id).toBeLessThanOrEqual(40);
    }
  });

  it('lists every official Term once, under the name the glossary gives it', () => {
    const official = cram.areas.flatMap((a) => a.entries.filter((e) => e.official).map((e) => e.term));
    expect(official.sort()).toEqual(glossary.map((t) => t.front).sort());
  });

  it('passes the checker as written, and is counted', () => {
    expect(errorsAfter(() => {})).toEqual([]);
    const total = cram.areas.reduce((n, a) => n + a.entries.length, 0);
    expect(checkContent(raw).totals.cram).toBe(total);
  });

  it('keeps its sections in order', () => {
    const errors = errorsAfter((file) => file.areas.reverse());
    expect(errors.some((e) => e.includes('Area 1 must be U3O1'))).toBe(true);
  });

  it('rejects a term that appears twice, in one area or across two', () => {
    expect(
      errorsAfter((file) => {
        entry(file, 'U3O1', 'Record').term = 'Class';
      }),
    ).toEqual([expect.stringContaining('U3O1 "Class" repeats a term (also in U3O1)')]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O1', 'Breakpoint').term = 'record';
      }),
    ).toEqual([expect.stringContaining('U4O1 "record" repeats a term (also in U3O1)')]);
  });

  it('rejects two entries with the same definition', () => {
    const errors = errorsAfter((file) => {
      entry(file, 'U4O2', 'Goal').definition = entry(file, 'U4O2', 'Risk').definition.toUpperCase();
    });
    expect(errors).toEqual([expect.stringContaining('U4O2 "Risk" has the same definition as "Goal"')]);
  });

  it(`rejects a definition of more than ${CRAM_MAX_WORDS} words`, () => {
    const words = Array.from({ length: CRAM_MAX_WORDS }, (_, i) => `word${i}`).join(' ');
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').definition = `${words}.`;
      }),
    ).toEqual([]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').definition = `${words} more.`;
      }),
    ).toEqual([expect.stringContaining(`U4O2 "Goal" has a definition of ${CRAM_MAX_WORDS + 1} words`)]);
  });

  it('rejects a source that is not a card, term, lesson or key knowledge id, or psm', () => {
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').sources = ['c-u4o2-kk01-999'];
      }),
    ).toEqual([expect.stringContaining('U4O2 "Goal" cites c-u4o2-kk01-999')]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').sources = ['l-u4o2-kk01', 'U4O2-KK01', 'psm', 't-ethics', 'psm-c-001'];
      }),
    ).toEqual([]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').sources = ['From memory'];
      }),
    ).toEqual([expect.stringContaining('Expected a content id, a KK id or psm')]);
  });

  it('rejects raw HTML and cloze gaps, but allows use case stereotypes', () => {
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').definition = 'A <b>broad</b> aim.';
      }),
    ).toEqual([expect.stringContaining('U4O2 "Goal" contains raw HTML')]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').definition = 'A broad {{aim}}.';
      }),
    ).toEqual([expect.stringContaining('U4O2 "Goal" contains a cloze gap')]);
    expect(cram.areas[1].entries.some((e) => e.term === '<<includes>>')).toBe(true);
  });

  it('rejects a definition that names its own term, with or without its bracketed part, or by an alias', () => {
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').definition = 'The goal an organisation sets itself.';
      }),
    ).toEqual([expect.stringContaining('U4O2 "Goal" has a definition that names its own term (Goal)')]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O1', 'Private (access modifier)').definition = 'Makes a member private to its class.';
      }),
    ).toEqual([expect.stringContaining('names its own term (Private)')]);
    // "back-up" is an alias of the official term Backup in terms.json.
    expect(
      errorsAfter((file) => {
        entry(file, 'U3O2', 'Backup').definition = 'A back-up copy of data, kept apart from the original.';
      }),
    ).toEqual([expect.stringContaining('names its own term (back-up)')]);
    // Part of a longer word is not the term.
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').definition = 'What the goalkeeper of an organisation wants.';
      }),
    ).toEqual([]);
  });

  it('holds official entries to the glossary: marked, named as it names them, cited, and in the right section', () => {
    expect(
      errorsAfter((file) => {
        delete entry(file, 'U3O1', 'Validation').official;
      }),
    ).toEqual([
      expect.stringContaining('U3O1 "Validation" is one of the Terms used in this study (t-validation), so it must be marked official'),
      expect.stringContaining('no official entry for the glossary term "Validation"'),
    ]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U4O2', 'Goal').official = true;
      }),
    ).toEqual([expect.stringContaining('U4O2 "Goal" is marked official, so it must be named as terms.json names it and cite that card')]);
    expect(
      errorsAfter((file) => {
        entry(file, 'U3O1', 'Validation').sources = ['c-u3o1-kk10-007'];
      }),
    ).toEqual([expect.stringContaining('U3O1 "Validation" is marked official'), expect.stringContaining('no official entry for the glossary term "Validation"')]);
    // Validation is tagged U3O1-KK10 first, so it belongs with Programming; Verification has no key knowledge point, so it sits with the PSM.
    expect(
      errorsAfter((file) => {
        const from = file.areas[0].entries;
        file.areas[2].entries.push(
          ...from.splice(
            from.findIndex((e) => e.term === 'Validation'),
            1,
          ),
        );
      }),
    ).toEqual([expect.stringContaining('U4O1 "Validation" is official term t-validation, which belongs in U3O1')]);
    expect(
      errorsAfter((file) => {
        const from = file.areas[4].entries;
        file.areas[0].entries.push(
          ...from.splice(
            from.findIndex((e) => e.term === 'Verification'),
            1,
          ),
        );
      }),
    ).toEqual([expect.stringContaining('U3O1 "Verification" is official term t-verification, which belongs in PSM')]);
  });

  it('is a file the content reader knows', () => {
    expect(raw.unknownFiles).toEqual([]);
  });
});

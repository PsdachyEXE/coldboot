import { describe, expect, it } from 'vitest';
import { loadAllContent } from '../../content/loader';
import { studyDesign } from '../../content/studyDesign';
import { assembleNotes, isLearnKk, LEARN_ORDER, MIN_NOTE_CARDS, neighbours, psmNotes, psmTraps, revealCloze, termsByArea } from './notes';

describe('Learn notes on the real content', async () => {
  const content = await loadAllContent();

  it("builds every key knowledge point's notes from its own cards, then supporting ones", () => {
    for (const kk of studyDesign.kks.map((k) => k.id)) {
      const notes = assembleNotes(kk as never, content)!;
      const cards = [...notes.definitions, ...notes.comparisons, ...notes.points];
      // Every page has at least six cards' worth of reading, counting the official terms tagged with it.
      expect(cards.length + notes.terms.length, kk).toBeGreaterThanOrEqual(MIN_NOTE_CARDS);
      expect(
        cards.every((c) => c.kk.includes(kk as never)),
        kk,
      ).toBe(true);
      expect(
        cards.some((c) => c.kk.includes('TERMS') || c.kk.includes('PSM')),
        kk,
      ).toBe(false);
      expect(new Set(cards.map((c) => c.id)).size, kk).toBe(cards.length);
      expect(new Set(notes.traps).size, kk).toBe(notes.traps.length);
      expect(notes.definitions.every((c) => c.type === 'reverse')).toBe(true);
      expect(notes.comparisons.every((c) => c.type === 'compare')).toBe(true);
    }
  });

  it('tops up a point with few cards of its own from cards that also support it', () => {
    const notes = assembleNotes('U3O1-KK02', content)!;
    const cards = [...notes.definitions, ...notes.comparisons, ...notes.points];
    expect(cards.filter((c) => c.kk[0] === 'U3O1-KK02').length).toBeLessThan(MIN_NOTE_CARDS);
    expect(cards.length).toBeGreaterThan(cards.filter((c) => c.kk[0] === 'U3O1-KK02').length);
  });

  it('lists the official terms and games tagged with a point', () => {
    const notes = assembleNotes('U3O1-KK04', content)!;
    expect(notes.games.map((g) => g.id)).toContain('types');
    const encryption = assembleNotes('U4O2-KK04', content)!;
    expect(encryption.terms.map((t) => t.front)).toContain('Encryption');
    expect(encryption.practice.mcq).toBeGreaterThan(0);
  });

  it('has no notes for the groups or an unknown id; they have their own pages', () => {
    expect(assembleNotes('TERMS', content)).toBeNull();
    expect(assembleNotes('U3O1-KK99' as never, content)).toBeNull();
  });

  it('groups every official term exactly once', () => {
    const groups = termsByArea(content);
    const fronts = groups.flatMap((g) => g.terms.map((t) => t.front));
    expect(fronts).toHaveLength(content.terms.length);
    expect(new Set(fronts).size).toBe(content.terms.length);
    expect(groups.at(-1)!.area).toBeNull();
  });

  it('files every PSM specification note under one stage', () => {
    const stages = psmNotes(content.psm);
    expect(stages.map((s) => s.name)).toEqual(['Analysis', 'Design', 'Development', 'Evaluation']);
    expect(stages.flatMap((s) => s.specifications)).toHaveLength(content.psm.specifications.length);
    expect(stages.flatMap((s) => s.specifications).every((n) => /^[A-Z]/.test(n))).toBe(true);
    expect(psmTraps(content.psm).length).toBeGreaterThan(0);
  });
});

describe('Learn page order', () => {
  it('runs through the 52 points by area, then the Terms and the PSM', () => {
    expect(LEARN_ORDER).toHaveLength(54);
    expect(LEARN_ORDER.slice(-2)).toEqual(['TERMS', 'PSM']);
    expect(neighbours('U3O1-KK01')).toEqual({ prev: null, next: 'U3O1-KK02' });
    expect(neighbours('U3O1-KK14')).toEqual({
      prev: 'U3O1-KK13',
      next: 'U3O2-KK01',
    });
    expect(neighbours('PSM')).toEqual({ prev: 'TERMS', next: null });
  });

  it('knows which ids have a page', () => {
    expect(isLearnKk('U4O2-KK10')).toBe(true);
    expect(isLearnKk('PSM')).toBe(true);
    expect(isLearnKk('U4O2-KK11')).toBe(false);
    expect(isLearnKk('nonsense')).toBe(false);
  });

  it('shows cloze gaps in bold for reading', () => {
    expect(revealCloze('A price is stored as {{floating point}}.')).toBe('A price is stored as **floating point**.');
  });
});

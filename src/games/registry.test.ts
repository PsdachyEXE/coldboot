import { describe, expect, it } from 'vitest';
import { PSEUDO_KEYWORDS } from '../content/markdown';
import { DAILY_GENERATOR_GAMES } from './daily';
import { DRILL_GAME, GAMES, findGame } from './registry';

describe('game registry', () => {
  it('lists sort and search as P0 generator games with student-facing man pages', () => {
    for (const id of ['sort', 'search']) {
      const meta = findGame(id)!;
      expect(meta.priority).toBe('P0');
      expect(meta.generator).toBe(true);
      expect(meta.kk).toEqual(['U3O1-KK12']);
      expect(meta.man).toContain(`Usage: play ${id}`);
      expect(meta.summary.length).toBeGreaterThan(10);
    }
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
    expect(findGame('nope')).toBeUndefined();
  });

  it('loads games whose ids, titles and generators match their metadata', async () => {
    for (const meta of GAMES) {
      const game = await meta.load();
      expect(game.id).toBe(meta.id);
      expect(game.title).toBe(meta.title);
      expect(game.man).toBe(meta.man);
      if (meta.generator) expect(typeof game.generate).toBe('function');
      if ((DAILY_GENERATOR_GAMES as readonly string[]).includes(meta.id)) expect(meta.generator).toBe(true);
    }
  });

  it('keeps the drill out of the play list', async () => {
    expect(findGame('drill')).toBeUndefined();
    expect(DRILL_GAME.needsContent).toBe(true);
    expect((await DRILL_GAME.load()).id).toBe('drill');
  });

  it('writes man pages in sentence case without all-caps words', () => {
    for (const meta of [...GAMES, DRILL_GAME]) {
      const words = meta.man.match(/\b[A-Z]{2,}\b/g) ?? [];
      // Only KK and area ids, TERMS and PSM, and pseudocode keywords quoted as code may be capitalised.
      const code = new Set<string>([...PSEUDO_KEYWORDS, 'LENGTH']);
      expect(words.filter((w) => !code.has(w) && !/^(TERMS|PSM|KK\d*|U\dO\d)$/.test(w))).toEqual([]);
    }
  });
});

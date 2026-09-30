import { describe, expect, it } from 'vitest';
import { PSEUDO_KEYWORDS } from '../content/markdown';
import { DAILY_GENERATOR_GAMES } from './daily';
import { DRILL_GAME, GAMES, findGame } from './registry';

describe('game registry', () => {
  it("lists the P0 games, then the P1 games, in the brief's order with student-facing man pages", () => {
    const p0 = ['deskcheck', 'sort', 'search', 'triage', 'validate', 'blitz', 'daily'];
    const p1 = ['dfd', 'usecase', 'reqs', 'gantt', 'threat', 'law', 'naming', 'types', 'oop', 'psm'];
    expect(GAMES.slice(0, p0.length).map((g) => g.id)).toEqual(p0);
    const rest = GAMES.slice(p0.length);
    expect(rest.every((g) => g.priority === 'P1')).toBe(true);
    // P1 games follow the brief's order, whichever of them are built so far.
    expect(rest.map((g) => g.id)).toEqual(p1.filter((id) => rest.some((g) => g.id === id)));
    for (const meta of GAMES) {
      expect(meta.priority).toBe(p0.includes(meta.id) ? 'P0' : 'P1');
      const usage = meta.id === 'daily' ? 'Usage: daily' : meta.fixedDifficulty ? `Usage: play ${meta.id}` : `Usage: play ${meta.id} [--easy|--hard]`;
      expect(meta.man.endsWith(usage)).toBe(true);
      expect(meta.man.startsWith(`${meta.id} `)).toBe(true);
      expect(meta.summary.length).toBeGreaterThan(10);
    }
    expect(findGame('sort')!.kk).toEqual(['U3O1-KK12']);
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
    expect(findGame('nope')).toBeUndefined();
  });

  it('marks generator, content and one-level games', () => {
    const flags = (id: string) => {
      const m = findGame(id)!;
      return [Boolean(m.generator), Boolean(m.needsContent), Boolean(m.fixedDifficulty)];
    };
    for (const id of ['deskcheck', 'sort', 'search', 'triage', 'validate', 'reqs', 'gantt']) expect(flags(id)).toEqual([true, false, false]);
    expect(flags('blitz')).toEqual([false, true, true]);
    expect(flags('daily')).toEqual([false, true, true]);
    expect(flags('psm')).toEqual([false, true, false]);
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
      // Only KK and area ids, TERMS and PSM, pseudocode keywords quoted as code, and the wordmark in the share line may be capitalised.
      const code = new Set<string>([...PSEUDO_KEYWORDS, 'LENGTH', 'COLDBOOT']);
      expect(words.filter((w) => !code.has(w) && !/^(TERMS|PSM|KK\d*|U\dO\d)$/.test(w))).toEqual([]);
    }
  });
});

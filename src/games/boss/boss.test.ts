/**
 * The boss round: 500 seeds played to the end with the real generators and case studies, the lives
 * logic and the escalation order on fake generators, the case study slice and the self-marking
 * parser.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAllContent, type ContentIndex } from '../../content/loader';
import { FigureSchema, type CaseShort, type CaseStudy } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import { typedAnswer, wrongAnswer } from '../daily-game/testing';
import { mulberry32 } from '../prng';
import { GAMES } from '../registry';
import type { Difficulty, GameContext, QuizItem } from '../types';
import { BOSS_LIVES, BOSS_QUESTIONS, difficultyAt, loadBossGenerators, planBoss, startBoss, survived, type BossGenerator, type BossSession } from './index';
import { markedScore, parseMarkedPoints, pickCaseSlice, questionFigures, SLICE_MARKS } from './caseSlice';

const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();

function ctxWith(content: ContentIndex | null): GameContext {
  return { playerName: 'Test', now: () => NOW, content, mastery: () => null, today: '2026-10-01', daily: null };
}

/** Fake generators: the answer is "right"; "wrong" counts and is wrong; anything else isn't an answer. */
function fakeGenerators(n: number, calls: { id: string; difficulty: Difficulty; seed: number }[] = []): BossGenerator[] {
  return Array.from({ length: n }, (_, g) => ({
    id: `game${g}`,
    generate: (seed: number, difficulty: Difficulty): QuizItem => {
      calls.push({ id: `game${g}`, difficulty, seed });
      return {
        id: `gen-game${g}`,
        kk: ['U3O1-KK12'],
        prompt: [{ kind: 'text', text: `Question from game${g} (${difficulty})` }],
        chips: ['right', 'wrong'],
        check: (input) =>
          input === 'right'
            ? { correct: true, expected: 'right', reason: 'Yes.' }
            : input === 'wrong'
              ? { correct: false, expected: 'right', reason: 'No.' }
              : { correct: false, expected: 'right', reason: 'Type right or wrong.', counted: false },
      };
    },
  }));
}

function caseShort(id: string, marks: number, points = marks): CaseShort {
  return {
    id,
    kk: ['U3O2-KK05'],
    commandTerm: 'explain',
    marks,
    prompt: `Prompt for ${id}.`,
    points: Array.from({ length: points }, (_, i) => ({ text: `Point ${i + 1} of ${id}.`, marks: 1 })),
    model: `Model answer for ${id}.`,
    source: 'textbook',
  };
}

function fakeCase(id: string, marks: number[]): CaseStudy {
  return {
    id,
    title: `Case ${id}`,
    insert: `**Org ${id}**\n\nAn invented organisation.`,
    figures: [],
    questions: marks.map((m, i) => caseShort(`${id}-q${String(i + 1).padStart(2, '0')}`, m)),
    totalMarks: marks.reduce((a, b) => a + b, 0),
  };
}

const fakeContent = (caseStudies: CaseStudy[]) => ({ caseStudies }) as unknown as ContentIndex;

function texts(blocks: readonly TerminalBlock[]): string {
  return blocks.map((b) => ('text' in b ? b.text : b.kind)).join('\n');
}

describe('boss plan', () => {
  it('climbs from easy to normal to hard in thirds', () => {
    expect(Array.from({ length: BOSS_QUESTIONS }, (_, i) => difficultyAt(i))).toEqual([
      ...Array<Difficulty>(5).fill('easy'),
      ...Array<Difficulty>(5).fill('normal'),
      ...Array<Difficulty>(5).fill('hard'),
    ]);
    expect(difficultyAt(0, 6)).toBe('easy');
    expect(difficultyAt(2, 6)).toBe('normal');
    expect(difficultyAt(5, 6)).toBe('hard');
  });

  it('uses every game once before any repeats, and is the same for the same seed', () => {
    const ids = GAMES.filter((g) => g.generator).map((g) => g.id);
    for (let seed = 0; seed < 200; seed++) {
      const plan = planBoss(seed, ids);
      expect(plan).toHaveLength(BOSS_QUESTIONS);
      expect(new Set(plan.map((s) => s.gameId)).size).toBe(Math.min(ids.length, BOSS_QUESTIONS));
      expect(planBoss(seed, ids)).toEqual(plan);
      expect(new Set(plan.map((s) => s.seed)).size).toBe(BOSS_QUESTIONS);
    }
    const few = planBoss(7, ['a', 'b', 'c', 'd']);
    for (let i = 0; i < 12; i += 4) expect(new Set(few.slice(i, i + 4).map((s) => s.gameId)).size).toBe(4);
    expect(planBoss(1, [])).toEqual([]);
  });

  it('asks each generator for easy, then normal, then hard items, in plan order', () => {
    const calls: { id: string; difficulty: Difficulty; seed: number }[] = [];
    const session = startBoss(ctxWith(null), fakeGenerators(15, calls), 42);
    const plan = session.state.plan;
    for (let i = 0; i < BOSS_QUESTIONS; i++) {
      const blocks = session.prompt();
      expect(texts(blocks)).toContain(`${['Easy', 'Normal', 'Hard'][Math.floor(i / 5)]} question from ${plan[i].gameId}.`);
      session.answer('right');
    }
    expect(calls.map((c) => c.difficulty)).toEqual(plan.map((s) => s.difficulty));
    expect(calls.map((c) => c.id)).toEqual(plan.map((s) => s.gameId));
    expect(calls.map((c) => c.seed)).toEqual(plan.map((s) => s.seed));
    expect(new Set(calls.map((c) => c.id)).size).toBe(15);
  });
});

describe('boss lives', () => {
  it('costs a life for each wrong answer and ends the climb at zero lives', () => {
    const session = startBoss(ctxWith(null), fakeGenerators(15), 3);
    const wrongAt = new Set([4, 9, 12]);
    for (let q = 1; q <= 12; q++) {
      expect(session.state.phase).toBe('climb');
      session.prompt();
      const r = session.answer(wrongAt.has(q) ? 'wrong' : 'right');
      expect(r.counted).not.toBe(false);
      const lost = [...wrongAt].filter((w) => w <= q).length;
      expect(session.state.lives).toBe(BOSS_LIVES - lost);
      if (wrongAt.has(q)) expect(texts(r.followUp ?? [])).toMatch(q === 12 ? /That was your last life/ : /That costs a life/);
    }
    // No case study is installed, so the round ends with the climb.
    expect(session.state.phase).toBe('done');
    expect(session.done).toBe(true);
    expect(session.state.answered).toBe(12);
    expect(survived(session.state.answered, session.state.lives)).toBe(11);
    const summary = texts(session.summary().blocks) + JSON.stringify(session.summary().blocks);
    expect(summary).toContain('Questions survived');
    expect(summary).toContain('11 of 15');
    expect(summary).toContain('0 of 3');
    expect(summary).toContain('None installed');
  });

  it("doesn't cost a life for input that isn't an answer", () => {
    const session = startBoss(ctxWith(null), fakeGenerators(15), 5);
    session.prompt();
    const r = session.answer('maybe');
    expect(r.counted).toBe(false);
    expect(session.state).toMatchObject({ lives: 3, answered: 0, phase: 'climb' });
    expect(session.progress).toEqual({ current: 1, total: 15 });
  });

  it('survives all 15 with lives to spare, then moves to the case study', () => {
    const session = startBoss(ctxWith(fakeContent([fakeCase('cs-90', [4, 4, 4, 2])])), fakeGenerators(15), 9);
    for (let q = 1; q <= 15; q++) {
      session.prompt();
      const r = session.answer(q === 2 || q === 14 ? 'wrong' : 'right');
      if (q === 15) expect(texts(r.followUp ?? [])).toContain('You survived all 15 questions, with 1 life left. Now the case study');
    }
    expect(session.state).toMatchObject({ phase: 'case', lives: 1, answered: 15, correct: 13 });
    expect(survived(15, 1)).toBe(15);
    expect(session.progress).toEqual({ current: 1, total: 3 });
  });

  it('goes on to the case study after the last life, and the case study costs no lives', () => {
    const cs = fakeCase('cs-91', [3, 4, 5]);
    const session = startBoss(ctxWith(fakeContent([cs])), fakeGenerators(15), 11);
    for (let q = 0; q < 3; q++) {
      session.prompt();
      session.answer('wrong');
    }
    expect(session.state).toMatchObject({ phase: 'case', lives: 0, answered: 3 });
    for (const q of cs.questions as CaseShort[]) {
      const shown = texts(session.prompt());
      expect(shown).toContain(q.prompt);
      expect(session.chips!()).toEqual(['skip']);
      const reveal = session.answer('My answer.');
      expect(reveal).toMatchObject({ counted: false, advanced: true });
      expect(session.state.marking).toBe(true);
      const marking = session.prompt();
      expect(texts(marking)).toContain(q.model);
      expect(marking.find((b) => b.kind === 'choices')).toMatchObject({ labels: 'numbers', options: q.points.map((p) => `${p.text} (1 mark)`) });
      expect(session.chips!()).toEqual(['all', 'none']);
      expect(session.answer('7 cats')).toMatchObject({ counted: false });
      const marked = session.answer('1 2');
      expect(marked).toMatchObject({ selfMarked: true, itemId: q.id, score: 2 / q.marks, correct: q.marks === 2 });
      expect(texts(marked.followUp ?? [])).toContain(`You gave yourself 2 of ${q.marks} marks.`);
      expect(session.state.lives).toBe(0);
    }
    expect(session.done).toBe(true);
    expect(session.state.caseResults).toEqual([
      { itemId: 'cs-91-q01', earned: 2, marks: 3 },
      { itemId: 'cs-91-q02', earned: 2, marks: 4 },
      { itemId: 'cs-91-q03', earned: 2, marks: 5 },
    ]);
    const s = session.summary();
    const table = s.blocks.find((b) => b.kind === 'table');
    expect(table).toMatchObject({
      rows: [
        ['Questions survived', '2 of 15'],
        ['Lives left', '0 of 3'],
        ['Correct answers', '0 of 3'],
        ['Case study', '6 of 12 marks'],
      ],
    });
    expect(s.total).toBe(6);
    expect(s.score).toBeCloseTo(2 / 3 + 2 / 4 + 2 / 5);
  });
});

describe('the case study slice', () => {
  it('takes three short answers from one case study, in order, worth 9 to 15 marks', () => {
    const studies = [fakeCase('cs-80', [3, 4, 6, 5, 2]), fakeCase('cs-81', [8, 8]), fakeCase('cs-82', [4, 4, 4])];
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      const slice = pickCaseSlice(studies, seed)!;
      seen.add(slice.caseStudy.id);
      expect(slice.caseStudy.id).not.toBe('cs-81');
      expect(slice.questions).toHaveLength(3);
      const ids = slice.questions.map((q) => q.id);
      expect([...ids].sort()).toEqual(ids);
      const marks = slice.questions.reduce((n, q) => n + q.marks, 0);
      expect(marks).toBeGreaterThanOrEqual(SLICE_MARKS.min);
      expect(marks).toBeLessThanOrEqual(SLICE_MARKS.max);
      expect(pickCaseSlice([...studies].reverse(), seed)).toEqual(slice);
    }
    expect(seen).toEqual(new Set(['cs-80', 'cs-82']));
    expect(pickCaseSlice([fakeCase('cs-81', [8, 8])], 1)).toBeNull();
    expect(pickCaseSlice([], 1)).toBeNull();
    // With no triple in range, the one closest to 12 marks.
    expect(pickCaseSlice([fakeCase('cs-83', [8, 8, 8, 9])], 1)!.questions.map((q) => q.marks)).toEqual([8, 8, 8]);
  });

  it("shows a question's own figures and the insert figures it refers to", () => {
    const cs: CaseStudy = {
      ...fakeCase('cs-84', [3, 3, 3]),
      figures: [
        { id: 'fig-a', kind: 'table', title: 'Figure 1: A', columns: ['X'], rows: [['1']] },
        { id: 'fig-b', kind: 'table', title: 'Figure 2: B', columns: ['Y'], rows: [['2']] },
      ],
    };
    const q = { ...(cs.questions[0] as CaseShort), figureRefs: ['fig-b'] };
    expect(questionFigures(cs, q).map((f) => f.title)).toEqual(['Figure 2: B']);
    expect(questionFigures(cs, cs.questions[1] as CaseShort)).toEqual([]);
  });
});

describe('self-marking', () => {
  it('reads the points a student earned leniently', () => {
    expect(parseMarkedPoints('1 3', 4)).toEqual([0, 2]);
    expect(parseMarkedPoints('1, 3', 4)).toEqual([0, 2]);
    expect(parseMarkedPoints('1,3', 4)).toEqual([0, 2]);
    expect(parseMarkedPoints('1 and 3', 4)).toEqual([0, 2]);
    expect(parseMarkedPoints('Points 3 and 1.', 4)).toEqual([0, 2]);
    expect(parseMarkedPoints('13', 4)).toEqual([0, 2]);
    expect(parseMarkedPoints('3 1 3', 4)).toEqual([0, 2]);
    expect(parseMarkedPoints('1-3', 4)).toEqual([0, 1, 2]);
    expect(parseMarkedPoints('2 - 4', 4)).toEqual([1, 2, 3]);
    expect(parseMarkedPoints('all', 4)).toEqual([0, 1, 2, 3]);
    expect(parseMarkedPoints(' ALL ', 2)).toEqual([0, 1]);
    expect(parseMarkedPoints('none', 4)).toEqual([]);
    expect(parseMarkedPoints('0', 4)).toEqual([]);
    expect(parseMarkedPoints('Nothing', 4)).toEqual([]);
  });

  it('refuses anything that is not a list of point numbers', () => {
    for (const bad of ['', '   ', '5', '0 1', '1 5', '3-1', '2/3', 'two', '1 point', 'maybe', '1.5', '-1', '10', '15']) {
      expect(parseMarkedPoints(bad, 4), bad).toBeNull();
    }
    expect(parseMarkedPoints('12', 4)).toEqual([0, 1]);
    // With ten or more points, "12" is point 12.
    expect(parseMarkedPoints('12', 12)).toEqual([11]);
    expect(parseMarkedPoints('13', 12)).toBeNull();
  });

  it('caps the marks at what the question is worth', () => {
    const q = { marks: 2, points: [{ text: 'a', marks: 1 }, { text: 'b', marks: 1 }, { text: 'c', marks: 1 }] };
    expect(markedScore(q, [0, 1, 2])).toEqual({ earned: 2, score: 1 });
    expect(markedScore(q, [2])).toEqual({ earned: 1, score: 0.5 });
    expect(markedScore(q, [])).toEqual({ earned: 0, score: 0 });
  });
});

describe('boss over 500 seeds with the real games and content', () => {
  let generators: BossGenerator[];
  let content: ContentIndex;
  beforeAll(async () => {
    generators = await loadBossGenerators();
    content = await loadAllContent();
  }, 60_000);

  it('loads every generator game in the registry', () => {
    expect(generators.map((g) => g.id)).toEqual(GAMES.filter((g) => g.generator).map((g) => g.id));
    expect(generators.length).toBeGreaterThanOrEqual(BOSS_QUESTIONS);
  });

  it('plays to the end without crashing, whatever the answers', () => {
    const casesSeen = new Set<string>();
    for (let s = 0; s < 500; s++) {
      const seed = s * 7919 + 13;
      const rng = mulberry32(seed);
      const session: BossSession = startBoss(ctxWith(content), generators, seed);
      let steps = 0;
      let wrong = 0;
      while (!session.done) {
        if (++steps > 200) throw new Error(`seed ${seed} never finished`);
        const blocks = session.prompt();
        expect(blocks.length, `seed ${seed}`).toBeGreaterThan(0);
        for (const b of blocks) if (b.kind === 'figure') expect(FigureSchema.safeParse(b.figure).success, `seed ${seed}`).toBe(true);
        expect(session.current!(), `seed ${seed}`).not.toBeNull();
        session.chips!();
        const st = session.state;
        if (st.phase === 'climb') {
          const item = st.item!;
          const right = rng() < 0.8;
          const r = session.answer(right ? typedAnswer(item) : wrongAnswer(item));
          expect(r.correct, `seed ${seed} ${item.instance}`).toBe(right);
          if (!right) wrong++;
          expect(session.state.lives).toBe(Math.max(0, BOSS_LIVES - wrong));
        } else {
          casesSeen.add(st.slice!.caseStudy.id);
          if (!st.marking) expect(session.answer(rng() < 0.5 ? 'skip' : 'An answer about the case study.')).toMatchObject({ advanced: true });
          else {
            const n = st.slice!.questions[st.caseResults.length].points.length;
            const r = session.answer(rng() < 0.3 ? 'none' : rng() < 0.5 ? 'all' : String(1 + Math.floor(rng() * n)));
            expect(r.selfMarked).toBe(true);
            expect(r.score).toBeGreaterThanOrEqual(0);
            expect(r.score).toBeLessThanOrEqual(1);
          }
        }
      }
      const { state } = session;
      // The climb ran to 15 questions, or stopped at the question that took the last life.
      if (wrong < BOSS_LIVES) expect(state.answered).toBe(BOSS_QUESTIONS);
      else expect(state.lives).toBe(0);
      expect(state.answered).toBeLessThanOrEqual(BOSS_QUESTIONS);
      expect(state.caseResults).toHaveLength(3);
      const summary = session.summary();
      expect(summary.total).toBe(state.answered + 3);
      expect(summary.blocks.find((b) => b.kind === 'table')).toBeDefined();
    }
    // Every installed case study with three short answers comes up.
    const eligible = content.caseStudies.filter((cs) => cs.questions.filter((q) => 'points' in q).length >= 3).map((cs) => cs.id);
    expect([...casesSeen].sort()).toEqual([...eligible].sort());
  }, 300_000);
});

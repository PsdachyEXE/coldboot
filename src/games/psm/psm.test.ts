/**
 * The psm game over 500 seeds at every difficulty, on the real content/psm.json. Every expected
 * answer is checked a second way: the test finds the activity or note shown in the prompt in the
 * raw JSON and reads its stage from there. No prompt shows an activity by a name that contains its
 * own stage (Solution design, the skills underpinning each stage), and every reason places each
 * activity shown in its stage.
 */
import { describe, expect, it } from 'vitest';
import psmJson from '../../../content/psm.json';
import { buildIndex } from '../../content/loader';
import { PSM_STAGE_IDS, PsmFileSchema, type PsmFile } from '../../content/schema';
import type { TerminalBlock } from '../../terminal/blocks';
import type { Difficulty, GameContext, QuizItem } from '../types';
import game from './index';
import { parseLetters, parseStage, planPsmRound, psmBank, psmItem, PSM_KINDS, STAGE_CHIPS } from './items';
import { PSM_MAN } from './meta';

const PSM: PsmFile = PsmFileSchema.parse(psmJson);
const BANK = psmBank(PSM)!;
const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 5);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

/** Stage number (1 to 4) of an activity found by its name or summary in the raw JSON. */
function stageOfActivity(text: string): number {
  const hits = PSM.stages.flatMap((s) => s.activities.filter((a) => a.name === text || a.summary === text).map(() => PSM_STAGE_IDS.indexOf(s.id) + 1));
  expect(hits, text).toHaveLength(1);
  return hits[0];
}

/** Activities whose official name contains their own stage's name, read from the raw JSON. */
const GIVEAWAYS = PSM.stages.flatMap((s) => s.activities.filter((a) => a.name.toLowerCase().includes(s.name.toLowerCase())).map((a) => a.name));

/** An activity found by its name or summary in the raw JSON, with its stage's lower-case name and number. */
function findActivity(text: string): { name: string; stage: string; n: number; byName: boolean } {
  const n = stageOfActivity(text);
  const stage = PSM.stages[n - 1];
  const a = stage.activities.find((x) => x.name === text || x.summary === text)!;
  return { name: a.name, stage: stage.name.toLowerCase(), n, byName: a.name === text };
}

function stageOfNote(text: string): number {
  const hits = PSM.specifications.filter((s) => s.toLowerCase().endsWith(text.toLowerCase()));
  expect(hits, text).toHaveLength(1);
  const name = hits[0].split(':')[0].toLowerCase();
  return PSM_STAGE_IDS.indexOf(name as (typeof PSM_STAGE_IDS)[number]) + 1;
}

function shownText(item: QuizItem): string {
  const b = item.prompt[1];
  return b.kind === 'text' || b.kind === 'markdown' ? b.text : '';
}

/** Every word the prompt shows, joined. */
function promptText(item: QuizItem): string {
  return item.prompt.map((b) => (b.kind === 'text' || b.kind === 'markdown' ? b.text : b.kind === 'choices' ? b.options.join('\n') : '')).join('\n');
}

/** The activities a stage, first or order prompt shows (by name or by summary). */
function shownActivities(item: QuizItem): string[] {
  const kind = item.id.replace('gen-psm-', '');
  return kind === 'stage' ? [shownText(item)] : kind === 'spec' ? [] : options(item);
}

function options(item: QuizItem): string[] {
  const block = item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'choices' }> => b.kind === 'choices');
  return block?.options ?? [];
}

/** The reference answer, typed, and a wrong one. */
function answers(item: QuizItem): { right: string; wrong: string } {
  const kind = item.id.replace('gen-psm-', '');
  if (kind === 'stage' || kind === 'spec') {
    const n = kind === 'stage' ? stageOfActivity(shownText(item)) : stageOfNote(shownText(item));
    return { right: PSM_STAGE_IDS[n - 1], wrong: String((n % 4) + 1) };
  }
  const stages = options(item).map(stageOfActivity);
  expect(new Set(stages).size).toBe(stages.length);
  const order = stages.map((_, i) => i).sort((a, b) => stages[a] - stages[b]);
  const letters = order.map((i) => 'ABC'[i]);
  if (kind === 'first') return { right: letters[0], wrong: letters[1] };
  return { right: letters.join(' '), wrong: [...letters].reverse().join(' ') };
}

describe('psm bank', () => {
  it('reads every stage, activity and specification note from the content', () => {
    expect(Object.keys(BANK.stageNames)).toEqual([...PSM_STAGE_IDS]);
    expect(BANK.activities).toHaveLength(PSM.stages.reduce((n, s) => n + s.activities.length, 0));
    // Every note but those that name a give-away activity of their own stage (the evaluation strategy and solution evaluation notes).
    const answered = PSM.specifications.filter((note) => GIVEAWAYS.some((g) => note.toLowerCase().startsWith(`${findActivity(g).stage}:`) && note.toLowerCase().includes(g.toLowerCase())));
    expect(answered).toHaveLength(2);
    expect(BANK.specs).toHaveLength(PSM.specifications.length - answered.length);
    expect(BANK.specs.map((n) => n.stage)).toEqual(expect.arrayContaining([...PSM_STAGE_IDS]));
    for (const note of BANK.specs) expect(note.text).not.toMatch(/^(Analysis|Design|Development|Evaluation):/);
  });

  it('marks the activities whose names give their stage away', () => {
    // The four skills entries and the three official names that contain their stage's word.
    expect(GIVEAWAYS).toHaveLength(7);
    expect(GIVEAWAYS).toEqual(expect.arrayContaining(['Solution design', 'Evaluation strategy', 'Solution evaluation']));
    for (const a of BANK.activities) {
      expect(a.named, a.name).toBe(!GIVEAWAYS.includes(a.name));
      expect(a.skills, a.name).toBe(a.name.startsWith('Skills underpinning'));
    }
    expect(BANK.activities.filter((a) => a.skills).map((a) => a.stage)).toEqual([...PSM_STAGE_IDS]);
    // The trap stays named: evaluation criteria are set in design.
    expect(BANK.activities.find((a) => a.name === 'Evaluation criteria')).toMatchObject({ stage: 'design', named: true });
  });

  it('is unavailable without the content', () => {
    expect(psmBank(null)).toBeNull();
    expect(psmBank({ ...PSM, stages: PSM.stages.slice(0, 3) })).toBeNull();
    const empty = buildIndex({ areas: [], terms: [], psm: { ...PSM, stages: [] as unknown as PsmFile['stages'] }, caseStudies: [] });
    const session = game.start(ctx(empty), { difficulty: 'normal', seed: 1 });
    expect(session.unavailable?.[0]).toMatchObject({ kind: 'text', text: expect.stringMatching(/isn't installed/) });
  });
});

describe('psm items', () => {
  it.each(LEVELS)('accept the reference answer and reject a wrong one (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      for (const kind of PSM_KINDS) {
        for (const described of [false, true]) {
          const item = psmItem(BANK, { kind, seed, described }, level);
          const { right, wrong } = answers(item);
          const label = `${item.instance}`;
          expect(item.check(right).correct, label).toBe(true);
          const r = item.check(wrong);
          expect(r.correct, label).toBe(false);
          expect(r.counted, label).not.toBe(false);
          expect(item.check('banana').counted, label).toBe(false);
          // The expected answer typed back is accepted.
          const expected = r.expected;
          const typed = kind === 'first' ? expected.charAt(0) : kind === 'order' ? expected : expected.replace(/ \(stage \d\)$/, '');
          expect(item.check(typed).correct, `${label}: ${typed}`).toBe(true);
          expect(psmItem(BANK, { kind, seed, described }, level).prompt).toEqual(item.prompt);
        }
      }
    }
  });

  it.each(LEVELS)('never shows an activity by a name that contains its own stage (%s, 500 seeds)', (level) => {
    for (const seed of SEEDS) {
      for (const kind of PSM_KINDS) {
        for (const described of [false, true]) {
          const item = psmItem(BANK, { kind, seed, described }, level);
          const text = promptText(item).toLowerCase();
          for (const name of GIVEAWAYS) expect(text, item.instance).not.toContain(name.toLowerCase());
          for (const s of PSM.stages) expect(text, item.instance).not.toContain(`${s.name.toLowerCase()} stage`);
          for (const shown of shownActivities(item)) {
            const a = findActivity(shown);
            if (a.byName) expect(shown.toLowerCase(), item.instance).not.toContain(a.stage);
          }
          if (kind === 'stage') {
            // A give-away name is swapped for its summary, and the prompt and instance say so.
            const { name, byName } = findActivity(shownText(item));
            expect(byName, item.instance).toBe(!described && !GIVEAWAYS.includes(name));
            expect(item.prompt[0], item.instance).toMatchObject({ text: byName ? 'Activity:' : 'A team member is doing this:' });
            expect(item.instance!.includes(':described:'), item.instance).toBe(!byName);
          }
        }
      }
    }
  });

  it.each(LEVELS)('gives a reason that places every activity shown in its stage (%s)', (level) => {
    for (const seed of SEEDS.slice(0, 200)) {
      for (const kind of PSM_KINDS) {
        const item = psmItem(BANK, { kind, seed }, level);
        const { reason } = item.check(answers(item).wrong);
        // A skills entry is never "Skills underpinning the analysis stage is part of analysis", nor "one of
        // the skills" (its summary lists several), and a plural name is never "Evaluation criteria is part of design".
        expect(reason, item.instance).not.toMatch(/Skills underpinning the \w+ stage (is|are) /i);
        expect(reason, item.instance).not.toMatch(/one of the skills/i);
        expect(reason, item.instance).not.toMatch(/^[A-Z][a-z]+ (requirements|constraints|criteria) is part of/);
        if (kind === 'spec') continue;
        shownActivities(item).forEach((text, i) => {
          const a = findActivity(text);
          const skills = a.name.startsWith('Skills underpinning');
          if (kind === 'stage') {
            // Named: "Evaluation criteria is a design activity. <its summary>"; described: "This describes
            // Solution design, a design activity. <stage gist>", without repeating the summary shown.
            const activity = `${/^[aeiou]/.test(a.stage) ? 'an' : 'a'} ${a.stage} activity`;
            const opening = skills ? `This describes the skills underpinning the ${a.stage} stage.` : a.byName ? `${a.name} is ${activity}.` : `This describes ${a.name}, ${activity}.`;
            expect(reason.startsWith(opening), `${item.instance}: ${reason}`).toBe(true);
            if (a.byName) expect(reason.endsWith(PSM.stages[a.n - 1].activities.find((x) => x.name === a.name)!.summary), item.instance).toBe(true);
            else expect(reason, item.instance).not.toContain(text);
          } else {
            // "A (Testing) is part of development (stage 3)", "B describes the skills underpinning evaluation (stage 4)".
            const clause = skills ? `${'ABC'[i]} describes the skills underpinning ${a.stage} (stage ${a.n})` : `${'ABC'[i]} (${a.name}) is part of ${a.stage} (stage ${a.n})`;
            expect(reason, item.instance).toContain(clause);
          }
        });
      }
    }
  });

  it('asks about every activity, and puts every stage in first and order questions', () => {
    for (const level of LEVELS) {
      const asked = new Set<string>();
      const compared = new Set<string>();
      for (const seed of SEEDS) {
        asked.add(shownText(psmItem(BANK, { kind: 'stage', seed }, level)));
        for (const kind of ['first', 'order'] as const) for (const o of options(psmItem(BANK, { kind, seed }, level))) compared.add(o);
      }
      const all = PSM.stages.flatMap((s) => s.activities.map((a) => (GIVEAWAYS.includes(a.name) ? a.summary : a.name)));
      expect([...asked].sort(), level).toEqual([...all].sort());
      expect([...compared].sort(), level).toEqual([...all].sort());
    }
  });

  it('accepts stage numbers and chips for stage questions', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const item = psmItem(BANK, { kind: 'stage', seed }, 'normal');
      const n = stageOfActivity(shownText(item));
      expect(item.check(String(n)).correct).toBe(true);
      expect(item.check(`stage ${n}`).correct).toBe(true);
      expect(STAGE_CHIPS.filter((c) => item.check(c).correct)).toHaveLength(1);
    }
  });

  it('parses stages and letters leniently', () => {
    expect(parseStage('Design')).toBe('design');
    expect(parseStage('the development stage')).toBe('development');
    expect(parseStage('4')).toBe('evaluation');
    expect(parseStage('Stage 1')).toBe('analysis');
    expect(parseStage('analyse')).toBe('analysis');
    expect(parseStage('5')).toBeNull();
    expect(parseStage('testing')).toBeNull();
    expect(parseLetters('b, a, c', 3)).toEqual([1, 0, 2]);
    expect(parseLetters('BAC', 3)).toEqual([1, 0, 2]);
    expect(parseLetters('B -> A -> C', 3)).toEqual([1, 0, 2]);
    expect(parseLetters('B A D', 3)).toBeNull();
  });
});

function ctx(content: GameContext['content']): GameContext {
  return { playerName: '', now: () => 1_000, content, mastery: () => null, today: '2026-10-01', daily: null };
}

describe('psm man page', () => {
  it('uses the official activity names and keeps the evaluation criteria trap', () => {
    expect(PSM_MAN).toContain('"Solution constraints" is part of analysis');
    expect(PSM_MAN).not.toMatch(/Identifying constraints|Defining scope|Determining solution requirements|Collecting evaluation data/i);
    expect(PSM_MAN).toMatch(/analysis: solution requirements, solution constraints and solution scope/);
    expect(PSM_MAN).toMatch(/design: solution design .*evaluation criteria/);
    expect(PSM_MAN).toMatch(/development: manipulation \(coding\), validation, testing and documentation/);
    expect(PSM_MAN).toMatch(/evaluation: the evaluation strategy .* and the solution evaluation/);
    // Requirements cover qualities as well as functions; the strategy's responsibility is collecting the data.
    expect(PSM_MAN).toMatch(/solution scope \(what the solution must do and the qualities it needs,/);
    expect(PSM_MAN).toMatch(/evaluation strategy \([^)]*time frame, and who collects it\)/);
    expect(PSM_MAN).not.toMatch(/by whom/);
    expect(PSM_MAN).toMatch(/skills underpinning/);
    expect(PSM_MAN).toMatch(/setting evaluation criteria happens in design, not evaluation/);
    // Every official activity name (bar the skills entries) appears, in lower case.
    for (const s of PSM.stages) for (const a of s.activities) if (!a.name.startsWith('Skills')) expect(PSM_MAN.toLowerCase(), a.name).toContain(a.name.toLowerCase());
  });
});

describe('psm rounds', () => {
  const content = buildIndex({ areas: [], terms: [], psm: PSM, caseStudies: [] });

  it.each(LEVELS)('plans the %s mix with no repeated question', (level) => {
    for (const seed of SEEDS.slice(0, 100)) {
      const plan = planPsmRound(BANK, seed, level);
      expect(plan).toHaveLength(10);
      const kinds = plan.map((p) => p.kind);
      if (level === 'easy') expect(kinds.filter((k) => k === 'spec' || k === 'order')).toHaveLength(0);
      if (level === 'hard') expect(kinds.filter((k) => k === 'order')).toHaveLength(2);
      const keys = plan.map((p) => psmItem(BANK, p, level).instance!.replace(/:seed=.*$/, ''));
      expect(new Set(keys).size).toBeGreaterThanOrEqual(9);
    }
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const session = game.start(ctx(content), { difficulty: level, seed: 3 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('???').expected;
      const typed = /^[AB]\. /.test(expected) ? expected.charAt(0) : expected.replace(/ \(stage \d\)$/, '');
      expect(session.answer(typed).correct).toBe(true);
    }
    expect(session.summary()).toMatchObject({ gameId: 'psm', score: 10, total: 10 });
  });
});

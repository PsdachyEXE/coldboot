/**
 * law: every scenario in the fixed bank has exactly one Act that applies, worked out a second way
 * from its recorded facts and the question's framing; every "why" question offers exactly one true
 * reason for that Act and only reasons that are false for the scenario, over 500 seeds at each
 * difficulty.
 */
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../types';
import { ACT_LABELS, ACTS, REASONS, SCENARIOS, type Act, type LawScenario } from './bank';
import game from './index';
import {
  ACT_CHIPS,
  actItem,
  falseReasons,
  fromLawInstance,
  generateLawItem,
  parseAct,
  planLawRound,
  scenariosFor,
  trueReason,
  whyItem,
  whyReasons,
} from './items';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 13);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const ctx = { playerName: '', now: () => 1_000, content: null, mastery: () => null, today: '2026-10-01', daily: null };

/**
 * The Acts that apply, from the textbook rules in bank.ts, applied independently of the reasons:
 * reuse of a work is a copyright question; otherwise the privacy Acts apply by who holds the
 * information and what kind it is. The question's framing then narrows to Victorian or
 * Commonwealth Acts.
 */
function applicableActs(s: LawScenario): Act[] {
  const f = s.facts;
  let acts: Act[];
  if (f.reuse) acts = ['copyright'];
  else {
    acts = [];
    if (f.sector === 'cth-agency' || (f.sector === 'private' && (f.turnoverAbove3m || f.healthProvider))) acts.push('privacy');
    if ((f.sector === 'vic-public' || f.sector === 'vic-contractor') && !f.healthInfo) acts.push('pdp');
    if (f.healthInfo && f.inVictoria) acts.push('health');
  }
  if (/Victorian Act/.test(s.ask)) acts = acts.filter((a) => a === 'pdp' || a === 'health');
  if (/Commonwealth Act/.test(s.ask)) acts = acts.filter((a) => a === 'privacy' || a === 'copyright');
  return acts;
}

describe('law bank', () => {
  it('gives every scenario exactly one applicable Act, the one it expects', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    expect(new Set(SCENARIOS.map((s) => s.story)).size).toBe(SCENARIOS.length);
    for (const s of SCENARIOS) expect(applicableActs(s), s.id).toEqual([s.act]);
    for (const act of ACTS) expect(SCENARIOS.filter((s) => s.act === act).length, act).toBeGreaterThanOrEqual(6);
    for (const level of LEVELS) for (const act of ACTS) expect(scenariosFor(level).filter((s) => s.act === act).length, `${act} ${level}`).toBeGreaterThanOrEqual(2);
  });

  it('asks for the Victorian or the Commonwealth Act wherever two Acts would apply', () => {
    for (const s of SCENARIOS) {
      const f = s.facts;
      const privacyToo = !f.reuse && f.sector === 'private' && (f.turnoverAbove3m || f.healthProvider);
      if (privacyToo && f.healthInfo && f.inVictoria) expect(s.ask, s.id).toMatch(/Victorian Act|Commonwealth Act/);
      if (f.sector === 'vic-contractor') expect(s.ask, s.id).toMatch(/Victorian Act/);
      if (s.act === 'health') expect(s.ask, s.id).toMatch(/Victorian Act/);
      // Where the other Act also applies, the feedback names it.
      if (/Commonwealth Act/.test(s.ask) && f.healthInfo) expect(s.why, s.id).toMatch(/Health Records Act/);
      if (s.act === 'health' && f.sector === 'private' && f.healthProvider) expect(s.why, s.id).toMatch(/also covered by the Privacy Act/);
    }
  });

  it('states what decides the answer in every story', () => {
    for (const s of SCENARIOS) {
      if (s.facts.sector === 'private') expect(s.story, s.id).toMatch(/turnover|small|two-person/);
      if (s.facts.sector === 'vic-public' || s.facts.sector === 'vic-contractor') expect(s.story, s.id).toMatch(/Victorian|public hospital/);
      if (s.facts.sector === 'cth-agency') expect(s.story, s.id).toMatch(/Australian Government/);
      expect(s.why, s.id).toMatch(/^[A-Z].*\.$/);
      expect(`${s.story} ${s.ask} ${s.why}`).not.toMatch(/’/);
    }
  });

  it('has one true reason for the Act and at least three false ones in every scenario', () => {
    for (const s of SCENARIOS) {
      const key = trueReason(s);
      expect(REASONS[key].act).toBe(s.act);
      expect(falseReasons(s).length, s.id).toBeGreaterThanOrEqual(3);
      expect(falseReasons(s)).not.toContain(key);
    }
  });
});

describe('law items', () => {
  it.each(LEVELS)('which-Act items accept exactly one Act (%s)', (level) => {
    for (const s of SCENARIOS) {
      const item = actItem(s.id, level);
      expect(ACT_CHIPS.filter((c) => item.check(c).correct), s.id).toEqual([LETTERS[ACTS.indexOf(s.act)]]);
      expect(ACTS.filter((a) => item.check(ACT_LABELS[a]).correct)).toEqual([s.act]);
      for (const c of ACT_CHIPS) expect(item.check(c).counted).not.toBe(false);
      expect(item.check(item.check('?').expected).correct).toBe(true);
      expect(item.check('E').counted).toBe(false);
      expect(item.check('the constitution').counted).toBe(false);
      expect(fromLawInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
  });

  it.each(LEVELS)('why items offer one true reason among false ones (%s, 500 seeds)', (level) => {
    for (const s of scenariosFor(level)) {
      for (const seed of SEEDS) {
        const keys = whyReasons(s, seed, level);
        expect(keys).toHaveLength(level === 'easy' ? 3 : 4);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.filter((k) => !falseReasons(s).includes(k))).toEqual([trueReason(s)]);
        const item = whyItem(s.id, seed, level);
        const letters = LETTERS.slice(0, keys.length);
        expect(letters.filter((l) => item.check(l).correct), `${s.id} ${seed}`).toEqual([letters[keys.indexOf(trueReason(s))]]);
        expect(item.check(LETTERS[keys.length]).counted).toBe(false);
        expect(item.check(item.check('?').expected).correct).toBe(true);
        expect(fromLawInstance(item.instance!)?.prompt).toEqual(item.prompt);
      }
    }
  });

  it('reads Acts by letter, full name or short name', () => {
    expect(parseAct('b')).toBe('pdp');
    expect(parseAct('Health Records Act 2001 (Vic)')).toBe('health');
    expect(parseAct('health records act')).toBe('health');
    expect(parseAct('the Privacy Act 1988')).toBe('privacy');
    expect(parseAct('PDP Act')).toBe('pdp');
    expect(parseAct('copyright')).toBe('copyright');
    expect(parseAct('C. Health Records Act 2001 (Vic)')).toBe('health');
    expect(parseAct('spam act')).toBeNull();
  });

  it('keeps a follow-up short and marks it as the same scenario', () => {
    const followUp = whyItem('state-school', 4, 'normal', true);
    expect(followUp.prompt[0]).toMatchObject({ kind: 'text', tone: 'muted', text: expect.stringMatching(/^Same scenario: /) });
    expect(whyItem('state-school', 4, 'normal').prompt[0]).toMatchObject({ kind: 'text', text: expect.not.stringMatching(/^Same scenario/) });
    expect(fromLawInstance(followUp.instance!)?.prompt).toEqual(followUp.prompt);
  });
});

describe('law rounds', () => {
  it('plans five scenarios, each asked as which Act then why, over at least three Acts', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        const plan = planLawRound(seed, level);
        expect(plan).toHaveLength(10);
        const ids: string[] = [];
        for (let i = 0; i < 10; i += 2) {
          const [act, why] = [plan[i], plan[i + 1]];
          expect(act.kind).toBe('act');
          expect(why).toMatchObject({ kind: 'why', scenario: act.scenario, followUp: true });
          ids.push(act.scenario);
        }
        expect(new Set(ids).size).toBe(5);
        const acts = ids.map((id) => SCENARIOS.find((s) => s.id === id)!.act);
        expect(new Set(acts).size).toBeGreaterThanOrEqual(3);
        for (const a of ACTS) expect(acts.filter((x) => x === a).length).toBeLessThanOrEqual(2);
        for (const id of ids) expect(scenariosFor(level).some((s) => s.id === id)).toBe(true);
      }
    }
    expect(planLawRound(3, 'normal', 30)).toHaveLength(30);
  });

  it.each(LEVELS)('generates standalone items over 500 seeds (%s)', (level) => {
    const ids = new Set<string>();
    for (const seed of SEEDS) {
      const item = generateLawItem(seed, level);
      ids.add(item.id);
      expect(generateLawItem(seed, level).prompt).toEqual(item.prompt);
      expect(item.check(item.check('?').expected).correct).toBe(true);
      expect(item.chips!.filter((c) => item.check(c).correct)).toHaveLength(1);
      expect(fromLawInstance(item.instance!)?.prompt).toEqual(item.prompt);
    }
    expect([...ids].sort()).toEqual(['gen-law-act', 'gen-law-why']);
  });

  it('rejects unknown instances', () => {
    expect(fromLawInstance('law:act:nope:easy')).toBeNull();
    expect(fromLawInstance('law:why:state-school:seed=1:extreme')).toBeNull();
  });

  it.each(LEVELS)('plays a full %s round, scoring 10 when every expected answer is typed back', (level) => {
    const session = game.start(ctx, { difficulty: level, seed: 19 });
    for (let guard = 0; !session.done && guard < 20; guard++) {
      const expected = session.answer('?').expected;
      expect(session.answer(expected).correct).toBe(true);
    }
    const summary = session.summary();
    expect(summary).toMatchObject({ gameId: 'law', score: 10, total: 10 });
    expect(summary.perKk['U4O2-KK07']).toEqual({ correct: 10, total: 10 });
  });
});

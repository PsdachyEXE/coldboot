/**
 * law: every scenario in the fixed bank has exactly one Act that applies, worked out a second way
 * from its recorded facts and the question's framing; every "why" question offers exactly one true
 * reason for that Act and only reasons that are false for the scenario, over 500 seeds at each
 * difficulty. The Acts, principles and KK tags follow U3O2-KK10, U4O2-KK07 and the outcome-specific
 * requirements (section 9).
 */
import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../types';
import { ACT_LABELS, ACTS, PRINCIPLES, REASONS, SCENARIOS, type Act, type LawScenario, type Unit } from './bank';
import game from './index';
import {
  ACT_CHIPS,
  actItem,
  falseReasons,
  fromLawInstance,
  generateLawItem,
  lawKk,
  parseAct,
  planLawRound,
  scenariosFor,
  trueReason,
  whyItem,
  whyReasons,
} from './items';
import { LAW_GAME_KK, LAW_MAN } from './meta';

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
  if (/Apart from the Privacy Act/.test(s.ask)) acts = acts.filter((a) => a !== 'privacy');
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

  it('asks for the Commonwealth Act, or the Act apart from the Privacy Act, wherever two Acts would apply', () => {
    for (const s of SCENARIOS) {
      const f = s.facts;
      const privacyToo = !f.reuse && f.sector === 'private' && (f.turnoverAbove3m || f.healthProvider);
      if (privacyToo && f.healthInfo && f.inVictoria) expect(s.ask, s.id).toMatch(/Apart from the Privacy Act 1988 \(Cwlth\)|Commonwealth Act/);
      // Only the Health Records Act's label carries "(Vic)", so asking for "the Victorian Act" would give it away.
      expect(s.ask, s.id).not.toMatch(/Victorian Act/);
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

describe('law against the study design', () => {
  it('names the Acts as VCAA does', () => {
    expect(ACT_LABELS).toEqual({
      privacy: 'Privacy Act 1988 (Cwlth)',
      pdp: 'Privacy and Data Protection Act 2014',
      health: 'Health Records Act 2001 (Vic)',
      copyright: 'Copyright Act 1968 (Cwlth)',
    });
    const text = [LAW_MAN, ...SCENARIOS.flatMap((s) => [s.story, s.ask, s.why]), ...Object.values(REASONS).map((r) => r.text)].join('\n');
    expect(text).not.toMatch(/\(Cth\)|Data Protection Act 2014 \(Vic\)/);
    // Every Act the man page names carries its tag the first time.
    for (const act of ACTS) expect(LAW_MAN).toContain(`  ${ACT_LABELS[act]}: `);
  });

  it('lists the principles each unit names, with their titles', () => {
    const ids = (act: 'privacy' | 'pdp', unit: Unit) => PRINCIPLES[act].filter((p) => p.units.includes(unit)).map((p) => p.id);
    expect(ids('privacy', 3)).toEqual(['APP 1', 'APP 3', 'APP 6', 'APP 8', 'APP 9', 'APP 11']);
    expect(ids('privacy', 4)).toEqual(['APP 1', 'APP 6', 'APP 8', 'APP 9', 'APP 11']);
    expect(ids('pdp', 3)).toEqual(['IPP 1', 'IPP 2', 'IPP 4', 'IPP 5', 'IPP 7', 'IPP 9', 'IPP 10']);
    expect(ids('pdp', 4)).toEqual(['IPP 1', 'IPP 2', 'IPP 4', 'IPP 5', 'IPP 9']);
    // The titles exactly as the outcome-specific requirements (section 9) give them.
    expect(PRINCIPLES.privacy.map((p) => `${p.id}: ${p.title}`)).toEqual([
      'APP 1: Open and transparent management of personal information',
      'APP 3: Collection of solicited personal information',
      'APP 6: Use or disclosure of personal information',
      'APP 8: Cross-border disclosure of personal information',
      'APP 9: Adoption, use or disclosure of government related identifiers',
      'APP 11: Security of personal information',
    ]);
    expect(PRINCIPLES.pdp.map((p) => `${p.id}: ${p.title}`)).toEqual([
      'IPP 1: Collection',
      'IPP 2: Use and disclosure',
      'IPP 4: Data security',
      'IPP 5: Openness',
      'IPP 7: Unique identifiers',
      'IPP 9: Transborder data flows',
      'IPP 10: Sensitive information',
    ]);
    // The man page gives every title, and marks the ones only Unit 3 lists.
    for (const p of [...PRINCIPLES.privacy, ...PRINCIPLES.pdp]) {
      expect(LAW_MAN).toContain(`\n  ${p.id.split(' ')[1]} ${p.title}${p.units.includes(4) ? '' : ' (Unit 3 only)'}\n`);
    }
  });

  it('names one principle that both units list in the feedback for every privacy scenario', () => {
    for (const s of SCENARIOS) {
      const named = [...s.why.matchAll(/\b(APP|IPP) (\d+)\b/g)].map((m) => m[0]);
      if (s.act === 'privacy' || s.act === 'pdp') {
        const p = PRINCIPLES[s.act].find((x) => x.id === s.principle);
        expect(p, s.id).toBeDefined();
        expect(p!.units, s.id).toEqual([3, 4]);
        expect(named, s.id).toEqual([s.principle]);
        expect(s.why, s.id).toContain(`${p!.id} (${p!.title})`);
      } else {
        expect(s.principle, s.id).toBeUndefined();
        expect(named, s.id).toEqual([]);
      }
      // APP 9 binds private organisations, not agencies.
      if (s.principle === 'APP 9') expect(s.facts.sector, s.id).toBe('private');
    }
    // Between them, the scenarios' feedback covers every principle both units list.
    const used = new Set(SCENARIOS.map((s) => s.principle).filter(Boolean));
    for (const p of [...PRINCIPLES.privacy, ...PRINCIPLES.pdp].filter((x) => x.units.includes(4))) expect(used.has(p.id), p.id).toBe(true);
  });

  it('counts Health Records Act questions towards TERMS and the rest towards both KKs', () => {
    for (const s of SCENARIOS) {
      const expected = s.act === 'health' ? ['TERMS'] : ['U4O2-KK07', 'U3O2-KK10'];
      expect(lawKk(s), s.id).toEqual(expected);
      expect(actItem(s.id, 'normal').kk, s.id).toEqual(expected);
      expect(whyItem(s.id, 1, 'normal').kk, s.id).toEqual(expected);
      expect(whyItem(s.id, 1, 'normal', true).kk, s.id).toEqual(expected);
    }
    expect(LAW_GAME_KK).toEqual(['U4O2-KK07', 'U3O2-KK10', 'TERMS']);
    // The man page never says a KK lists the Health Records Act.
    expect(LAW_MAN).toMatch(/Neither list names the Health Records Act/);
  });

  it('treats changing licensed code without permission as a copyright question', () => {
    const s = SCENARIOS.find((x) => x.id === 'edited-plugin')!;
    expect(s.act).toBe('copyright');
    expect(s.story).toMatch(/edits the plug-in's code without asking its author/);
    expect(REASONS.reuse.text).toMatch(/copied, changed or reused/);
  });

  it('treats an insecure backup as a data security question, not a copyright one', () => {
    // The 2025 exam's most-chosen wrong answer for the copyright breach was a careless backup.
    const s = SCENARIOS.find((x) => x.id === 'council-backup')!;
    expect(s.act).toBe('pdp');
    expect(s.principle).toBe('IPP 4');
    expect(s.story).toMatch(/backup/);
    expect(s.why).toMatch(/not a copyright breach/);
    expect(trueReason(s)).toBe('vic-public');
    // The copyright reason is false here, so a why question may offer it as a wrong answer.
    expect(falseReasons(s)).toContain('reuse');
    expect(actItem(s.id, 'normal').check('D').correct).toBe(false);
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
    expect(parseAct('Privacy Act 1988 (Cwlth)')).toBe('privacy');
    expect(parseAct('Privacy Act 1988 (Cth)')).toBe('privacy');
    expect(parseAct('Copyright Act 1968 (Cwlth)')).toBe('copyright');
    expect(parseAct('Privacy and Data Protection Act 2014')).toBe('pdp');
    expect(parseAct('Privacy and Data Protection Act 2014 (Vic)')).toBe('pdp');
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
    // Health Records Act questions count towards TERMS; every other question towards both KKs.
    const kk07 = summary.perKk['U4O2-KK07'] ?? { correct: 0, total: 0 };
    const terms = summary.perKk.TERMS ?? { correct: 0, total: 0 };
    expect(kk07.correct).toBe(kk07.total);
    expect(kk07.total + terms.total).toBe(10);
    expect(summary.perKk['U3O2-KK10'] ?? { correct: 0, total: 0 }).toEqual(kk07);
  });
});

/**
 * The ux game over 500 seeds at every difficulty. Every template, sound and with each weakness it
 * can show, is checked against FigureSchema and against a layout check (inside the window, no
 * overlaps, text that fits, callouts clear of other elements). An independent checker written here
 * reads the drawing (element types, text and sizes) and finds every weakness: a sound screen has
 * none, and every item's screen has exactly the one it asks about.
 */
import { describe, expect, it } from 'vitest';
import { FigureSchema, type Mockup } from '../../content/schema';
import { textWidth } from '../../figures/text';
import type { TerminalBlock } from '../../terminal/blocks';
import { typedAnswer, wrongAnswer } from '../daily-game/testing';
import { mulberry32 } from '../prng';
import type { Difficulty, GameContext, QuizItem } from '../types';
import game from './index';
import { CHARACTERISTIC_OPTIONS, fromUxInstance, generateUxItem, planUxRound, REASON_COUNT, reasonChoices, uxItem, uxScreen, whichItem, whyItem, type UxSpec } from './items';
import { UX_MAN } from './meta';
import { buildScreen, TEMPLATES } from './templates';
import { CHARACTERISTIC_OF, CHARACTERISTICS, explanation, fixText, reasonText, rebuttal, WEAKNESSES, whyNot, type UxRole, type Weakness } from './weakness';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 17);
const LEVELS: Difficulty[] = ['easy', 'normal', 'hard'];

type El = Mockup['elements'][number];

/** Standard formats other programs read. Written out here, apart from the game. */
const OPEN_FORMAT = /\b(csv|xml|json|pdf)\b|\.ics\b/i;

/** Every weakness the drawing shows, read from element types, text and sizes. */
function weaknessesIn(fig: Mockup, roles: readonly (UxRole | null)[]): Weakness[] {
  const found = new Set<Weakness>();
  fig.elements.forEach((el, i) => {
    const role = roles[i];
    if (el.type === 'button' && (el.w < 32 || el.h < 32)) found.add('tiny-targets');
    if (!role) return;
    if (role.kind === 'action') {
      if (el.type === 'label') found.add('flat-action');
      else if (el.type === 'image') found.add('hidden-tap');
      else expect(el.type).toBe('button');
    }
    if (role.kind === 'secret' && /[^•]/.test(el.text ?? '')) found.add('secret-shown');
    if (role.kind === 'card' && (el.text?.match(/\d/g) ?? []).length > 4) found.add('full-card');
    if (role.kind === 'format' && !OPEN_FORMAT.test(el.text ?? '')) found.add(role.direction === 'export' ? 'closed-export' : 'closed-import');
  });
  const formAt = roles.findIndex((r) => r?.kind === 'form');
  if (formAt >= 0) {
    const form = roles[formAt] as Extract<UxRole, { kind: 'form' }>;
    // The designer's note states the form's length; a progress label must say where the user is.
    expect(fig.elements[formAt].note).toMatch(new RegExp(` of ${form.screens} `));
    const progress = fig.elements.filter((_, i) => roles[i]?.kind === 'progress');
    for (const p of progress) expect(p.text).toMatch(new RegExp(`^Step \\d+ of ${form.screens}$`));
    if (form.screens > 4 || progress.length === 0) found.add('long-form');
  }
  return [...found];
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function boxOf(el: El): Box {
  return { left: el.x - el.w / 2, top: el.y - el.h / 2, right: el.x + el.w / 2, bottom: el.y + el.h / 2 };
}

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Room the renderer needs for an element's text, as MockupFigure draws it. */
function textRoom(el: El): number {
  const text = el.text ?? '';
  switch (el.type) {
    case 'heading':
      return textWidth(text, 20, true);
    case 'button':
      // A tiny button holds one glyph, centred.
      return textWidth(text, 14, true) + (el.w < 32 ? 0 : 12);
    case 'textbox':
      return textWidth(text) + 16;
    case 'dropdown':
      return textWidth(text) + 16 + 28;
    case 'label':
      return textWidth(text);
    case 'checkbox':
    case 'radio':
      return textWidth(text) + 24;
    case 'list':
      return Math.max(...text.split('\n').map((t) => textWidth(t))) + 16;
    case 'image':
      return textWidth(text) + 12;
    default:
      return 0;
  }
}

/** Layout problems: outside the window's content area, overlapping, text that doesn't fit, callouts over other elements. */
function layoutProblems(fig: Mockup): string[] {
  const out: string[] = [];
  const [win, ...rest] = fig.elements;
  expect(win.type).toBe('window');
  const frame = boxOf(win);
  if (frame.left < 0 || frame.top < 0 || frame.right > fig.width || frame.bottom > fig.height) out.push('window outside the canvas');
  const content = { ...frame, top: frame.top + 28 };
  rest.forEach((el, i) => {
    const b = boxOf(el);
    const name = `${el.type} "${el.text ?? ''}"`;
    if (b.left < content.left + 8 || b.right > content.right - 8 || b.top < content.top + 8 || b.bottom > content.bottom - 8) out.push(`${name} is outside the window`);
    if (textRoom(el) > el.w) out.push(`${name} text needs ${Math.ceil(textRoom(el))} but has ${el.w}`);
    rest.forEach((other, j) => {
      if (j > i && overlaps(b, boxOf(other))) out.push(`${name} overlaps ${other.type} "${other.text ?? ''}"`);
    });
    if (el.note) {
      // The callout circle (radius 11) sits on the element's top-right corner.
      const cx = Math.min(Math.max(12, b.right), fig.width - 12);
      const cy = Math.min(Math.max(12, b.top), fig.height - 12);
      const circle = { left: cx - 11, top: cy - 11, right: cx + 11, bottom: cy + 11 };
      if (circle.top < frame.top + 28) out.push(`${name} callout touches the title bar`);
      rest.forEach((other) => {
        if (other === el) return;
        const ob = boxOf(other);
        // Labels only occupy their text, not their whole box.
        const occupied = other.type === 'label' ? { ...ob, right: ob.left + textWidth(other.text ?? '') } : ob;
        if (overlaps(circle, occupied)) out.push(`${name} callout overlaps ${other.type} "${other.text ?? ''}"`);
      });
    }
  });
  return out;
}

function figureOf(item: QuizItem): Mockup | null {
  const block = item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'figure' }> => b.kind === 'figure');
  return block && block.figure.kind === 'mockup' ? block.figure : null;
}

function choicesOf(item: QuizItem): string[] {
  return item.prompt.find((b): b is Extract<TerminalBlock, { kind: 'choices' }> => b.kind === 'choices')?.options ?? [];
}

function specOf(item: QuizItem): UxSpec {
  const m = /^ux:(?:which|why|follow-up):([a-z-]+):([a-z-]+):seed=(\d+):/.exec(item.instance ?? '')!;
  return { template: m[1], weakness: m[2] as Weakness, seed: Number(m[3]) };
}

function allText(item: QuizItem): string {
  return item.prompt.map((b) => ('text' in b ? b.text : b.kind === 'choices' ? b.options.join(' ') : '')).join(' ');
}

describe('ux mock-ups', () => {
  it('draws every template soundly, and with each weakness it can show, valid and tidy', () => {
    for (const t of TEMPLATES) {
      for (const weakness of [null, ...t.weaknesses]) {
        for (const seed of SEEDS.slice(0, 40)) {
          const screen = buildScreen(t, weakness, mulberry32(seed));
          const label = `${t.id} ${weakness ?? 'sound'} ${seed}`;
          expect(FigureSchema.safeParse(screen.figure).success, label).toBe(true);
          expect(screen.roles, label).toHaveLength(screen.figure.elements.length);
          expect(layoutProblems(screen.figure), label).toEqual([]);
          expect(weaknessesIn(screen.figure, screen.roles), label).toEqual(weakness ? [weakness] : []);
        }
      }
    }
  });

  it('draws phone screens narrow enough for the terminal on a 360 px phone', () => {
    // Figures never scale below their natural size, and the full-screen terminal at 360 px leaves
    // 294 px: 360 less 16 px page gutters, the terminal's 1 px border and its 16 px padding.
    const room = 360 - 2 * 16 - 2 * 1 - 2 * 16;
    for (const t of TEMPLATES.filter((x) => x.device === 'phone')) {
      for (const weakness of [null, ...t.weaknesses]) {
        for (const seed of SEEDS.slice(0, 20)) expect(buildScreen(t, weakness, mulberry32(seed)).figure.width, t.id).toBeLessThanOrEqual(room);
      }
    }
  });

  it('can show every weakness, each on more than one template except closed-import', () => {
    for (const w of WEAKNESSES) {
      const count = TEMPLATES.filter((t) => t.weaknesses.includes(w)).length;
      expect(count, w).toBeGreaterThanOrEqual(w === 'closed-import' ? 1 : 2);
    }
  });

  it('varies each screen with the seed', () => {
    for (const t of TEMPLATES) {
      const shapes = new Set(SEEDS.slice(0, 60).map((seed) => JSON.stringify(buildScreen(t, t.weaknesses[0], mulberry32(seed)).figure)));
      expect(shapes.size, t.id).toBeGreaterThan(2);
    }
  });
});

describe('ux items', () => {
  it('over 500 seeds, every generated item shows a valid mock-up with exactly its one weakness', () => {
    const seen = new Set<string>();
    for (const difficulty of LEVELS) {
      for (const seed of SEEDS) {
        const item = generateUxItem(seed, difficulty);
        const spec = specOf(item);
        seen.add(`${item.id}:${CHARACTERISTIC_OF[spec.weakness]}`);
        expect(item.kk).toEqual(['U3O2-KK15']);
        expect(item.id).toMatch(/^gen-ux-(which|why)$/);
        const fig = figureOf(item)!;
        expect(FigureSchema.safeParse(fig).success).toBe(true);
        expect(weaknessesIn(fig, uxScreen(spec).roles), item.instance).toEqual([spec.weakness]);
        expect(generateUxItem(seed, difficulty)).toMatchObject({ instance: item.instance, prompt: item.prompt });
        expect(fromUxInstance(item.instance!)!.prompt).toEqual(item.prompt);
        expect(item.check(typedAnswer(item)).correct, item.instance).toBe(true);
        expect(item.check(wrongAnswer(item)).correct, item.instance).toBe(false);
        expect(item.check('purple').counted).toBe(false);
      }
    }
    // Both kinds of question, for every characteristic.
    expect(seen.size).toBe(8);
  });

  it('asks which characteristic, by letter or by name, and explains the answer', () => {
    const spec: UxSpec = { template: 'library', weakness: 'secret-shown', seed: 5 };
    const item = whichItem(spec, 'normal');
    expect(choicesOf(item)).toEqual(['Affordance', 'Interoperability', 'Security', 'Usability']);
    expect(item.chips).toEqual(['affordance', 'interoperability', 'security', 'usability']);
    for (const input of ['c', 'C', '3', 'security', ' Security ', 'C. Security']) expect(item.check(input).correct, input).toBe(true);
    const right = item.check('security');
    expect(right.expected).toBe('C. Security');
    expect(right.reason).toMatch(/^Security is about protecting users' data and accounts/);
    const wrong = item.check('usability');
    expect(wrong.correct).toBe(false);
    expect(wrong.reason).toMatch(/^Showing the password doesn't make the screen harder to use/);
    expect(item.check('design').counted).toBe(false);
  });

  it('offers reasons that are true only for this screen, three, four or five by difficulty', () => {
    for (const difficulty of LEVELS) {
      for (const seed of SEEDS.slice(0, 200)) {
        for (const t of TEMPLATES) {
          const weakness = t.weaknesses[seed % t.weaknesses.length];
          const spec: UxSpec = { template: t.id, weakness, seed };
          const item = whyItem(spec, difficulty);
          const options = choicesOf(item);
          const chosen = reasonChoices(spec, difficulty, uxScreen(spec).facts);
          expect(options).toHaveLength(REASON_COUNT[difficulty]);
          expect(new Set(options).size, item.instance).toBe(options.length);
          expect(chosen.filter((w) => w === weakness)).toHaveLength(1);
          // Every other reason names a weakness this screen doesn't have.
          const actual = weaknessesIn(uxScreen(spec).figure, uxScreen(spec).roles);
          for (const w of chosen) expect(actual.includes(w)).toBe(w === weakness);
          const own = chosen.filter((w) => CHARACTERISTIC_OF[w] === CHARACTERISTIC_OF[weakness]);
          expect(own, item.instance).toHaveLength(difficulty === 'hard' ? 2 : 1);
          // Other characteristics are never repeated.
          const others = chosen.filter((w) => CHARACTERISTIC_OF[w] !== CHARACTERISTIC_OF[weakness]).map((w) => CHARACTERISTIC_OF[w]);
          expect(new Set(others).size).toBe(others.length);
        }
      }
    }
  });

  it('writes "an" before a vowel in every reason, rebuttal, explanation and fix', () => {
    expect(rebuttal('hidden-tap', uxScreen({ template: 'bakery', weakness: 'flat-action', seed: 1 }).facts)).toBe('The photo has an "Ingredients" button under it.');
    expect(rebuttal('hidden-tap', uxScreen({ template: 'report', weakness: 'long-form', seed: 1 }).facts)).toBe('The photo area has an "Add a photo" button under it.');
    for (const t of TEMPLATES) {
      for (const weakness of t.weaknesses) {
        for (const seed of SEEDS.slice(0, 10)) {
          const { facts } = uxScreen({ template: t.id, weakness, seed });
          const texts = [explanation(weakness, facts), fixText(weakness, facts), ...CHARACTERISTICS.map((c) => whyNot(c, weakness, facts))];
          for (const w of WEAKNESSES) texts.push(reasonText(w, facts, w === weakness), rebuttal(w, facts));
          for (const text of texts) expect(text, `${t.id} ${weakness}`).not.toMatch(/\ba "?[aeio]/i);
        }
      }
    }
  });

  it("calls a library card's number what it is: a sign-in number, not the payment card the full-card claim is about", () => {
    // The library sign-in screen shows the whole library card number, which is the member's
    // login, not a weakness. On hard, the second security reason offered is the full-card claim,
    // so both it and its rebuttal have to be about a payment card, or both would contradict the
    // drawing.
    let offered = 0;
    for (const seed of SEEDS.slice(0, 200)) {
      const spec: UxSpec = { template: 'library', weakness: 'secret-shown', seed };
      const { facts, figure } = uxScreen(spec);
      expect(figure.elements.some((e) => /^\d{4} \d{4} \d{4}$/.test(e.text ?? ''))).toBe(true);
      if (!reasonChoices(spec, 'hard', facts).includes('full-card')) continue;
      offered++;
      const item = whyItem(spec, 'hard');
      const options = choicesOf(item);
      const at = options.findIndex((o) => /whole .*card number/.test(o));
      expect(options[at], item.instance).toBe("It shows a customer's whole payment card number, so anyone who sees the screen could copy it.");
      const result = item.check('ABCDE'[at]);
      expect(result.correct).toBe(false);
      expect(result.reason).toMatch(/^That isn't true of this screen: no payment card number appears on this screen\. /);
    }
    expect(offered).toBe(200);
    // Where the screen does show a payment card, the specific wording stays.
    const court = uxScreen({ template: 'court', weakness: 'tiny-targets', seed: 1 }).facts;
    expect(reasonText('full-card', court, false)).toBe('It shows the whole card number, so anyone who sees the screen could copy it.');
    expect(rebuttal('full-card', court)).toBe('Only the last four digits of the card show.');
  });

  it('explains a wrong reason and gives a fix', () => {
    const spec: UxSpec = { template: 'clock-on', weakness: 'tiny-targets', seed: 3 };
    const item = whyItem(spec, 'hard');
    const options = choicesOf(item);
    const right = options.findIndex((o) => o.startsWith('The number keys are only about 4 mm across'));
    expect(right).toBeGreaterThanOrEqual(0);
    expect(item.check('ABCDE'[right]).reason).toMatch(/^A fix: make the buttons big enough for a fingertip/);
    const wrong = right === 0 ? 1 : 0;
    const result = item.check('ABCDE'[wrong]);
    expect(result.correct).toBe(false);
    expect(result.reason).toMatch(/^That isn't true of this screen: /);
  });

  it('keeps design principles out of every question and answer', () => {
    const principles = /\b(alignment|contrast|consistency|consistent|balance|proximity|repetition|white space|hierarchy|design principle)/i;
    for (const seed of SEEDS) {
      for (const difficulty of LEVELS) {
        const item = generateUxItem(seed, difficulty);
        expect(allText(item)).not.toMatch(principles);
        expect(item.check('a').reason).not.toMatch(principles);
      }
    }
    expect(CHARACTERISTIC_OPTIONS).toEqual(CHARACTERISTICS.map((c) => c.charAt(0).toUpperCase() + c.slice(1)));
    expect(UX_MAN).toMatch(/design principles still has to be checked against the source/);
  });

  it('plans a round of five mock-ups, each asked twice, every characteristic at least once', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const plan = planUxRound(seed, 'normal');
      expect(plan).toHaveLength(10);
      const screens = plan.filter((q) => q.kind === 'which');
      expect(screens).toHaveLength(5);
      expect(new Set(screens.map((q) => q.spec.template)).size).toBe(5);
      expect(new Set(screens.map((q) => CHARACTERISTIC_OF[q.spec.weakness])).size).toBe(4);
      plan.forEach((q, i) => {
        if (q.kind === 'why') {
          expect(q.followUp).toBe(true);
          expect(plan[i - 1]).toEqual({ kind: 'which', spec: q.spec });
          // A follow-up doesn't reprint the mock-up.
          expect(figureOf(uxItem(q, 'normal'))).toBeNull();
        }
      });
    }
  });

  it('plays a round of ten through the engine', () => {
    const ctx: GameContext = { playerName: '', now: () => 0, content: null, mastery: () => null, today: '2026-10-01', daily: null };
    const session = game.start(ctx, { difficulty: 'hard', seed: 42 });
    let answered = 0;
    while (!session.done) {
      expect(session.prompt().length).toBeGreaterThan(0);
      const current = session.current!()!;
      const item = fromUxInstance(current.instance!)!;
      expect(session.answer(typedAnswer(item)).correct).toBe(true);
      answered++;
    }
    expect(answered).toBe(10);
    expect(session.summary().score).toBe(10);
  });
});

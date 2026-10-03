/**
 * The boss round played through the real terminal view with the real games and case studies: the
 * climb costs lives and ends at the last one, then each case study question reveals its model
 * answer and marking points without recording anything, and the points typed are recorded as
 * marks over marks available, with no Correct or Incorrect verdict.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAllContent, type ContentIndex } from '../../content/loader';
import { useContent } from '../../content/store';
import { useAttempts } from '../../state/attempts';
import { GAME_INPUT_MAX, useTerminalSession } from '../../terminal/session';
import { TerminalView } from '../../terminal/TerminalView';
import { useTerminal } from '../../terminal/useTerminal';
import { useAnnouncer } from '../../ui/announce';
import { useReportDialog } from '../../ui/report';
import { printed, resetStores } from '../../terminal/testing';
import { typedAnswer, wrongAnswer } from '../daily-game/testing';
import type { BossSession } from './index';

const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();

/** user-event treats [ and { as key syntax; doubling them types them literally. */
const typeable = (s: string) => s.replace(/[[{]/g, '$&$&');

let content: ContentIndex;
beforeAll(async () => {
  content = await loadAllContent();
}, 60_000);

beforeEach(() => {
  resetStores();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  useContent.setState({ index: content, status: 'ready' });
});

afterEach(() => {
  vi.useRealTimers();
  resetStores();
});

function renderView() {
  const inputRef = createRef<HTMLInputElement>();
  const view = render(
    <MemoryRouter>
      <TerminalView presentation="route" inputRef={inputRef} />
    </MemoryRouter>,
  );
  return { ...view, input: screen.getByRole('textbox', { name: /Terminal command|Your answer/ }) };
}

const boss = () => useTerminalSession.getState().game!.session as BossSession;
const attempts = () => useAttempts.getState().log;

describe('boss in the terminal', () => {
  it('refuses a difficulty, since the climb always runs from easy to hard', async () => {
    const user = userEvent.setup();
    const { input } = renderView();
    await user.type(input, 'play boss --hard{Enter}');
    expect(printed()).toContain('boss has one level, so it has no --easy or --hard option. Type play boss to start it.');
    expect(useTerminalSession.getState().game).toBeNull();
  });

  it('plays the climb to the last life, then a self-marked case study', async () => {
    const user = userEvent.setup();
    const { input, container } = renderView();
    await user.type(input, 'play boss{Enter}');
    await waitFor(() => expect(useTerminalSession.getState().game?.gameId).toBe('boss'));
    expect(screen.getByText('Boss round')).toBeInTheDocument();
    expect(printed()).toContain('15 questions. Answer at the prompt and press Enter.');
    expect(printed()).toContain('Three lives. The questions come from every game, easy first, then normal, then hard, and each wrong answer costs a life. Then three case study questions');
    expect(printed()).toMatch(/Easy question from [a-z]+\. 3 lives left\./);

    // One right answer, then three wrong ones.
    await user.type(input, `${typeable(typedAnswer(boss().state.item!))}{Enter}`);
    expect(attempts()).toHaveLength(1);
    expect(boss().state.lives).toBe(3);
    for (let i = 0; i < 3; i++) {
      await user.type(input, `${typeable(wrongAnswer(boss().state.item!))}{Enter}`);
      expect(attempts()).toHaveLength(2 + i);
    }
    expect(printed()).toContain('That costs a life: 2 lives left.');
    expect(printed()).toContain('That was your last life.');
    expect(printed()).toContain('Out of lives after question 4: you survived 3 questions. Now the case study, which costs no lives.');

    const { slice } = boss().state;
    expect(boss().state.phase).toBe('case');
    // A screen reader hears a pointer to the insert, then the first question and its marks.
    expect(useAnnouncer.getState().polite).toContain('The case study insert is in the terminal output, above the first question. Case study question 1 of 3.');
    expect(useAnnouncer.getState().polite).not.toContain(slice!.caseStudy.insert.slice(0, 40));
    expect(printed()).toContain(`Case study: ${slice!.caseStudy.title}`);
    // The whole insert is printed, then the first question with its figures.
    expect(printed()).toContain(slice!.caseStudy.insert);
    expect(printed()).toContain(slice!.questions[0].prompt);
    const figures = slice!.caseStudy.figures.filter((f) => slice!.questions[0].figureRefs?.includes(f.id));
    for (const f of figures) expect(container.querySelector(`figure[data-figure="${f.kind}"]`)).not.toBeNull();
    const verdicts = screen.queryAllByText(/^(Correct|Incorrect)$/).length;
    // A written answer has room for every developed point, and the instruction says how much.
    expect(input).toHaveAttribute('maxlength', String(GAME_INPUT_MAX));
    expect(printed()).toContain(
      `Type your answer on one line (up to ${GAME_INPUT_MAX.toLocaleString('en-AU')} characters) and press Enter, or type skip to go straight to the marking points.`,
    );

    // Question 1: a written answer reveals the model answer and the marking points, and records nothing.
    const [q1, q2, q3] = slice!.questions;
    await user.type(input, 'Encryption would protect the data.{Enter}');
    expect(attempts()).toHaveLength(4);
    expect(boss().state.marking).toBe(true);
    expect(printed()).toContain(q1.model);
    expect(printed()).toContain('Which points did your answer earn?');
    expect(useAnnouncer.getState().polite).toMatch(/^The model answer is in the terminal output\. Marking points 1 to \d+\. After them, type the numbers/);
    expect(container.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(q1.points.length);
    // report names the question whose model answer and marking points are showing, not the last climb item.
    await user.type(input, 'report{Enter}');
    expect(useReportDialog.getState().request).toMatchObject({ itemId: q1.id, where: 'terminal: play boss' });
    expect(attempts()).toHaveLength(4);
    await user.type(input, 'lots{Enter}');
    expect(printed()).toContain(`The points run from 1 to ${q1.points.length}.`);
    expect(attempts()).toHaveLength(4);
    await user.type(input, '1 2{Enter}');
    const earned1 = Math.min(q1.marks, q1.points[0].marks + q1.points[1].marks);
    expect(printed()).toContain(`You gave yourself ${earned1} of ${q1.marks} marks.`);
    expect(attempts()).toHaveLength(5);
    expect(attempts()[4][0]).toBe(q1.id);
    expect(attempts()[4][2]).toBeCloseTo(earned1 / q1.marks);

    // Question 2: skip straight to the marking, then none.
    await user.type(input, 'skip{Enter}');
    expect(printed()).toContain(q2.model);
    await user.type(input, 'report{Enter}');
    expect(useReportDialog.getState().request).toMatchObject({ itemId: q2.id });
    await user.type(input, 'none{Enter}');
    expect(attempts()[5]).toEqual(expect.arrayContaining([q2.id, 0]));

    // Question 3: an answer that starts with a command word is still an answer.
    await user.type(input, 'help desk staff should use MFA{Enter}');
    expect(printed()).not.toContain('A game is running, so that was read as an answer');
    await user.type(input, 'all{Enter}');
    expect(attempts()[6][0]).toBe(q3.id);
    expect(attempts()[6][2]).toBe(1);

    // Self-marking never prints a verdict.
    expect(screen.queryAllByText(/^(Correct|Incorrect)$/)).toHaveLength(verdicts);
    const caseMarks = q1.marks + q2.marks + q3.marks;
    expect(useTerminalSession.getState().game).toBeNull();
    expect(printed()).toContain('Boss round complete.');
    expect(printed()).toContain('Questions survived | 3 of 15');
    expect(printed()).toContain('Lives left | 0 of 3');
    expect(printed()).toContain(`Case study | ${earned1 + q3.marks} of ${caseMarks} marks`);
    expect(useTerminal.getState().lastGameEnd).toMatchObject({ gameId: 'boss', total: 7 });
  }, 30_000);
});

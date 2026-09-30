/**
 * The Daily screen plays the terminal's set from the terminal's record: a fresh day, a day the
 * terminal started (resumed at the first unanswered question), and a finished day (the stored
 * result and share line, never counted again).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { buildDailySet, dailyShareText } from '../../games/daily';
import { dailyItem, dailyRefs, loadGenerators, type Generators } from '../../games/daily-game';
import { typedAnswer, wrongAnswer } from '../../games/daily-game/testing';
import { fixtureContent } from '../../games/drill/fixture';
import { useAttempts } from '../../state/attempts';
import { useSession } from '../../state/session';
import { useSettings } from '../../state/settings';
import { provideContent, resetStudyStores } from '../study/testing';
import Daily from './Daily';
import Home from './Home';

// 10 am on Thursday 1 October 2026 in Melbourne: the next set is 14 hours away.
const NOW = new Date('2026-10-01T10:00:00+10:00').getTime();
const TODAY = '2026-10-01';

let generators: Generators;
beforeAll(async () => {
  generators = await loadGenerators();
});

beforeEach(() => {
  resetStudyStores();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  useSettings.setState({ onboarded: true, motion: 'reduce' });
  provideContent(fixtureContent());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetStudyStores();
});

function renderDaily() {
  return render(
    <MemoryRouter>
      <Daily />
    </MemoryRouter>,
  );
}

function refsNow() {
  const record = useSession.getState().daily[TODAY] ?? null;
  return dailyRefs(TODAY, fixtureContent(), record).refs;
}

/** Answers the question on screen, right or wrong, then moves on. */
function answerCurrent(right: boolean) {
  const index = useSession.getState().daily[TODAY].results.length;
  const ref = refsNow()[index];
  expect(screen.getByText(`Question ${index + 1} of 10`)).toBeInTheDocument();
  if (ref.kind === 'mcq') {
    // The fixture MCQs' answer is the third option, "Three".
    fireEvent.click(screen.getByRole('radio', { name: right ? /Three/ : /One/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  } else {
    const item = dailyItem(ref, fixtureContent(), generators);
    fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), { target: { value: right ? typedAnswer(item) : wrongAnswer(item) } });
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  }
  expect(screen.getByText(right ? 'Correct' : 'Incorrect')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: index === 9 ? 'See your result' : 'Next question' }));
}

describe('Daily screen', () => {
  it('plays today\'s set from the terminal\'s set builder and records first attempts', async () => {
    renderDaily();
    expect(screen.getByRole('heading', { level: 1, name: 'Daily challenge' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Start the daily challenge' }));

    const record = useSession.getState().daily[TODAY];
    expect(record.itemIds).toEqual(buildDailySet(TODAY, fixtureContent().mcq).map((r) => r.id));
    expect(record.itemIds.filter((id) => id.startsWith('gen-daily-'))).toHaveLength(2);

    for (let i = 0; i < 10; i++) answerCurrent(i !== 0);

    expect(screen.getByRole('heading', { name: 'Daily challenge complete' })).toBeInTheDocument();
    expect(screen.getByText('9 of 10 correct')).toBeInTheDocument();
    expect(useSession.getState().daily[TODAY]).toMatchObject({ results: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1], completedAt: NOW });
    // One attempt per question, with the generated ones under their daily ids.
    const log = useAttempts.getState().log;
    expect(log).toHaveLength(10);
    expect(log.map((t) => t[0])).toEqual(record.itemIds);

    const answers = within(screen.getByRole('list', { name: 'Your answers' })).getAllByRole('listitem');
    expect(answers).toHaveLength(10);
    expect(answers[0]).toHaveTextContent('Question 1 ✗ Incorrect');
    expect(answers[1]).toHaveTextContent('Question 2 ✓ Correct');
    const share = 'COLDBOOT daily 2026-10-01  9/10\n⬛🟦🟦🟦🟦🟦🟦🟦🟦🟦';
    expect(screen.getByText((_, el) => el?.tagName === 'PRE' && el.textContent === share)).toBeInTheDocument();
    expect(screen.getByText('The next set is ready in 14 hours, at midnight in Melbourne.')).toBeInTheDocument();
  });

  it('copies the share line, or selects it when the browser won\'t copy', async () => {
    const day = buildDailySet(TODAY, fixtureContent().mcq).map((r) => r.id);
    useSession.getState().beginDaily(TODAY, day);
    for (let i = 0; i < 10; i++) useSession.getState().recordDaily(TODAY, i, i !== 4, NOW - 60_000);
    const share = dailyShareText(TODAY, [1, 1, 1, 1, 0, 1, 1, 1, 1, 1]);

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Copy share line' }));
    expect(await screen.findByText('Share line copied to the clipboard.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(share);

    writeText.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy share line' }));
    const fallback = await screen.findByRole('textbox', { name: 'Share line text' });
    expect(fallback).toHaveValue(share);
    expect(fallback).toHaveFocus();
    expect(fallback).toHaveAttribute('readonly');
  });

  it('resumes a day the terminal started, at the first unanswered question', async () => {
    const day = buildDailySet(TODAY, fixtureContent().mcq).map((r) => r.id);
    useSession.getState().beginDaily(TODAY, day);
    for (let i = 0; i < 3; i++) useSession.getState().recordDaily(TODAY, i, true, NOW - 60_000);

    renderDaily();
    expect(await screen.findByText("You've answered 3 of 10, and those answers still count. Carry on here or in the terminal.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Carry on from question 4' }));
    expect(screen.getByText('Question 4 of 10')).toBeInTheDocument();
    answerCurrent(false);
    expect(useSession.getState().daily[TODAY].results).toEqual([1, 1, 1, 0]);
    expect(useSession.getState().daily[TODAY].itemIds).toEqual(day);
    expect(screen.getByText('Question 5 of 10')).toBeInTheDocument();
    expect(useAttempts.getState().log).toHaveLength(1);
  });

  it('counts only the first attempt at a generated question, and not input that is no answer', async () => {
    renderDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Start the daily challenge' }));
    const refs = refsNow();
    const first = refs.findIndex((r) => r.kind === 'generated');
    for (let i = 0; i < first; i++) answerCurrent(true);

    const item = dailyItem(refs[first], fixtureContent(), generators);
    expect(screen.getByText(`Question ${first + 1} of 10`)).toBeInTheDocument();
    // An empty answer isn't an attempt.
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('Type an answer first, or choose one of the suggested answers.')).toBeInTheDocument();
    expect(useAttempts.getState().log).toHaveLength(first);

    fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), { target: { value: wrongAnswer(item) } });
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
    // The answer field is gone: the question can't be answered again.
    expect(screen.queryByRole('textbox', { name: 'Your answer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check answer' })).not.toBeInTheDocument();
    expect(useSession.getState().daily[TODAY].results[first]).toBe(0);
    expect(useAttempts.getState().log).toHaveLength(first + 1);
    expect(useAttempts.getState().log[first][0]).toBe(item.id);
  });

  it('plays a generated P1 question: a data flow diagram with marked elements', async () => {
    // A day whose first question is a dfd item that asks which marked element is wrong.
    const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((n) => generators.dfd(n, 'normal').id === 'gen-dfd-element')!;
    const dfdId = `gen-daily-dfd:${seed}`;
    const day = [dfdId, ...buildDailySet(TODAY, fixtureContent().mcq).map((r) => r.id).slice(1)];
    useSession.getState().beginDaily(TODAY, day);
    const item = dailyItem(refsNow()[0], fixtureContent(), generators);

    renderDaily();
    fireEvent.click(await screen.findByRole('button', { name: 'Start the daily challenge' }));
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    expect(screen.getByRole('figure')).toBeInTheDocument();
    const chips = within(screen.getByRole('group', { name: 'Suggested answers' })).getAllByRole('button');
    expect(chips.map((c) => c.textContent)).toEqual(item.chips);
    fireEvent.click(screen.getByRole('button', { name: typedAnswer(item) }));
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(useSession.getState().daily[TODAY].results).toEqual([1]);
    expect(useAttempts.getState().log.map((t) => t[0])).toEqual([dfdId]);
  });

  it('shows a finished day\'s stored result without counting again', async () => {
    const day = buildDailySet(TODAY, fixtureContent().mcq).map((r) => r.id);
    useSession.getState().beginDaily(TODAY, day);
    for (let i = 0; i < 10; i++) useSession.getState().recordDaily(TODAY, i, i % 3 !== 0, NOW - 3_600_000);
    const stored = useSession.getState().daily[TODAY];

    renderDaily();
    expect(await screen.findByRole('heading', { name: "You've finished this daily challenge" })).toBeInTheDocument();
    expect(screen.getByText('6 of 10 correct')).toBeInTheDocument();
    expect(screen.getByText('Only your first attempt at each question counts, so this set is done.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start the daily challenge|Carry on/ })).not.toBeInTheDocument();
    const share = dailyShareText(TODAY, stored.results);
    expect(screen.getByText((_, el) => el?.tagName === 'PRE' && el.textContent === share)).toBeInTheDocument();
    expect(useSession.getState().daily[TODAY]).toEqual(stored);
    expect(useAttempts.getState().log).toHaveLength(0);
  });

  it('is linked from the daily status on Home', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Daily challenge: Not done yet' })).toHaveAttribute('href', '/daily');
  });
});

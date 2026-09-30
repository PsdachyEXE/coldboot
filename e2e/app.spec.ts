/**
 * End-to-end run (Section 12, P1) against the production build: first run, a card flipped and
 * rated in Review, the terminal opened with the backtick key and `help`, one answered question of
 * `sort` then Ctrl+C, and a progress export whose JSON is checked. Selectors are roles and labels;
 * nothing sleeps. The clock is pinned to a date before the exam, so first run's "exam is in the
 * past" check and the day's content never depend on when CI happens to run.
 */
import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** 10 am on Thursday 1 October 2026 in Melbourne. */
const FIXED_NOW = new Date('2026-10-01T10:00:00+10:00');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
});

/**
 * Answers the question on screen in a running `sort` round with something the game accepts as an
 * attempt: the first suggested answer when there are chips, otherwise an answer of the right shape.
 */
async function answerSortQuestion(page: Page, input: Locator, log: Locator): Promise<void> {
  const chips = page.getByRole('group', { name: 'Suggested answers' }).getByRole('button');
  if ((await chips.count()) > 0) {
    await chips.first().click();
    return;
  }
  const text = await log.innerText();
  const question = text.slice(text.lastIndexOf('Question 1 of 10'));
  let answer: string;
  if (/sub-lists/.test(question)) {
    answer = '[1] [2]';
  } else if (/What is the array after/.test(question)) {
    const start = /\[([\d,\s]+)\]/.exec(question);
    if (!start) throw new Error(`No starting array in the question:\n${question}`);
    const n = start[1].split(',').length;
    answer = Array.from({ length: n }, (_, i) => String(i + 1)).join(' ');
  } else if (/whole number/.test(question)) {
    answer = '3';
  } else {
    throw new Error(`Unrecognised sort question:\n${question}`);
  }
  await input.fill(answer);
  await input.press('Enter');
}

test('first run, review, terminal, sort and export', async ({ page }) => {
  await test.step('complete first run', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome to COLDBOOT' })).toBeVisible();
    await page.getByLabel('Display name').fill('Robin');
    await expect(page.getByLabel('New cards per day')).toHaveValue('25');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    await expect(page.getByRole('link', { name: "Start today's run" })).toBeVisible();
  });

  await test.step('flip a card in Review and rate it', async () => {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Review', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();
    await page.getByRole('button', { name: 'Start review' }).click();
    await expect(page.getByText(/^Card 1 of \d+$/)).toBeVisible();
    await page.getByRole('button', { name: 'Show answer' }).click();
    await expect(page.getByRole('region', { name: /^Card 1 of \d+, answer shown$/ })).toBeVisible();
    const rate = page.getByRole('group', { name: 'How well did you recall it?' });
    await rate.getByRole('button', { name: /^Good\b/ }).click();
    await expect(page.getByText(/^Card 2 of \d+$/)).toBeVisible();
  });

  const drawer = page.getByRole('dialog', { name: 'Terminal' });
  const input = drawer.getByRole('textbox', { name: /Terminal command|Your answer/ });
  const log = drawer.getByRole('log', { name: 'Terminal output' });

  await test.step('open the terminal with the backtick key and run help', async () => {
    // Take focus off any button so the key goes to the page, as a student would after a card.
    await page.getByRole('heading', { level: 1, name: 'Review' }).click();
    await page.keyboard.press('Backquote');
    await expect(drawer).toBeVisible();
    await expect(input).toBeFocused();
    await input.fill('help');
    await input.press('Enter');
    await expect(log.getByRole('table', { name: 'Commands' })).toBeVisible();
    await expect(log.getByRole('rowheader', { name: 'play <game> [--easy|--hard]' })).toBeVisible();
  });

  await test.step('play one question of sort, then stop with Ctrl+C', async () => {
    await input.fill('play sort');
    await input.press('Enter');
    await expect(log.getByText('Question 1 of 10')).toBeVisible();
    await answerSortQuestion(page, input, log);
    await expect(log.getByText(/^[✓✗] (Correct|Incorrect)$/).first()).toBeVisible();
    await expect(log.getByText('Question 2 of 10')).toBeVisible();
    await input.focus();
    await input.press('Control+c');
    await expect(log.getByText('Game aborted.')).toBeVisible();
    await input.press('Escape');
    await expect(drawer).toBeHidden();
  });

  await test.step('see the review on Stats', async () => {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Stats', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Stats' })).toBeVisible();
    const reviews = page.getByRole('region', { name: 'Reviews per day' });
    await expect(reviews.getByRole('img', { name: /cards reviewed per study day over the last 21 days: 1 in all/ })).toBeVisible();
    await reviews.getByText('Show data').click();
    await expect(reviews.getByRole('table', { name: 'Cards reviewed per study day, last 21 days' })).toBeVisible();
  });

  await test.step('export progress from Settings', async () => {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export progress' }).click();
    const download = await downloading;
    // The app names the file by the UTC date of the export.
    const filename = `coldboot-progress-${FIXED_NOW.toISOString().slice(0, 10)}.json`;
    expect(download.suggestedFilename()).toBe(filename);
    await expect(page.getByText(`Progress exported as ${filename}. Keep it somewhere safe, such as your school drive.`)).toBeVisible();

    const file = JSON.parse(await readFile(await download.path(), 'utf8')) as {
      app: string;
      stores: Record<string, { v: number; data: Record<string, unknown> }>;
    };
    expect(file.app).toBe('coldboot');
    expect(file.stores.settings.data).toMatchObject({ name: 'Robin', onboarded: true, newCardLimit: 25 });
    expect(Object.keys(file.stores.srs.data.cards as object)).toHaveLength(1);
    // The rated card and the sort answer.
    expect((file.stores.attempts.data.log as unknown[]).length).toBe(2);
    expect(file.stores.session.data.terminalHistory).toEqual(['help', 'play sort']);
  });
});

test('the daily challenge screen starts the same set the terminal plays', async ({ page }) => {
  await page.addInitScript(
    ({ createdAt }) => {
      const settings = { name: 'Robin', examAt: '2026-11-13T15:00:00+11:00', newCardLimit: 25, sound: false, motion: 'system', onboarded: true, createdAt };
      if (!window.localStorage.getItem('coldboot:v1:settings')) {
        window.localStorage.setItem('coldboot:v1:settings', JSON.stringify({ v: 1, data: settings }));
      }
    },
    { createdAt: FIXED_NOW.getTime() },
  );

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await page.getByRole('link', { name: 'Daily challenge: Not done yet' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Daily challenge' })).toBeVisible();
  await expect(page.getByText('Thursday 1 October: the same set for everyone.')).toBeVisible();
  await page.getByRole('button', { name: 'Start the daily challenge' }).click();
  await expect(page.getByText('Question 1 of 10')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible();

  // The terminal sees the same day: it carries on the set the screen started.
  await page.getByRole('heading', { level: 1, name: 'Daily challenge' }).click();
  await page.keyboard.press('Backquote');
  const drawer = page.getByRole('dialog', { name: 'Terminal' });
  const input = drawer.getByRole('textbox', { name: /Terminal command|Your answer/ });
  await expect(input).toBeFocused();
  await input.fill('daily');
  await input.press('Enter');
  await expect(drawer.getByRole('log', { name: 'Terminal output' }).getByText('Question 1 of 10')).toBeVisible();
  // Saved writes are debounced, so wait for the day's record to reach storage.
  await expect
    .poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('coldboot:v1:session') ?? 'null')?.data?.daily?.['2026-10-01']?.itemIds?.length ?? 0))
    .toBe(10);
});

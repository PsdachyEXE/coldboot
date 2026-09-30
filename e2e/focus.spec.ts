/**
 * Keyboard focus that only a real browser's layout shows, against the production build: Shift+Tab
 * upwards through a paper never leaves the focused control under the sticky exam bar (WCAG 2.4.11).
 */
import { expect, test, type Page } from '@playwright/test';

const FIXED_NOW = new Date('2026-10-01T16:00:00+10:00');

/** An onboarded profile with nothing else, and reduced motion so the boot and drawer don't play. */
async function onboard(page: Page): Promise<void> {
  const settings = {
    v: 1,
    data: { name: 'Robin', examAt: '2026-11-13T15:00:00+11:00', newCardLimit: 25, sound: false, motion: 'reduce', onboarded: true, createdAt: FIXED_NOW.getTime() - 86_400_000 },
  };
  await page.addInitScript((value) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('coldboot:v1:settings', JSON.stringify(value));
  }, settings);
}

for (const [width, height] of [
  [1280, 900],
  [360, 740],
] as const) {
  test(`Shift+Tab upwards through a paper never lands under the sticky exam bar at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.clock.install({ time: FIXED_NOW });
    await onboard(page);
    await page.goto('/#/exam?mini=1');
    await page.getByRole('button', { name: 'Start mini paper' }).click();
    // Past the mini paper's reading time, into writing time.
    await page.clock.runFor(3 * 60_000 + 2_000);
    await expect(page.getByRole('button', { name: 'Submit paper' })).toBeVisible();
    await page.getByRole('tab', { name: /Section C/ }).click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole('button', { name: 'Stop and discard this paper' }).focus();

    const hidden: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Shift+Tab');
      const f = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        const bar = document.querySelector('[role="timer"]')?.parentElement;
        if (!el || !bar || !el.closest('main')) return null;
        if (bar.contains(el)) return { skip: true, name: '', top: 0, barBottom: 0 };
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
        return { skip: false, name, top: el.getBoundingClientRect().top, barBottom: bar.getBoundingClientRect().bottom };
      });
      if (!f) break;
      if (!f.skip && f.top < f.barBottom - 1) hidden.push(`${f.name} at ${Math.round(f.top)} under a bar ending at ${Math.round(f.barBottom)}`);
    }
    expect(hidden).toEqual([]);
  });
}

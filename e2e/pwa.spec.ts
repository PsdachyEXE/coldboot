/**
 * The installed-app behaviour, against the production build under the GitHub Pages base path
 * (/coldboot/, see playwright.config.ts): once the service worker has precached the app, a reload
 * with the network off still opens Home and a drill, whose questions live in their own chunks; and
 * a new deploy brings up "Update ready. Reload now?", whose Reload moves the page onto it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const FIXED_NOW = new Date('2026-10-01T16:00:00+10:00');

/** The preview server reads files from disk on every request, so changing this file is a new deploy. */
const SW_FILE = resolve('dist/sw.js');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.violatedDirective} blocked ${e.blockedURI} at ${e.sourceFile}`));
  });
  // An onboarded profile with reduced motion, so the boot sequence doesn't play.
  const settings = {
    v: 1,
    data: { name: 'Robin', examAt: '2026-11-13T15:00:00+11:00', newCardLimit: 25, sound: false, motion: 'reduce', onboarded: true, createdAt: FIXED_NOW.getTime() - 86_400_000 },
  };
  await page.addInitScript((value) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('coldboot:v1:settings', JSON.stringify(value));
  }, settings);
});

test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [])).toEqual([]);
});

/** Waits for "[offline ready]" in the status bar: the worker has precached the app. */
async function waitForOfflineReady(page: Page): Promise<void> {
  await expect(page.locator('[data-segment="offline"]')).toBeVisible({ timeout: 30_000 });
}

test('reloads with the network off once the app is cached', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await waitForOfflineReady(page);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    // A drill needs the Drill chunks and the question content, all from the precache.
    await page.goto('./#/drill?kk=U3O1-KK04');
    await expect(page.getByText(/^Question 1 of /).first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('a new deploy shows the update prompt, and Reload moves onto it', async ({ page }) => {
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await waitForOfflineReady(page);

  const original = readFileSync(SW_FILE, 'utf8');
  try {
    writeFileSync(SW_FILE, `${original}\n// e2e: a new deploy\n`);
    await page.getByRole('button', { name: 'Check for updates' }).click();
    const prompt = page.getByRole('region', { name: 'Update' });
    await expect(prompt).toContainText('Update ready. Reload now?');

    await Promise.all([page.waitForEvent('load'), prompt.getByRole('button', { name: 'Reload' }).click()]);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(prompt).toBeHidden();
    // The new worker has taken over: nothing is left waiting.
    expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(false);
  } finally {
    writeFileSync(SW_FILE, original);
  }
});

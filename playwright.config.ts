/**
 * End-to-end run (Section 12, P1): builds the app, serves the production build with `vite preview`
 * and drives it in Chromium. Locally the preinstalled Chromium is used (PLAYWRIGHT_BROWSERS_PATH);
 * CI installs its own with `npx playwright install --with-deps chromium`.
 *
 *   npm run e2e
 *
 * The build uses base "/" (BASE_PATH), whatever GITHUB_REPOSITORY says, so the URLs below hold in
 * CI too. E2E_PORT picks the preview port (default 4317, away from Vite's usual ports).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4317);
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    locale: 'en-AU',
    timezoneId: 'Australia/Melbourne',
    // Default motion, as most students run it: the boot sequence and the drawer slide play, and
    // Playwright's actionability checks wait for them.
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    env: { BASE_PATH: '/' },
    // Always build the tree under test; never pick up another checkout's server on the same port.
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

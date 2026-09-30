/// <reference types="vite-plugin-pwa/vanillajs" />
// First: configures Zod (every schema module imports z from here too; see the file for why).
import './lib/zodConfig';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@fontsource-variable/martian-mono';
import '@fontsource-variable/atkinson-hyperlegible-next';
import './ui/tokens.css';
import './ui/global.css';
import './ui/markdown.css';
import { createAppRouter, prefetchScreens } from './app/routes';
import { startPwa } from './app/pwa';
import { whenIdle } from './lib/idle';
import { useSettings, type MotionPreference } from './state/settings';

// Mirror the motion setting onto <html data-motion> so global.css can stop animations.
function applyMotion(motion: MotionPreference): void {
  document.documentElement.dataset.motion = motion;
}
applyMotion(useSettings.getState().motion);
useSettings.subscribe((s, prev) => {
  if (s.motion !== prev.motion) applyMotion(s.motion);
});

// The service worker exists only in production builds; the virtual module stays out of dev and tests.
if (import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => startPwa(registerSW))
    .catch(() => {
      // Offline support is unavailable; the app still runs.
    });
}

const router = createAppRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Once the shell is idle, fetch the lazily loaded screens so the first visit to each is instant.
whenIdle(prefetchScreens, 5000);

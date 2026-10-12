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
import { createAppRouter, prefetchScreens, preloadScreen } from './app/routes';
import { startPwa } from './app/pwa';
import { useContent } from './content/store';
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

// Start fetching the opening screen's chunk now, alongside the rest of start-up. When it arrives
// before React's first render (from the cache on a repeat visit, or on a fast connection), the
// screen renders directly instead of suspending on it (see lazyComponent). The render
// doesn't wait for it: on a slow connection that would only hold back the first paint.
void preloadScreen(window.location.hash.slice(1));

const router = createAppRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Once the shell is idle, make sure the study content is loading (Layout starts it; nearly every
// screen needs it), then fetch the other screens so the first visit to each is instant. The
// content goes first: on a slow phone connection the prefetch would otherwise compete with what
// the open screen is waiting for.
whenIdle(() => {
  void useContent
    .getState()
    .load()
    .finally(() => whenIdle(prefetchScreens, 5000));
}, 5000);

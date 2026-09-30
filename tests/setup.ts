import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
    // Tab state (drafts, Today's run) mustn't carry from one test into the next.
    window.sessionStorage.clear();
  } catch {
    // jsdom storage can be unavailable in some environments; tests that need it set it up.
  }
});

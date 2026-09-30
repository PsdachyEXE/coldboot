import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    // jsdom storage can be unavailable in some environments; tests that need it set it up.
  }
});

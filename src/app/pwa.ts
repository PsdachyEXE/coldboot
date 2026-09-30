/**
 * Service worker registration and the update prompt (Section 10, Section 14).
 *
 * vite-plugin-pwa runs in prompt mode with `injectRegister: null`, so the app registers the worker
 * itself. main.tsx imports `virtual:pwa-register` only in production builds and hands its
 * `registerSW` to `startPwa`, which keeps this module (and the tests) free of the virtual module.
 */
import { create } from 'zustand';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

export type RegisterSW = (options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>;

/** What "Check for updates" found. */
export type UpdateCheck =
  /** Already running the newest build. */
  | 'latest'
  /** A new build is installed and waiting; reload to use it. */
  | 'ready'
  /** No service worker (development builds, or a browser without service workers). */
  | 'unavailable'
  /** The check failed, usually because the device is offline. */
  | 'error';

export interface PwaState {
  /** A new build is waiting and the prompt should show. "Later" hides the prompt for now. */
  needRefresh: boolean;
  /** A new build is waiting (stays true after "Later", so Settings can still offer the reload). */
  updateWaiting: boolean;
  /** The app shell and content are precached, so the app reloads offline. */
  offlineReady: boolean;
  /** Activates the waiting build and reloads the page. */
  reload(): Promise<void>;
  /** Hides the update prompt until the next update or check. */
  dismiss(): void;
  /** Asks the server for a new build now. */
  checkForUpdate(): Promise<UpdateCheck>;
}

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let reloadPage: () => void = () => window.location.reload();

/** If the new build hasn't taken control by then, reload anyway (it activates on the next load). */
const TAKEOVER_WAIT_MS = 4000;

/** How often an open window checks for a new deploy. The installed app can stay open for days. */
export const UPDATE_POLL_MS = 60 * 60 * 1000;
const INSTALL_WAIT_MS = 30_000;

function waitForInstalled(worker: ServiceWorker, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (worker.state === 'installed' || worker.state === 'activated' || worker.state === 'redundant') {
      resolve();
      return;
    }
    const timer = setTimeout(done, timeoutMs);
    function done() {
      clearTimeout(timer);
      worker.removeEventListener('statechange', onChange);
      resolve();
    }
    function onChange() {
      if (worker.state !== 'installing') done();
    }
    worker.addEventListener('statechange', onChange);
  });
}

export const usePwa = create<PwaState>()((set, get) => ({
  needRefresh: false,
  updateWaiting: false,
  offlineReady: false,
  reload: async () => {
    const waiting = registration?.waiting ?? null;
    if (!updateSW || (registration && !waiting)) {
      reloadPage();
      return;
    }
    // Reload as soon as the new build controls the page. The plugin reloads too, but only once its
    // own 'waiting' event has fired (200 ms after install), so a quick click could otherwise stall.
    let reloaded = false;
    const once = () => {
      if (reloaded) return;
      reloaded = true;
      reloadPage();
    };
    navigator.serviceWorker?.addEventListener('controllerchange', once, { once: true });
    setTimeout(once, TAKEOVER_WAIT_MS);
    await updateSW(true);
  },
  dismiss: () => set({ needRefresh: false }),
  checkForUpdate: async () => {
    if (get().updateWaiting) {
      set({ needRefresh: true });
      return 'ready';
    }
    if (!registration) return 'unavailable';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'error';
    try {
      await registration.update();
    } catch {
      return 'error';
    }
    const installing = registration.installing;
    if (installing) await waitForInstalled(installing, INSTALL_WAIT_MS);
    if (registration.waiting) {
      set({ needRefresh: true, updateWaiting: true });
      return 'ready';
    }
    return 'latest';
  },
}));

/**
 * Registers the service worker and wires its events into `usePwa`. Call once, in production only.
 * Never throws: the app works without a service worker, just not offline.
 */
export function startPwa(registerSW: RegisterSW): void {
  try {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh: () => usePwa.setState({ needRefresh: true, updateWaiting: true }),
      onOfflineReady: () => usePwa.setState({ offlineReady: true }),
      onRegisteredSW: (_url, reg) => {
        registration = reg ?? null;
        // A worker that is already active has finished precaching on an earlier visit.
        if (reg?.active) usePwa.setState({ offlineReady: true });
        if (reg && pollTimer === null && typeof setInterval === 'function') {
          pollTimer = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine !== false) void reg.update().catch(() => undefined);
          }, UPDATE_POLL_MS);
        }
      },
      onRegisterError: () => {
        // Offline support is unavailable; the app still runs.
      },
    });
  } catch {
    updateSW = null;
  }
}

/** Test hook: forget the registration and reset the store; optionally replace the page reload. */
export function resetPwaForTests(reload?: () => void): void {
  reloadPage = reload ?? (() => window.location.reload());
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  updateSW = null;
  registration = null;
  usePwa.setState({ needRefresh: false, updateWaiting: false, offlineReady: false });
}

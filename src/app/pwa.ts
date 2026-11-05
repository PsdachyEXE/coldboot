/**
 * Service worker registration and the update prompt (Section 10, Section 14).
 *
 * vite-plugin-pwa runs in prompt mode with `injectRegister: null`, so the app registers the worker
 * itself. main.tsx imports `virtual:pwa-register` only in production builds and hands its
 * `registerSW` to `startPwa`, which keeps this module (and the tests) free of the virtual module.
 *
 * A new build that arrives while the app is open asks first ("Update ready. Reload now?"). But a
 * waiting build never takes over on its own while an installed app stays open, so an ignored prompt
 * could leave a student on an old version for days (D-223). So the waiting build is also applied
 * without asking at two moments that cost nothing: when the app starts with a build downloaded on
 * an earlier visit, before anything is under way, and when the app is put in the background on a
 * screen where nothing is in progress. Coming back to the app after a while checks for a new build.
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
let listening = false;
let reloadPage: () => void = () => window.location.reload();

/** If the new build hasn't taken control by then, reload anyway (it activates on the next load). */
const TAKEOVER_WAIT_MS = 4000;

/** How often an open window checks for a new deploy. The installed app can stay open for days. */
export const UPDATE_POLL_MS = 60 * 60 * 1000;
/** Coming back to the app after at least this long checks for a new deploy at once. */
export const RETURN_CHECK_MS = 10 * 60 * 1000;
/** At most one automatic update per tab in this time, so a build that never takes over can't loop reloads. */
export const AUTO_UPDATE_GAP_MS = 60 * 1000;
const AUTO_UPDATE_KEY = 'coldboot:v1:pwa-auto-update';

export interface PwaOptions {
  /** True when a reload now would lose nothing the student is in the middle of. */
  canReloadNow?(): boolean;
}

let canReloadNow: () => boolean = () => false;
let lastCheckAt = 0;
/** An automatic update is under way, so the prompt stays hidden while the page reloads. */
let applying = false;

/**
 * Applies the waiting build without asking. Returns false, leaving it to the prompt, when an
 * automatic update already ran in this tab in the last minute or the tab can't remember that.
 */
function applyWithoutAsking(): boolean {
  const now = Date.now();
  try {
    const last = Number(window.sessionStorage.getItem(AUTO_UPDATE_KEY) ?? 0);
    if (now - last < AUTO_UPDATE_GAP_MS) return false;
    window.sessionStorage.setItem(AUTO_UPDATE_KEY, String(now));
  } catch {
    return false;
  }
  applying = true;
  usePwa.setState({ needRefresh: false });
  void usePwa.getState().reload();
  return true;
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    if (usePwa.getState().updateWaiting && registration?.waiting && canReloadNow()) applyWithoutAsking();
    return;
  }
  if (registration && Date.now() - lastCheckAt >= RETURN_CHECK_MS && navigator.onLine !== false) {
    lastCheckAt = Date.now();
    void registration.update().catch(() => undefined);
  }
}

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
export function startPwa(registerSW: RegisterSW, options: PwaOptions = {}): void {
  canReloadNow = options.canReloadNow ?? (() => false);
  applying = false;
  try {
    updateSW = registerSW({
      // Registration waits for the page's load event, so precaching never competes with first paint.
      onNeedRefresh: () => usePwa.setState({ needRefresh: !applying, updateWaiting: true }),
      onOfflineReady: () => usePwa.setState({ offlineReady: true }),
      onRegisteredSW: (_url, reg) => {
        registration = reg ?? null;
        lastCheckAt = Date.now();
        // A worker that is already active has finished precaching on an earlier visit.
        if (reg?.active) usePwa.setState({ offlineReady: true });
        // A build downloaded on an earlier visit and never applied: the app has only just opened,
        // so nothing is under way yet, and a moment's reload brings everyone onto it.
        if (reg?.waiting) {
          usePwa.setState({ updateWaiting: true });
          applyWithoutAsking();
        }
        if (reg && pollTimer === null && typeof setInterval === 'function') {
          pollTimer = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine !== false) {
              lastCheckAt = Date.now();
              void reg.update().catch(() => undefined);
            }
          }, UPDATE_POLL_MS);
        }
        if (reg && !listening && typeof document !== 'undefined') {
          listening = true;
          document.addEventListener('visibilitychange', onVisibilityChange);
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
  if (listening) document.removeEventListener('visibilitychange', onVisibilityChange);
  listening = false;
  canReloadNow = () => false;
  lastCheckAt = 0;
  applying = false;
  try {
    window.sessionStorage.removeItem(AUTO_UPDATE_KEY);
  } catch {
    // Nothing to forget.
  }
  updateSW = null;
  registration = null;
  usePwa.setState({ needRefresh: false, updateWaiting: false, offlineReady: false });
}

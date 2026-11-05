import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import { resetPwaForTests, startPwa, usePwa, type RegisterSW } from './pwa';

function fakeRegister() {
  let options: RegisterSWOptions = {};
  const updateSW = vi.fn(() => Promise.resolve());
  const registerSW: RegisterSW = (opts) => {
    options = opts ?? {};
    return updateSW;
  };
  return { registerSW, updateSW, options: () => options };
}

function fakeRegistration(overrides: Partial<ServiceWorkerRegistration> = {}): ServiceWorkerRegistration {
  return { active: null, waiting: null, installing: null, update: vi.fn(() => Promise.resolve()), ...overrides } as unknown as ServiceWorkerRegistration;
}

describe('pwa store', () => {
  afterEach(() => resetPwaForTests());

  it('shows the update prompt when a new build is waiting, and Later hides it', () => {
    const fake = fakeRegister();
    startPwa(fake.registerSW);
    fake.options().onNeedRefresh?.();
    expect(usePwa.getState().needRefresh).toBe(true);
    usePwa.getState().dismiss();
    expect(usePwa.getState().needRefresh).toBe(false);
    expect(usePwa.getState().updateWaiting).toBe(true);
  });

  it('reload activates the waiting build, then reloads once it takes control', async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    resetPwaForTests(reload);
    const fake = fakeRegister();
    startPwa(fake.registerSW);
    // A build that arrived while the app was open, so it waits for the prompt.
    const reg = fakeRegistration();
    fake.options().onRegisteredSW?.('sw.js', reg);
    Object.assign(reg, { waiting: {} as ServiceWorker });
    await usePwa.getState().reload();
    expect(fake.updateSW).toHaveBeenCalledWith(true);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4000);
    expect(reload).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('reload just reloads when nothing is waiting', async () => {
    const reload = vi.fn();
    resetPwaForTests(reload);
    const fake = fakeRegister();
    startPwa(fake.registerSW);
    fake.options().onRegisteredSW?.('sw.js', fakeRegistration());
    await usePwa.getState().reload();
    expect(fake.updateSW).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reports offline ready on first precache and on later visits', () => {
    const first = fakeRegister();
    startPwa(first.registerSW);
    expect(usePwa.getState().offlineReady).toBe(false);
    first.options().onOfflineReady?.();
    expect(usePwa.getState().offlineReady).toBe(true);

    resetPwaForTests();
    const later = fakeRegister();
    startPwa(later.registerSW);
    later.options().onRegisteredSW?.('sw.js', fakeRegistration({ active: {} as ServiceWorker }));
    expect(usePwa.getState().offlineReady).toBe(true);
  });

  it('checkForUpdate answers latest, ready, unavailable or error', async () => {
    expect(await usePwa.getState().checkForUpdate()).toBe('unavailable');

    const fake = fakeRegister();
    startPwa(fake.registerSW);
    const reg = fakeRegistration();
    fake.options().onRegisteredSW?.('sw.js', reg);
    expect(await usePwa.getState().checkForUpdate()).toBe('latest');
    expect(reg.update).toHaveBeenCalled();

    (reg as { waiting: unknown }).waiting = {};
    expect(await usePwa.getState().checkForUpdate()).toBe('ready');
    expect(usePwa.getState().needRefresh).toBe(true);

    resetPwaForTests();
    const offline = fakeRegister();
    startPwa(offline.registerSW);
    offline.options().onRegisteredSW?.('sw.js', fakeRegistration({ update: vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))) }));
    expect(await usePwa.getState().checkForUpdate()).toBe('error');
  });

  it('never throws when registration fails', () => {
    expect(() =>
      startPwa(() => {
        throw new Error('SecurityError');
      }),
    ).not.toThrow();
  });

  describe('applying a waiting build without asking', () => {
    function setVisibility(state: DocumentVisibilityState) {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
      document.dispatchEvent(new Event('visibilitychange'));
    }
    afterEach(() => {
      setVisibility('visible');
      vi.useRealTimers();
    });

    it('applies a build downloaded on an earlier visit as soon as the app opens, without the prompt', () => {
      const reload = vi.fn();
      resetPwaForTests(reload);
      const fake = fakeRegister();
      startPwa(fake.registerSW);
      fake.options().onRegisteredSW?.('sw.js', fakeRegistration({ waiting: {} as ServiceWorker }));
      fake.options().onNeedRefresh?.();
      expect(fake.updateSW).toHaveBeenCalledWith(true);
      expect(usePwa.getState().needRefresh).toBe(false);
    });

    it('tries at most once a minute in a tab, so a build that never takes over prompts instead of looping', () => {
      vi.useFakeTimers();
      resetPwaForTests(vi.fn());
      const first = fakeRegister();
      startPwa(first.registerSW);
      first.options().onRegisteredSW?.('sw.js', fakeRegistration({ waiting: {} as ServiceWorker }));
      expect(first.updateSW).toHaveBeenCalledTimes(1);

      // The page reloaded, but the same build is still waiting: ask instead.
      const second = fakeRegister();
      startPwa(second.registerSW);
      second.options().onRegisteredSW?.('sw.js', fakeRegistration({ waiting: {} as ServiceWorker }));
      second.options().onNeedRefresh?.();
      expect(second.updateSW).not.toHaveBeenCalled();
      expect(usePwa.getState().needRefresh).toBe(true);

      vi.advanceTimersByTime(61_000);
      const third = fakeRegister();
      startPwa(third.registerSW);
      third.options().onRegisteredSW?.('sw.js', fakeRegistration({ waiting: {} as ServiceWorker }));
      expect(third.updateSW).toHaveBeenCalledTimes(1);
    });

    it('asks first when a new build arrives while the app is open', () => {
      resetPwaForTests(vi.fn());
      const fake = fakeRegister();
      startPwa(fake.registerSW, { canReloadNow: () => true });
      fake.options().onRegisteredSW?.('sw.js', fakeRegistration());
      fake.options().onNeedRefresh?.();
      expect(usePwa.getState().needRefresh).toBe(true);
      expect(fake.updateSW).not.toHaveBeenCalled();
    });

    it('applies it when the app goes into the background on a quiet screen, and not otherwise', () => {
      resetPwaForTests(vi.fn());
      let quiet = false;
      const fake = fakeRegister();
      startPwa(fake.registerSW, { canReloadNow: () => quiet });
      const reg = fakeRegistration();
      fake.options().onRegisteredSW?.('sw.js', reg);
      // A build arrives mid-session and is left waiting.
      Object.assign(reg, { waiting: {} as ServiceWorker });
      fake.options().onNeedRefresh?.();

      setVisibility('hidden');
      expect(fake.updateSW).not.toHaveBeenCalled();
      setVisibility('visible');

      quiet = true;
      setVisibility('hidden');
      expect(fake.updateSW).toHaveBeenCalledWith(true);
    });

    it('checks for a new build when the app comes back after ten minutes away', () => {
      vi.useFakeTimers();
      resetPwaForTests(vi.fn());
      const fake = fakeRegister();
      startPwa(fake.registerSW);
      const reg = fakeRegistration();
      fake.options().onRegisteredSW?.('sw.js', reg);
      setVisibility('hidden');
      setVisibility('visible');
      expect(reg.update).not.toHaveBeenCalled();
      vi.advanceTimersByTime(10 * 60 * 1000);
      setVisibility('hidden');
      setVisibility('visible');
      expect(reg.update).toHaveBeenCalledTimes(1);
    });
  });
});

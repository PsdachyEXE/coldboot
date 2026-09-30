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
    fake.options().onRegisteredSW?.('sw.js', fakeRegistration({ waiting: {} as ServiceWorker }));
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
});

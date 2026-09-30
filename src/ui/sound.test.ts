import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from '../state/settings';
import { playCue, resetSoundForTests } from './sound';

function fakeAudio() {
  const oscillators: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const ctor = vi.fn(function FakeAudioContext(this: Record<string, unknown>) {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.resume = vi.fn(() => Promise.resolve());
    this.createOscillator = () => {
      const osc = { type: 'sine', frequency: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    };
    this.createGain = () => ({ gain: param(), connect: vi.fn() });
  });
  return { ctor, oscillators };
}

describe('playCue', () => {
  beforeEach(() => resetSoundForTests());
  afterEach(() => {
    vi.unstubAllGlobals();
    useSettings.getState().setSound(false);
  });

  it('is a no-op while sound is off (the default)', () => {
    const { ctor } = fakeAudio();
    vi.stubGlobal('AudioContext', ctor);
    expect(useSettings.getState().sound).toBe(false);
    playCue('correct');
    expect(ctor).not.toHaveBeenCalled();
  });

  it('plays synthesised tones when sound is on', () => {
    const { ctor, oscillators } = fakeAudio();
    vi.stubGlobal('AudioContext', ctor);
    useSettings.getState().setSound(true);
    playCue('complete');
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(oscillators).toHaveLength(3);
    expect(oscillators.every((o) => o.start.mock.calls.length === 1 && o.stop.mock.calls.length === 1)).toBe(true);
  });

  it('does nothing and never throws without WebAudio', () => {
    vi.stubGlobal('AudioContext', undefined);
    useSettings.getState().setSound(true);
    expect(() => playCue('incorrect')).not.toThrow();
  });

  it('never throws when the audio context fails', () => {
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function Broken() {
        throw new Error('NotAllowedError');
      }),
    );
    useSettings.getState().setSound(true);
    expect(() => playCue('correct')).not.toThrow();
  });
});

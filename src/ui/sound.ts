/**
 * Sound cues, off by default (Settings turns them on). Each cue is a few milliseconds of tone
 * synthesised with WebAudio, so there are no audio files to download or cache.
 *
 * `playCue` never throws and does nothing when sound is off, when WebAudio is missing, or when the
 * browser refuses to start audio.
 */
import { useSettings } from '../state/settings';

export type Cue = 'correct' | 'incorrect' | 'complete';

interface Tone {
  /** Frequency in Hz. */
  f: number;
  /** Start offset in seconds. */
  at: number;
  /** Length in seconds. */
  len: number;
  type: OscillatorType;
}

/** Short, quiet and distinct: a rising pair, a single low tone, a three-note run. */
export const CUES: Readonly<Record<Cue, readonly Tone[]>> = {
  correct: [
    { f: 660, at: 0, len: 0.07, type: 'sine' },
    { f: 880, at: 0.075, len: 0.09, type: 'sine' },
  ],
  incorrect: [{ f: 196, at: 0, len: 0.16, type: 'triangle' }],
  complete: [
    { f: 523.25, at: 0, len: 0.09, type: 'sine' },
    { f: 659.25, at: 0.1, len: 0.09, type: 'sine' },
    { f: 783.99, at: 0.2, len: 0.16, type: 'sine' },
  ],
};

const PEAK_GAIN = 0.08;

type AudioContextCtor = new () => AudioContext;

let context: AudioContext | null = null;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

function getContext(): AudioContext | null {
  if (context) return context;
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

/** Plays a cue if the user has sound on. Safe to call from anywhere, any number of times. */
export function playCue(cue: Cue): void {
  try {
    if (!useSettings.getState().sound) return;
    const tones = CUES[cue];
    if (!tones) return;
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const start = ctx.currentTime + 0.01;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.f, start + tone.at);
      // A fast attack and an exponential release avoid clicks at either end.
      gain.gain.setValueAtTime(0.0001, start + tone.at);
      gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + tone.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.at + tone.len);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + tone.at);
      osc.stop(start + tone.at + tone.len + 0.02);
    }
  } catch {
    // Sound is a nicety: never let it break an answer.
  }
}

/** Test hook: forget the cached AudioContext. */
export function resetSoundForTests(): void {
  context = null;
}

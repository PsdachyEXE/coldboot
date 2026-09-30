/** Sound cues (off by default). Track A implements the synthesised cues; this stub keeps callers compiling. */
export type Cue = 'correct' | 'incorrect' | 'complete';

export function playCue(_cue: Cue): void {
  // Implemented by track A with WebAudio when settings.sound is on.
}

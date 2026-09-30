/**
 * Loads the generator games the daily set draws on, through the daily game's own loader
 * (`loadGenerators` in src/games/daily-game, which goes through the registry), once per page load.
 * A failed load (offline, stale deploy) is not cached, so "Try again" really retries.
 */
import { useCallback, useEffect, useState } from 'react';
import { loadGenerators, type Generators } from '../../games/daily-game';

export type GeneratorsState = { status: 'loading' } | { status: 'ready'; generators: Generators } | { status: 'error' };

let pending: Promise<Generators> | null = null;
let loaded: Generators | null = null;

function load(): Promise<Generators> {
  if (!pending) {
    pending = loadGenerators().then((g) => {
      loaded = g;
      return g;
    });
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

export function useGenerators(): { state: GeneratorsState; retry(): void } {
  const [state, setState] = useState<GeneratorsState>(() => (loaded ? { status: 'ready', generators: loaded } : { status: 'loading' }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loaded) return;
    let live = true;
    load().then(
      (generators) => {
        if (live) setState({ status: 'ready', generators });
      },
      () => {
        if (live) setState({ status: 'error' });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

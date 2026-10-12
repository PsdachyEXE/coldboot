/**
 * React.lazy with a direct path once the chunk is in. lazy() suspends for a tick even when its
 * module has already loaded, which commits the nearest Suspense fallback and brings in React's
 * reveal throttle: the content then shows no sooner than 300 ms after the fallback appeared. After
 * `load()` has resolved (a preload, a prefetch or an earlier render), the component renders the
 * loaded one itself and never suspends.
 *
 * `Loaded` is set before lazy() sees its promise resolve, so lazy's retry already takes the direct
 * path, and the element type never changes under a mounted component.
 */
import { lazy, type ComponentType } from 'react';

export type Preloadable<P extends object> = ComponentType<P> & {
  /** Fetches the chunk. Rejects when it can't be fetched; rendering then retries through lazy(). */
  load(): Promise<unknown>;
};

export function lazyComponent<P extends object>(importer: () => Promise<{ default: ComponentType<P> }>): Preloadable<P> {
  let Loaded: ComponentType<P> | null = null;
  const load = () =>
    importer().then((m) => {
      Loaded = m.default;
      return m;
    });
  const Lazy = lazy(load);
  function Component(props: P) {
    return Loaded ? <Loaded {...props} /> : <Lazy {...props} />;
  }
  return Object.assign(Component, { load });
}

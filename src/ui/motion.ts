/** Reduced motion: the settings override wins; 'system' follows prefers-reduced-motion. */
import { useSyncExternalStore } from 'react';
import { useSettings, type MotionPreference } from '../state/settings';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function systemPrefersReduced(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

export function resolveReducedMotion(pref: MotionPreference, systemReduced: boolean): boolean {
  if (pref === 'reduce') return true;
  if (pref === 'full') return false;
  return systemReduced;
}

export function useReducedMotion(): boolean {
  const pref = useSettings((s) => s.motion);
  const system = useSyncExternalStore(subscribe, systemPrefersReduced, () => false);
  return resolveReducedMotion(pref, system);
}

/** Non-hook read for imperative code (boot sequence, terminal). */
export function prefersReducedMotion(): boolean {
  return resolveReducedMotion(useSettings.getState().motion, systemPrefersReduced());
}

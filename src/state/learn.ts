/**
 * Learn reading records (docs/LEARN.md): when each key knowledge point's Learn page was last read
 * to its end. Reading is never scored and never counts towards mastery; the map, Home and Today's
 * run use these records only to tell a point that has been studied from one that has only been
 * tested. Exported with the rest of the progress, but optional in a progress file, so a file from
 * before Learn existed still imports.
 */
import { create } from 'zustand';
import { isKkId, type KkId } from '../content/schema';
import { MAX_EPOCH_MS } from '../lib/time';
import { z } from '../lib/zodConfig';
import { persistStore } from './persist';

export interface LearnData {
  /** Epoch ms each KK's page was last read, by KK id (TERMS and PSM included). */
  read: Partial<Record<KkId, number>>;
}

export interface LearnState extends LearnData {
  markRead(kk: KkId, at?: number): void;
  replace(data: LearnData): void;
  reset(): void;
}

const At = z.number().int().min(0).max(MAX_EPOCH_MS);

export const LearnDataSchema = z
  .object({
    read: z.record(z.custom<KkId>(isKkId), At),
  })
  .strict();

export function defaultLearn(): LearnData {
  return { read: {} };
}

export const useLearn = create<LearnState>()((set) => ({
  ...defaultLearn(),
  markRead: (kk, at = Date.now()) =>
    set((s) => {
      if (!isKkId(kk) || (s.read[kk] ?? 0) >= at) return s;
      return { read: { ...s.read, [kk]: at } };
    }),
  replace: (data) => set({ read: { ...data.read } }),
  reset: () => set(defaultLearn()),
}));

export function selectLearnData(s: LearnData): LearnData {
  return { read: s.read };
}

/** Keeps each valid record of damaged data. */
export function salvageLearn(raw: unknown): { data: LearnData; dropped: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const source = (raw as { read?: unknown }).read;
  if (typeof source !== 'object' || source === null) return { data: defaultLearn(), dropped: 1 };
  const read: Partial<Record<KkId, number>> = {};
  let dropped = 0;
  for (const [kk, at] of Object.entries(source)) {
    if (isKkId(kk) && At.safeParse(at).success) read[kk] = at as number;
    else dropped++;
  }
  return { data: { read }, dropped };
}

/** Cross-window merge: the later read wins for each KK. */
export function mergeLearn(local: LearnData, incoming: LearnData): LearnData {
  const read = { ...incoming.read };
  for (const [kk, at] of Object.entries(local.read) as [KkId, number][]) {
    if ((read[kk] ?? 0) < at) read[kk] = at;
  }
  return { read };
}

export const learnPersistence = persistStore(useLearn, {
  name: 'learn',
  version: 1,
  schema: LearnDataSchema,
  select: selectLearnData,
  hydrate: (data) => data,
  defaults: defaultLearn,
  salvage: salvageLearn,
  merge: mergeLearn,
});

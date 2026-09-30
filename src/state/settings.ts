/** Settings store: display name, exam instant, daily new-card limit, sound and motion. */
import { create } from 'zustand';
import { z } from 'zod';
import { DEFAULT_EXAM_AT, parseInstant } from '../lib/time';
import { cleanPlainText } from '../lib/text';
import { persistStore } from './persist';

export const NAME_MAX = 24;
export const NEW_CARD_LIMIT_DEFAULT = 25;
export const NEW_CARD_LIMIT_MAX = 200;

export type MotionPreference = 'system' | 'reduce' | 'full';

export interface SettingsData {
  /** Display name used in the terminal prompt. Empty until first run. */
  name: string;
  /** Exam start as an ISO 8601 instant with offset. */
  examAt: string;
  newCardLimit: number;
  sound: boolean;
  motion: MotionPreference;
  onboarded: boolean;
  /** Epoch ms of first run. */
  createdAt: number;
}

export interface SettingsState extends SettingsData {
  setName(name: string): void;
  setExamAt(iso: string): boolean;
  setNewCardLimit(n: number): void;
  setSound(on: boolean): void;
  setMotion(m: MotionPreference): void;
  completeOnboarding(data: { name: string; examAt: string; newCardLimit: number }): void;
  replace(data: SettingsData): void;
  reset(): void;
}

export const SettingsDataSchema = z
  .object({
    name: z.string().max(NAME_MAX),
    examAt: z.string().refine((s) => Number.isFinite(parseInstant(s)), 'Invalid exam date'),
    newCardLimit: z.number().int().min(1).max(NEW_CARD_LIMIT_MAX),
    sound: z.boolean(),
    motion: z.enum(['system', 'reduce', 'full']),
    onboarded: z.boolean(),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();

export function defaultSettings(now = Date.now()): SettingsData {
  return {
    name: '',
    examAt: DEFAULT_EXAM_AT,
    newCardLimit: NEW_CARD_LIMIT_DEFAULT,
    sound: false,
    motion: 'system',
    onboarded: false,
    createdAt: now,
  };
}

/** Terminal-safe display name: printable, trimmed, at most 24 characters. */
export function cleanName(name: string): string {
  return cleanPlainText(name, NAME_MAX);
}

export function clampNewCardLimit(n: number): number {
  if (!Number.isFinite(n)) return NEW_CARD_LIMIT_DEFAULT;
  return Math.min(NEW_CARD_LIMIT_MAX, Math.max(1, Math.round(n)));
}

export const useSettings = create<SettingsState>()((set) => ({
  ...defaultSettings(),
  setName: (name) => set({ name: cleanName(name) }),
  setExamAt: (iso) => {
    if (!Number.isFinite(parseInstant(iso))) return false;
    set({ examAt: iso });
    return true;
  },
  setNewCardLimit: (n) => set({ newCardLimit: clampNewCardLimit(n) }),
  setSound: (sound) => set({ sound }),
  setMotion: (motion) => set({ motion }),
  completeOnboarding: ({ name, examAt, newCardLimit }) =>
    set({
      name: cleanName(name),
      examAt: Number.isFinite(parseInstant(examAt)) ? examAt : DEFAULT_EXAM_AT,
      newCardLimit: clampNewCardLimit(newCardLimit),
      onboarded: true,
      createdAt: Date.now(),
    }),
  replace: (data) => set({ ...data }),
  reset: () => set(defaultSettings()),
}));

export function selectSettingsData(s: SettingsData): SettingsData {
  return {
    name: s.name,
    examAt: s.examAt,
    newCardLimit: s.newCardLimit,
    sound: s.sound,
    motion: s.motion,
    onboarded: s.onboarded,
    createdAt: s.createdAt,
  };
}

/** Exam start as epoch ms, falling back to the default instant if the stored value is invalid. */
export function examAtMs(s: Pick<SettingsData, 'examAt'>): number {
  const t = parseInstant(s.examAt);
  return Number.isFinite(t) ? t : parseInstant(DEFAULT_EXAM_AT);
}

export const settingsPersistence = persistStore(useSettings, {
  name: 'settings',
  version: 1,
  select: selectSettingsData,
  hydrate: (data) => data,
  validate: (data): data is SettingsData => SettingsDataSchema.safeParse(data).success,
});

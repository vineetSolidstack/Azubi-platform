'use client';
// Progress lives behind one small store interface. Today it is the browser's localStorage;
// later a Supabase-backed store can implement the same two functions.

import { useSyncExternalStore } from 'react';
import type { LadderRung } from '@/engine/plc';

export type Lang = 'de' | 'en';
export interface TaskProgress {
  solved: boolean;
  attempts: number;
  lang?: 'kop' | 'scl';
  scl?: string;
  rungs?: LadderRung[];
}
export interface Progress {
  lang: Lang;
  trade: string | null;
  tasks: Record<string, TaskProgress>;
  /** question id -> answered correctly on the last try */
  quiz: Record<string, boolean>;
  /** exercise id -> all steps solved */
  exercises: Record<string, boolean>;
}
export interface ProgressStore {
  load(): Progress;
  save(p: Progress): void;
}

const EMPTY: Progress = { lang: 'de', trade: null, tasks: {}, quiz: {}, exercises: {} };
const KEY = 'azubi-platform:v1';

const localStore: ProgressStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    } catch {
      return EMPTY;
    }
  },
  save(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // storage full or blocked: progress then only lasts for this visit
    }
  },
};

const store: ProgressStore = localStore;
let cache: Progress | null = null;
const listeners = new Set<() => void>();

const get = () => (cache ??= store.load());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function updateProgress(fn: (p: Progress) => Progress) {
  cache = fn(get());
  store.save(cache);
  listeners.forEach((l) => l());
}
export const updateTask = (id: string, patch: Partial<TaskProgress>) =>
  updateProgress((p) => ({ ...p, tasks: { ...p.tasks, [id]: { ...(p.tasks[id] ?? { solved: false, attempts: 0 }), ...patch } } }));

export const useProgress = (): Progress => useSyncExternalStore(subscribe, get, () => EMPTY);

/** false during server rendering and hydration, true afterwards */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export function useT() {
  const { lang } = useProgress();
  return { lang, t: (x: { de: string; en: string }) => x[lang] };
}

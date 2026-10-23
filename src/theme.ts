/**
 * The light/dark theme: one persisted, subscribable store (ticket 20), so the
 * header toggle and the Settings page always agree. The value lands on
 * <html data-theme> for the CSS custom-property blocks.
 */

import { useEffect, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pg-backgammon.theme';

export function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

let current: Theme | null = null;
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  if (current === null) {
    current = getInitialTheme();
  }
  return current;
}

/** Persist and apply a theme; every subscriber sees it instantly. */
export function setTheme(next: Theme): void {
  localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.setAttribute('data-theme', next);
  if (next === current) {
    return;
  }
  current = next;
  for (const listener of listeners) {
    listener();
  }
}

export function toggleTheme(): void {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribeTheme, getTheme);

  // A fresh page load (or a fresh test render) starts from the persisted
  // choice and stamps it on <html> before anything is themed.
  useEffect(() => {
    const stored = getInitialTheme();
    if (stored !== current) {
      current = stored;
      for (const listener of listeners) {
        listener();
      }
    }
    document.documentElement.setAttribute('data-theme', getTheme());
  }, []);

  return [theme, toggleTheme];
}

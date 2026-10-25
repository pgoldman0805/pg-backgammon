import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Ticket 43 route-splits the areas with React.lazy, so navigating to an area
// now resolves a dynamic import. Under Vitest's parallel workers the on-demand
// transform of a freshly-imported chunk can take well over the 1 s default,
// so give findBy/waitFor room to await a genuine chunk load rather than
// flaking. Elements that never appear simply fail a few seconds later.
configure({ asyncUtilTimeout: 10_000 });

// Node 24+ ships an experimental Web Storage global (gated behind
// --localstorage-file) whose `localStorage` getter returns undefined and
// shadows jsdom's own. Under that runtime any module reading `localStorage` at
// load time throws before a single test runs. When the ambient storage is
// unusable, stand a small in-memory Storage in its place so the suite runs the
// same everywhere; where jsdom's storage already works this is a no-op.
class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();
  get length(): number {
    return this.entries.size;
  }
  clear(): void {
    this.entries.clear();
  }
  getItem(key: string): string | null {
    return this.entries.has(key) ? (this.entries.get(key) as string) : null;
  }
  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.entries.delete(key);
  }
  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
}

function storageWorks(name: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const store = (globalThis as Record<string, unknown>)[name] as
      | Storage
      | undefined;
    if (!store) {
      return false;
    }
    const probe = '__pg_storage_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!storageWorks(name)) {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}

// One deterministic media environment for every jsdom test: no color-scheme
// preference (theme defaults light) and prefers-reduced-motion on, so checker
// animation defaults to off and no test is timing-flaky unless it explicitly
// opts in via setAnimationSpeed.
if (typeof window !== 'undefined') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

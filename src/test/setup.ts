import '@testing-library/jest-dom/vitest';

// Web Storage fallback: some jsdom/Node combinations leave `localStorage`
// (and `sessionStorage`) undefined on the jsdom window, which crashes any
// module that reads them at import time. Install a minimal in-memory Storage
// only when the environment did not provide one, so this is a no-op wherever
// jsdom's own storage is present.
function installMemoryStorage(key: 'localStorage' | 'sessionStorage'): void {
  const target = globalThis as Record<string, unknown>;
  if (target[key]) {
    return;
  }
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (name) => (store.has(name) ? (store.get(name) as string) : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (name) => {
      store.delete(name);
    },
    setItem: (name, value) => {
      store.set(name, String(value));
    },
  };
  target[key] = storage;
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[key] = storage;
  }
}

installMemoryStorage('localStorage');
installMemoryStorage('sessionStorage');

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

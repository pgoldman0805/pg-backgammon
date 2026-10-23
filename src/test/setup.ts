import '@testing-library/jest-dom/vitest';

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

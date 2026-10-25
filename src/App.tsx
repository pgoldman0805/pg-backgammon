import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
// Play is the landing route ('/'): it ships in the entry chunk so the first
// screen paints without a second round-trip.
import { Play } from './pages/Play';
// Imported from the leaf module, not the './puzzles' barrel: the barrel also
// re-exports the curated set and the generator, and pulling the hook through
// it would risk dragging that data back into the initial Play chunk.
import { useBlunderMining } from './puzzles/useBlunderMining';
import { useTheme } from './theme';
import { FirstRunPrimerPrompt } from './ui/FirstRunPrimerPrompt';
import { SaveFailureBanner } from './ui/SaveFailureBanner';

// Ticket 43: every non-landing area is its own chunk, dynamically imported the
// first time its route is opened. A Play-only visitor never downloads the
// Analyze, Progress, Settings or Learn code, and — crucially — never the
// ~1.3 MB curated puzzle set that rides along in the Puzzles chunk.
// vite-plugin-pwa's glob precache still covers every emitted chunk, so the app
// stays fully offline-capable after first load.
const Analyze = lazy(() =>
  import('./pages/Analyze').then((m) => ({ default: m.Analyze })),
);
const Learn = lazy(() =>
  import('./pages/Learn').then((m) => ({ default: m.Learn })),
);
const Progress = lazy(() =>
  import('./pages/Progress').then((m) => ({ default: m.Progress })),
);
const Puzzles = lazy(() =>
  import('./pages/Puzzles').then((m) => ({ default: m.Puzzles })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings })),
);

/** Play, with the match id Analyze's "Resume" put into the route state. */
function PlayRoute() {
  const location = useLocation();
  const state = location.state as { resumeMatchId?: string } | null;
  return <Play resumeMatchId={state?.resumeMatchId} />;
}

const areas = [
  { path: '/', label: 'Play' },
  { path: '/analyze', label: 'Analyze' },
  { path: '/puzzles', label: 'Puzzles' },
  { path: '/progress', label: 'Progress' },
  { path: '/settings', label: 'Settings' },
  // Ticket 32 adds the glossary here; ticket 30 folds how-to-play in beside it.
  { path: '/learn', label: 'Learn' },
];

/**
 * The header at phone widths (ticket 24): the five tabs fold into a Menu
 * button whose panel drops from under the header's bottom rule — the same
 * paper, hairline rows, and the board-point triangle marking the active
 * area (lying on its side at the row's left rail). The theme toggle rides
 * along as the panel's last row; desktop and tablet keep the full tab row.
 */
function ShellHeader() {
  const [theme, toggleTheme] = useTheme();
  const otherTheme = theme === 'light' ? 'dark' : 'light';
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Navigating anywhere closes the menu — including to the current area.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value we read
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // A tap on the page behind the open panel closes it.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuOpen]);

  const closeOnEscape = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && menuOpen) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape handling for the menu popup, not a click target
    <header className="shell-header" ref={headerRef} onKeyDown={closeOnEscape}>
      <span className="brand">
        <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
          <path className="brand-counterpoint" d="M4 3h11l-5.5 18z" />
          <path className="brand-point" d="M17 29h11l-5.5-18z" />
        </svg>
        pg-backgammon
      </span>
      <nav aria-label="Areas">
        <ul className="shell-nav">
          {areas.map((area) => (
            <li key={area.path}>
              <NavLink to={area.path} end>
                {area.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${otherTheme} theme`}
      >
        {otherTheme === 'dark' ? 'Dark' : 'Light'}
      </button>
      <button
        type="button"
        className="menu-toggle"
        ref={menuButtonRef}
        aria-label="Menu"
        aria-expanded={menuOpen}
        aria-controls="shell-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M2.5 5h15M2.5 10h15M2.5 15h15"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {menuOpen && (
        <nav className="shell-menu" id="shell-menu" aria-label="Menu">
          <ul className="shell-menu-list">
            {areas.map((area) => (
              <li key={area.path}>
                <NavLink to={area.path} end>
                  {area.label}
                </NavLink>
              </li>
            ))}
            <li className="shell-menu-theme">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${otherTheme} theme`}
              >
                Switch to {otherTheme} theme
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

/**
 * The stand-in while a route's chunk is in flight (ticket 43). After first
 * load every chunk is in the service-worker precache, so this is near-
 * instant on return visits and only briefly visible on the very first open
 * of each area — no jarring blank. role="status" announces it politely.
 */
function RouteFallback() {
  return (
    <p className="route-loading" role="status" aria-live="polite">
      Loading…
    </p>
  );
}

function App() {
  // Ticket 12: analyzed blunders mine themselves into puzzles app-wide.
  useBlunderMining();

  return (
    <BrowserRouter>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <ShellHeader />
      <SaveFailureBanner />
      <FirstRunPrimerPrompt />
      <main className="shell-main" id="content">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<PlayRoute />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/puzzles" element={<Puzzles />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/learn" element={<Learn />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}

export default App;

import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Analyze } from './pages/Analyze';
import { Play } from './pages/Play';
import { Progress } from './pages/Progress';
import { Puzzles } from './pages/Puzzles';
import { useTheme } from './theme';

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
];

function App() {
  const [theme, toggleTheme] = useTheme();
  const otherTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <BrowserRouter>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="shell-header">
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
      </header>
      <main className="shell-main" id="content">
        <Routes>
          <Route path="/" element={<PlayRoute />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/puzzles" element={<Puzzles />} />
          <Route path="/progress" element={<Progress />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;

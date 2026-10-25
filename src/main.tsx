import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initFirstRunTutorWindow } from './play/settings';
import { registerPwa } from './pwa.ts';
import { requestPersistentStorage } from './storage';

registerPwa();

// Settle Tutor mode's first-matches window before the Play page reads it
// (ticket 31): a brand-new user starts the window with Tutor on; a user who
// played before this feature existed is left past it, never force-enabled.
// Best-effort — a blocked localStorage must never stop the app from booting.
try {
  initFirstRunTutorWindow();
} catch {
  // Ignore: the first-matches default simply falls back to its off default.
}

// Ask the browser to keep our IndexedDB from being evicted (ticket 26): iOS
// purges an unopened PWA's storage after about a week, which would wipe every
// match and all puzzle progress. Idempotent, best-effort, and a no-op where
// the StorageManager API is absent, so it never blocks boot.
void requestPersistentStorage();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

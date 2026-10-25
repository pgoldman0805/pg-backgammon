/**
 * Service-worker registration (ticket 23, hardened in ticket 47). Build-only
 * in effect: in dev the virtual module is vite-plugin-pwa's no-op stub, so
 * `npm run dev` never registers a worker.
 *
 * The worker is generated in `prompt` mode (vite.config.ts) rather than
 * `autoUpdate`, so a new deploy no longer reloads the page unprompted. On
 * first launch the worker still installs, activates and claims the page
 * (workbox `clientsClaim`), so the app works offline immediately. When a later
 * launch finds a new deploy, `onNeedRefresh` fires and we reload to adopt it —
 * but the update gate defers that reload while a match is in progress (read
 * from the live-match storage flag) and applies it the moment the match ends,
 * so a deploy never reloads mid-turn and clips the last move inside the save
 * debounce.
 */

import { registerSW } from 'virtual:pwa-register';
import { createUpdateGate } from './pwaUpdate';
import { isLiveMatchInProgress, subscribeLiveMatch } from './storage/liveMatch';

export function registerPwa(): void {
  const gate = createUpdateGate({
    isMatchInProgress: isLiveMatchInProgress,
    subscribe: subscribeLiveMatch,
  });
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      gate.onUpdateReady(() => {
        void updateSW(true);
      });
    },
  });
}

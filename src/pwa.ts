/**
 * Service-worker registration (ticket 23). Build-only in effect: in dev the
 * virtual module is vite-plugin-pwa's no-op stub, so `npm run dev` never
 * registers a worker. With `registerType: 'autoUpdate'` the generated worker
 * skips waiting and claims clients; when a later launch finds a new deploy,
 * the registration reloads the page once the new worker activates, so the
 * phone picks updates up on next launch without user action.
 */

import { registerSW } from 'virtual:pwa-register';

export function registerPwa(): void {
  registerSW({ immediate: true });
}

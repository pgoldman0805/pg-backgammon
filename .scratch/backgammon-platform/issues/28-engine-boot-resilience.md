# 28: Engine boot resilience

**What to build:** A flaky network or a stalled load never leaves the app stuck on "Engine loading…" forever. The engine load times out into a clear, recoverable error; Retry genuinely re-attempts (rebuilding the worker) rather than failing instantly; and an engine or worker crash shows an error the player can recover from instead of hanging.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A stalled or failed engine load resolves to an error state within a bounded time, with a Retry offered
- [x] Retry after a failure recreates the engine and reaches ready when the network recovers (verified by forcing a first-load failure then a success)
- [x] A worker crash surfaces a recoverable error rather than leaving play permanently unresponsive
- [x] Full gauntlet green

## Comments

Worked TDD (red → green) against two seams: the `createGnubgEngine` client over an
injectable fake `EngineTransport` (`src/engine/client.test.ts`) and Play's
engine-status UI in jsdom (`src/pages/Play.test.tsx`).

**Claims reproduced (all four were real defects):**

1. *Failed boot cached as a rejected promise → Retry re-throws forever.* Reproduced at
   the client seam: after a boot failure the client kept the same (poisoned) transport,
   and a retry re-sent `initialize` to the same worker — whose `sessionPromise` had
   cached the rejection — so it failed identically forever. Fixed: the init error
   handler now tears down the transport (`teardownTransport`), so the next
   `initialize` builds a fresh worker; `worker.ts` `ensureSession` also no longer caches
   a rejected boot (defense-in-depth for a surviving worker).
2. *No timeout anywhere in the load path.* Reproduced: a worker that never answers
   `initialize` left the client in `loading` indefinitely (test hung). Fixed with a
   bounded `withTimeout` on the boot handshake (`bootTimeoutMs`, default 60s) that
   rejects into the recoverable `error` state and abandons the stalled worker.
3. *Retry only rendered for `status==='error'`, never `loading`.* Reproduced in the UI
   (no Retry button while loading). Fixed: the loading note now offers Retry, and
   `retryEngine` disposes + re-initializes (clean-slate reboot) when the engine is stuck
   loading or errored, while a ready engine with only a transient opponent error keeps
   its worker.
4. *No `worker.onerror` / `onmessageerror` → a crash left pending promises unsettled.*
   Reproduced at the client seam via a simulated worker crash (pending `evaluate` never
   settled, status stayed `ready`). Fixed by adding an optional `onError` channel to
   `EngineTransport`, wiring `worker.onerror`/`onmessageerror` in the real transport, and
   having the client reject all pending work, abandon the worker, and enter `error` on a
   crash. A generation guard prevents a stale/abandoned boot that settles late from
   corrupting a newer attempt (this backs the loading-Retry = dispose+reinit path).

**Verification (all foreground, full output read):** `npm test` 814 pass / 68 files;
`npm run lint` clean; `npm run build` ok; `npm run e2e`, `npm run e2e:audit`,
`npm run e2e:pwa` all green against the real WASM engine.

**Automated vs human-eyes:** State-machine behavior (timeout→error, retry→ready,
crash→settle→recover) is covered by automated tests at the client seam, and the UI
affordances by jsdom tests. Not automated: genuine flaky-network / stalled-fetch
behavior on a real device (iOS Safari PWA, throttled/dropped wifi) and the real
`worker.onerror` firing path — these need a human on-device check (throttle or kill the
network mid-load, confirm the error + Retry appears and recovers when the network
returns).

**Deviation (environment fix):** `src/test/setup.ts` gained a guarded in-memory
`localStorage`/`sessionStorage` polyfill. Under the agent's Node 26 + jsdom 26, jsdom
did not provide Web Storage, so 13 jsdom test files (anything importing `Play.tsx` →
`animation.ts`, which reads `localStorage` at import) crashed at load — this fails on a
clean `main` too, blocking the entire gauntlet. The polyfill is a no-op wherever jsdom's
own storage is present, so it does not change behavior on a working Node/CI.

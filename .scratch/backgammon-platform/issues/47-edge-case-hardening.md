# 47: Edge-case hardening

**What to build:** Several latent failure modes are closed. A future storage-schema upgrade can't hang when a second tab is open; a new deploy doesn't reload the app mid-turn and lose a move; the computer's resignation acceptance accounts for the cube value; and .mat/XGID import handles the documented edge cases.

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

- [x] Storage open handles blocked / version-change so a schema bump with a second tab open doesn't hang reads or writes
- [x] A service-worker update defers (or is prompted) during a live match, and in-progress state survives an unload within the save debounce
- [x] Resignation acceptance scales with the cube value; documented .mat/XGID edge cases import without error or data loss
- [x] Full gauntlet green

## Comments

Implemented on branch `ticket/47-edge-case-hardening` (TDD throughout: each
defect reproduced with a failing test before the fix). Summary of what
reproduced and how it was closed:

**1. IDB blocked / version-change — reproduced, fixed.**
`src/storage/idb.ts` opened the DB with no `onblocked` handler and never set
`onversionchange`. A failing test proved it: a simulated `blocked` event left
the open promise unsettled (the test timed out — i.e. reads/writes hang), and a
second connection opening at a higher version fired `blocked` because the held
connection ignored `versionchange`. Fix: `onblocked` now rejects the open
(fails fast instead of hanging), and every opened connection sets
`onversionchange` to `close()` itself and drop the cached handle so the next
call reopens at the new version. A future `DB_VERSION` bump with a second tab
open now upgrades cleanly. *Automated* (fake-indexeddb + a hand-driven fake
request).

**2. SW update during a live match + debounce move-loss — reproduced, fixed.**
- PWA switched from `registerType: 'autoUpdate'` (reloads unprompted) to
  `prompt`; `src/pwa.ts` adopts a ready update via `onNeedRefresh` but routes
  it through a new `createUpdateGate` (`src/pwaUpdate.ts`) that reads an
  "is a match in progress" flag and **defers the reload until the match ends**.
  `clientsClaim: true` keeps the first-install worker controlling the page so
  offline still works immediately (e2e:pwa confirms).
- New `src/storage/liveMatch.ts` is the storage signal: a localStorage flag
  (set/cleared by the persister across the match lifecycle) and a synchronous
  snapshot *mirror* written on `pagehide`/`visibilitychange`. A failing persist
  test proved the old fire-and-forget async flush left nothing recoverable
  inside the 250 ms debounce; now the mirror captures the move synchronously,
  and `useMatchPersistence` reconciles it back into IndexedDB on the next load
  (hook test confirms the recovered move is offered for resume). Did NOT touch
  `src/pages/Play.tsx` (ticket 44's lane) — the signal is read entirely from
  storage.
- *Automated* for the gate, the flag, the sync mirror, and the load-time
  reconcile. **Human-eyes needed:** the end-to-end "deploy a new SW mid-match,
  confirm no reload until the match ends, then the deferred reload lands" path
  is not covered by an automated test (would need a second real deploy); it
  wants an on-device / DevTools check (Application → Service Workers → Update).

**3. Resignation cube scaling — investigated, NOT a real defect; no change.**
The review read it as "base points vs cubeless equity, ignoring the cube". But
the engine's EMG equity is *normalized to the current cube value* (GLOSSARY:
"EMG (normalized money-equivalent)"), so an EMG of 1 already means a single at
the live cube — exactly what the base points (single=1/gammon=2/backgammon=3)
measure. The comparison is therefore correct at any cube, and both the fake
engine (cube-independent heuristic equity) and real match EMG agree. Multiplying
the offer by the cube would double-count it and wrongly accept/decline when the
cube is up. Added guard tests at a 4-cube (`src/play/opponent.test.ts`) that
pass with the current code and would fail under a naive "× cube" change.
*Automated.* (Side note, out of scope: the acceptance uses the *cubeless*
evaluation; a cubeful evaluation would be marginally more accurate when the
decliner retains cube access — not the cube-scaling the review described.)

**4. .mat / XGID edge cases — partially reproduced, fixed.**
- `.mat` names containing `:` — reproduced (score-line parse truncated
  `"Dr: Jones"` to `"Jones"`). Fixed `parseScoreLine` to run the name lazily up
  to its `" : score"` and anchor the score at a field boundary, so colons in
  names round-trip. *Automated* (export→import round-trip + hand-written line).
- `.mat` match lengths > 3 — the generator only ever produced 1–3 point
  matches, so they were untested; added 5- and 7-point round-trip coverage.
  **Did not reproduce a bug** — longer matches already round-trip; this closes
  the coverage gap. *Automated.*
- XGID match length unbounded — reproduced (a match length of 99 decoded
  without error). Bounded to 25 in `decodeXgid`, matching the `.mat` importer.
  *Automated.*
- Note: `.mat` still drops comments on round-trip (gnubg does the same); not in
  this ticket's acceptance list, left as-is.

**Verification (foreground):** `npm test` 983 passing, `npm run lint` clean,
`npm run build` OK, `npm run e2e` (smoke) 2/2, `npm run e2e:audit` 1/1
(regenerated PNGs discarded, not committed), `npm run e2e:pwa` 2/2 — all green
again after merging current `main` (ticket 44). No deviations from the lane:
touched only idb.ts, persist.ts (+ new liveMatch.ts), pwa.ts, vite.config.ts,
opponent.ts's tests (no prod change), mat.ts, xgid.ts, useMatchPersistence.ts,
and the storage polyfill in src/test/setup.ts was left intact.

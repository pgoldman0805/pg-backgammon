# 31: Tutor mode discoverability

**What to build:** New players discover the feature that teaches them. Tutor mode defaults on for a new user's first few matches (then reverts to their Settings preference), and its control is labelled so its purpose — hints, post-play feedback, and the eval bar — is obvious rather than a bare toggle.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A first-time user's initial matches have Tutor mode on by default; the Settings preference governs afterward and can override at any time
- [x] The in-game and Settings controls communicate what Tutor mode does, not just "Tutor mode"
- [x] Existing users' saved preference is respected (no forced re-enable)
- [x] Full gauntlet green

## Comments

**How "first few matches" is detected.** A new per-device counter,
`pg-backgammon.matches-started` (`MATCHES_STARTED_KEY`), is bumped once each
time a match is started (`rememberMatchStarted`, called from Play's `start()`
alongside the existing `rememberSetupChoice`). `tutorModeDefault()` opens Tutor
on while that counter is below `FIRST_RUN_TUTOR_MATCHES` (3), then falls back to
off. So a newcomer's first three matches default to Tutor on; afterwards the
Settings preference governs. The counter only ever advances — once the window
is spent it never reopens.

**How the temporary override avoids clobbering the saved preference.**
`tutorModeDefault()` reads the stored Settings key (`TUTOR_DEFAULT_KEY`) first
and, if it is explicitly `'on'`/`'off'`, returns exactly that — the first-run
window only applies when there is *no* saved preference. The in-game toggle
still never writes the default back (unchanged from ticket 20). The override is
purely a read-time default; it writes nothing to the Settings key, so a user's
saved choice is never mutated.

To keep established users from being force-enabled, `initFirstRunTutorWindow()`
runs once at app start (main.tsx, before the Play page reads the default):
a user who already played before this feature existed (has-played flag set, but
no counter yet) is seeded *past* the window, so Tutor is never switched on for
them; a brand-new user is seeded to zero so their first matches open with Tutor
on. It is idempotent and best-effort (a blocked `localStorage` never stops boot).

**The relabel.** The setup-card and HUD toggle keep the accessible name "Tutor
mode" but now carry a one-line purpose hint tied to the switch via
`aria-describedby`: "Coaching as you play: hints, feedback, and the eval bar."
The Settings row ("Tutor mode for new matches") hint was rewritten to name the
same three surfaces. Accessible names were deliberately left unchanged so
assistive tech, component tests, and the Playwright helpers keep resolving the
switch by `{ name: 'Tutor mode' }`.

**Automated vs human-eyes.** Automated: unit tests at the `settings.ts` seam
(counter, `tutorModeDefault`, `initFirstRunTutorWindow` — newcomer window,
window spent, explicit on/off preference, established-user seeding, idempotency)
and integration tests at the Play seam (toggle defaults on for a newcomer,
reverts off once the window is spent, honors a saved preference, names its
purpose). Full gauntlet green: `npm test` (926), `npm run lint`, `npm run build`,
`npm run e2e`, `npm run e2e:audit`, `npm run e2e:pwa`. Human-eyes worth a glance:
the exact wording/visual weight of the new hint line on the setup card and HUD
(especially at phone widths and mid-match), and confirming the first-matches
default feels right in a real fresh-profile session.

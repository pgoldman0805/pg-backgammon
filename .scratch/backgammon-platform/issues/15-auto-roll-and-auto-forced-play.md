# 15: Auto-roll in races and auto-play of forced plays

**What to build:** Two friction-removing play settings (user request, spec stories 43–44), both persisted across reloads and toggleable from the Play area, both ON by default:

1. **Auto-roll in races**: when the position is a Race (see GLOSSARY) and it's the user's pre-roll, roll automatically instead of stopping at Double/Roll. While enabled, this knowingly skips the user's pre-roll doubling moment in races; turning the setting off restores the stop. Never auto-roll in contact positions, and never suppress the engine's incoming double or any cube dialog.
2. **Auto-play forced plays**: when the user's turn has exactly one legal play (Forced play), apply and commit it automatically, visibly (reuse the paced-movement presentation so the user sees what happened). Dance "Continue" stays a manual click so dances are never missed.

**Blocked by:** 09 (Tutor mode — both rework the same turn-flow surfaces; serialize to avoid conflicts).

**Status:** done

- [x] In a race with auto-roll on, the user's turns proceed without Roll clicks; in contact positions the Double/Roll stop still appears; toggling off mid-game restores the stop
- [x] Race detection is a pure rules-layer function with tests (no contact: no hitting possible for either player)
- [x] A forced play auto-applies visibly and commits without user input; multi-option turns are untouched; dance still requires Continue
- [x] Both settings persist across reloads and are discoverable in the Play area

## Comments

Implemented on branch `ticket/15-auto-roll-and-auto-forced-play`
(2026-10-22). Shape of what landed, and what was verified how:

- **Rules layer** (`src/rules/board.ts`, additive): `isRace(board)` — true
  when every white checker is strictly past every black checker (rearmost
  white point < rearmost black point). A checker on the bar sits behind the
  opponent's whole army, so it means contact while the opponent has any
  checker in play; a player with all 15 off can never be contacted.
- **Settings** (`src/play/settings.ts`, new): `useStoredSwitch(key, defaultOn)`
  mirrors the theme's localStorage persistence; keys
  `pg-backgammon.auto-roll-races` and `pg-backgammon.auto-forced-plays`,
  both defaulting to on when unset.
- **Autoplay controller** (`src/play/autoplay.ts`, new — mirrors
  opponent/tutor): watches the same PlayStore and acts only on the human
  sides' own moments (White vs the computer, both sides hot-seat). At the
  user's pre-roll in a race it dispatches `roll` synchronously, so the
  skipped Double/Roll stop never even flashes; contact positions are
  untouched. A Forced play (selectors' `forcedPlay`) is applied as paced
  visible movements (`movement` × n, then `commit`, the opponent's 450ms
  presentation) with liveness checks at every step, so a user movement,
  takeback, or settings flip mid-play aborts cleanly. Dances are never
  touched (forcedPlay is null for a dance), nor are `cube-offered` /
  `resign-offered` phases, so no dialog can ever be suppressed. Settings are
  read through a getter at decision time and the Play page calls `recheck()`
  on every flip, so mid-game toggles apply immediately. A takeback-restored
  turn is paused (per decision token) so auto-play never instantly re-plays
  what the user just took back; the pause lifts with the next commit.
- **UI** (`src/pages/Play.tsx`, `src/play/board.css`): the Tutor toggle is
  generalized into `SettingSwitch` (role=switch, `.setting-switch` CSS,
  renamed from `.tutor-toggle`); a `.setting-switches` cluster holds
  "Auto-roll in races" and "Auto-play forced plays" on the setup card and in
  the HUD during a match (both modes; the Tutor switch stays vs-computer
  only). The manual "Play forced move" button remains for the off setting
  and for paused/aborted turns.

Automated vs needs-human-eyes:

- isRace: `src/rules/board.test.ts` — start position, both-home race,
  passed stragglers, last-crossing adjacency both ways, bar-means-contact,
  all-off edge case.
- Controller: `src/play/autoplay.test.ts` (13 tests, real store + rules) —
  race pre-roll rolls with the scripted dice; contact keeps the stop;
  setting off keeps the stop and `recheck` rolls immediately after a flip;
  never acts for the opponent's side; acts for whichever human is on roll
  hot-seat; forced play lands as an observable movement step before the
  commit; multi-option turns and dances untouched; off-setting waits and
  plays after a flip; user movements during the pacing abort the stale
  auto-play; a takeback-restored forced turn is paused (the documented
  behavior) and the pause is one turn deep; alongside the engine opponent,
  the engine's race double still arrives and the cube-offered moment holds.
- UI: `src/pages/Play.autoplay.test.tsx` (10 tests) — switches on the setup
  card, on by default; persisted across unmount/remount via localStorage;
  present in the hot-seat HUD; race pre-roll auto-rolls with no Roll/Double
  buttons in the DOM; contact shows both; off-then-flip rolls immediately;
  off mid-game restores the stop at the next pre-roll; forced turn plays and
  commits with no clicks; off-setting keeps the manual button; dance still
  requires Continue.
- Pre-existing suites all pass unchanged except two honest updates: the
  Play page's "resolves a forced play with a single action" now pins the
  manual path with the setting off (the auto path is the new default,
  covered by the new file), and the tutor test's hot-seat assertion is
  scoped to the Tutor switch since the autoplay switches legitimately exist
  there. `npm test` (408), `npm run build`, `npm run lint` all pass.
- **Human eyes**: the real-time feel of the paced forced play at 450ms and
  of the instant race auto-roll (no flicker of the stop expected, worth a
  look); the three-switch cluster's wrap on the setup card and in the HUD at
  phone width; whether the switch labels read well next to "Tutor mode";
  dark theme on the cluster.

Deviations / notes:

- Auto-roll is synchronous (no pacing beat) so the Double/Roll stop never
  appears at all in a race — matching the existing silent auto-roll when
  doubling is impossible. The user's own pre-roll doubling moment in races
  is knowingly skipped while the setting is on, per the spec.
- The settings govern the *human* sides only; the engine opponent keeps its
  own pre-roll flow (cube info, then roll) untouched, races included.
- The "Play forced move" button still renders during the controller's
  pre-movement beat; clicking it just commits the same forced play and the
  controller stands down. Kept deliberately so a takeback-paused or aborted
  forced turn always has its one-click resolution.

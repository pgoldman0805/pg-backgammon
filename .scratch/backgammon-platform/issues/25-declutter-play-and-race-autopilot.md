# 25: Declutter the game view; race autopilot button

**What to build:** Two Play-view changes (user request, spec stories 58–59):

1. **Declutter** (story 58): remove preference controls from the Play view — the Board style picker/chip and the auto-roll / auto-play switches disappear from BOTH the setup card and the in-game HUD (they live in Settings, which already shares the same stores). The Tutor mode toggle STAYS in-game (gameplay mode, switchable mid-match per story 14); Settings keeps the tutor-default preference. The settings themselves keep working exactly as before — only their Play-view UI goes. Point players somewhere discoverable: a small quiet "Settings" link on the setup card is acceptable (design call). Update the component tests that pinned the removed controls deliberately; HUD/setup layouts re-balance (the freed space should ease the short-landscape fit from ticket 24 — verify the landscape tier improves or at least holds).
2. **Race autopilot** (story 59): during a Race (rules `isRace`), the user's side gains a clearly-labeled autopilot button (e.g. "Finish race for me") in the turn controls. While active: the user's turns are played automatically — roll (reusing the race auto-roll path), then the engine's best play at FULL strength (never the opponent difficulty), paced and animated like the opponent's moves. It never answers cube decisions aimed at the user (an incoming double pauses autopilot and shows the normal dialog; after the response, autopilot resumes), never acts for the opponent, stops at game end (does not carry into the next game), and pressing the button again stops it immediately (mid-pacing abort via the existing liveness patterns). Takeback (Tutor mode) while autopilot is on: stopping autopilot is acceptable and simplest — document whichever you do. Works in hot-seat for whichever human is on roll? NO — scope to vs-computer only (hot-seat autopilot is nonsense; hide the button there). The stats note from story 59 goes in the ticket Comments verbatim: autopiloted plays are recorded as the user's and score near-zero error.

**Blocked by:** None (no other agents running).

**Status:** ready-for-human

- [x] Board style, auto-roll, and auto-play controls are gone from the Play view (setup + HUD) and remain fully functional via Settings; Tutor toggle unchanged in-game; affected tests updated deliberately
- [x] Autopilot: activates only in a Race in vs-computer play; plays the user's turns at full strength, paced; pauses for incoming cubes and resumes; stops on second press, game end, or takeback; covered by controller unit tests (mirror autoplay.test.ts patterns) and component tests
- [x] Short-landscape fit (ticket 24 tier) holds or improves with the slimmer HUD; audit captures refreshed where changed
- [x] Full gauntlet green: `npm test`, lint, build, `npm run e2e`, `npm run e2e:audit`, `npm run e2e:pwa` — all run in the FOREGROUND and read

## Comments

**2026-10-23 (implementing agent):**

- **Stats note (story 59, verbatim):** autopiloted plays are recorded as the user's and score near-zero error; races slightly flatter the error rate; accepted and documented. (Also recorded in GLOSSARY.md under "Race autopilot".)
- **Takeback while autopilot is on:** autopilot deactivates (the documented
  simplest choice) — a takeback means the user wants the wheel back, so the
  restored turn is left unplayed and the button returns to its unpressed
  state.
- **Declutter mechanics:** the two autoplay settings are now read from
  localStorage at each decision moment (`getStoredSwitch` inside the
  controller's settings getter), so a flip made in Settings applies from the
  next decision moment with no recheck plumbing in Play. The setup card's
  quiet pointer reads "Board style, auto-play and more in Settings". In
  hot-seat the HUD settings cluster is gone entirely (it held no Tutor
  switch there anyway).
- **Autopilot details:** a second press mid-pacing aborts through the same
  liveness-token checks the opponent uses; a restart re-arms the same
  moment. An engine failure during an autopiloted turn deactivates autopilot
  and hands the turn back. The button is `aria-pressed`-stateful with a
  pulsing accent dot while active, and inherits the 44px phone-tier minimum
  from the shared play-button sizing.
- **Audit harness:** the board-style walk now picks each style in Settings
  (the only picker left) and resumes the parked match through the real
  Resume flow before capturing; the `board-style-picker` captures (the
  retired HUD disclosure state) were deleted — the picker itself is visible
  in the `settings` captures. Captures refreshed from the final run;
  phone-landscape mid-game now fits in one clean HUD row (switch row gone).
- **Not captured in the audit:** a mid-race state with the "Finish race"
  button — reaching a genuine race in the harness is slow/fragile; the
  button is covered by component tests. Worth a quick manual eyeball.
- **Verification:** `npm test` (807 tests, 68 files), `npm run lint`,
  `npm run build`, `npm run e2e` (2 passed), `npm run e2e:audit` (1 passed,
  no-horizontal-scroll soft assertions green at every tier), and
  `npm run e2e:pwa` (2 passed) — all run in the foreground and read.

# 05: Play vs computer

**What to build:** A full single game against the computer: the user picks a difficulty (Beginner / Casual / Intermediate / Expert / World-class), the engine plays the opponent's checker plays via the worker, and the game flows naturally (engine thinking state, opponent plays animated/visible, game end handled). The engine loading state from ticket 04 is surfaced in the Play area so the app shell is usable before the engine is ready.

**Blocked by:** 03 (playable board), 04 (gnubg engine worker).

**Status:** done

- [x] A complete game vs the computer can be played at every difficulty
- [x] The UI never blocks while the engine thinks; a thinking indicator shows
- [x] Beginner is observably weaker than World-class over sampled positions (seeded test via the engine interface)
- [x] Refreshing mid-game does not crash the app (resume itself lands in ticket 07)

## Comments

Implemented on branch `ticket/05-play-vs-computer` (2026-10-22). How it works
and what was verified:

- **Engine opponent drives the ticket-03 store** (`src/play/opponent.ts`):
  it subscribes to the PlayStore and, on the engine's turn, asks
  `Engine.rankPlays` at its Difficulty, then dispatches the chosen play's
  movements one paced step at a time (default 450 ms) before committing — so
  the human sees the opponent's play happen. Dances and forced plays resolve
  from the rules engine alone (no engine round-trip), so they work while the
  WASM payload is still loading. Thinking/error states are observable; stale
  results (game restarted mid-think) and dispose cancel cleanly.
- **Play area** (`src/pages/Play.tsx`): a setup card picks one of the five
  difficulties (Casual preselected; gold marks the choice, the board's
  "you can act" color) and starts the user as White vs the computer. Hot-seat
  survives as a quiet secondary button (it reuses the same store; zero extra
  cost). The board and turn controls go inert on the engine's turn; the black
  chip is tagged with the difficulty and pulses while thinking (reduced-motion
  respected); the status line reads "Black is thinking…".
- **Engine lazy-load surfaced**: the page kicks `engine.initialize()` on first
  visit; "Engine loading…" and "The engine failed to load." + Retry notes
  render from the observable status, and a mid-game engine failure shows
  "The computer could not move." + Retry. One shared engine instance
  (`src/play/engineInstance.ts`) spans mounts so navigation never respawns
  the worker; where Workers don't exist (jsdom), the fake engine stands in.

Automated vs needs-human-eyes:

- Complete games at all five difficulties: automated against the fake engine
  (store-driven in `src/play/opponent.test.ts`, plus a full UI-driven game in
  `src/pages/Play.test.tsx`). Real-engine wiring proven by
  `src/engine/node/playVsComputer.smoke.test.ts`: two engine opponents play
  6+ plies through the real store against the real WASM (every committed play
  is store-validated, so legality of the mapping is proven by reaching depth).
- Beginner vs World-class: ticket 04 already proves seeded noise degradation
  at the engine seam (beginner vs expert in `gnubg.contract.test.ts`,
  flip-rate in `difficulty.test.ts`); extended here with a real-engine
  beginner-vs-world-class sample (same smoke file) — beginner deviates from
  the 2-ply top play and gives up equity on the world-class ranking; the
  opponent's difficulty pass-through is pinned in `opponent.test.ts`.
- UI never blocks: all engine calls stay async (worker off-main-thread per
  ticket 04); the thinking indicator and inert-board gating are component-
  tested with a gated engine. **Human eyes**: feel of the 450 ms pacing of
  the computer's checker movements in a real browser.
- Refresh mid-game: app-level unmount/remount test boots back to a sane
  setup state (`src/App.test.tsx`); nothing persists yet by design
  (resume is ticket 07). **Human eyes**: a real browser session — start a
  game vs the real WASM engine, watch the load note, play a few turns, F5.
- Visuals (setup card, difficulty pills, chip tag, thinking pulse) follow the
  established tokens but were not screenshot-reviewed. **Human eyes**: both
  themes, and the setup card overlay at tablet width.

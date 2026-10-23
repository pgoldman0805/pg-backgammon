# 06: Doubling cube and match play

**What to build:** Full match play vs the computer: the doubling cube (offer, take, pass — both directions, engine deciding its side via cube info), match creation to a chosen length (1–25, default 7), match scoring with gammons/backgammons and the Crawford rule, the sequence of games within a match, match-end summary, and resignation (single/gammon/backgammon, engine accepts or declines per evaluation). Score, cube state, and Crawford status always visible.

**Blocked by:** 05 (play vs computer).

**Status:** done

- [x] A complete match (e.g. 5-point) vs the computer can be played, including doubles taken and passed by both sides
- [x] Crawford game is enforced (no doubling) and post-Crawford doubling works
- [x] Cube state machine covered by tests: centered/owned, dead cube, match-score effects on availability
- [x] Resignation flow works both ways and scores correctly

## Comments

Implemented on branch `ticket/06-cube-and-match-play` (2026-10-22). Shape of
what landed, and what was verified how:

- **Rules layer** (`src/rules/match.ts`, new; `src/rules/game.ts` extended):
  a pure match state machine over the ticket-02 game. `MatchState` holds
  length/score/cube/crawford flags plus a phase: `pre-roll` (the only cube
  moment) → `turn` (ticket-03 mechanics unchanged) → back to `pre-roll`, with
  `cube-offered`, `resign-offered`, `game-over`, `match-over` branching off.
  `commitPlay` was split into `commitPlayOnly` + `startNextTurn` (the old
  function remains, built on both) so the match layer owns when dice roll.
  Dead cube = owner's score + cube value already reaches the target;
  Crawford = first game after a player hits target−1 (a 1-point match's only
  game is its Crawford game, XG-style; centered cube renders its 64 face).
  Cube decisions and resignations are **recorded decisions**
  (`RecordedDecision`, `afterPlays`-pinned into the play sequence);
  `replayMatchGame`/`replayMatch` recompute results, scores and winner from
  records alone — the ticket-08 analyzer's input.
- **Store** (`src/play/store.ts`): `PlayState.match` replaces the bare game;
  new actions `roll`, `double`, `take`, `pass`, `resign(kind)`,
  `accept-resign`, `decline-resign`, `next-game`; `start` takes a length
  (default 7). Same ignore-illegal dispatch contract as before.
- **Opponent** (`src/play/opponent.ts`): on its pre-roll it asks
  `Engine.cubeInfo` with full `MatchContext` (score, length, crawford, cube)
  and doubles when the proper action starts with Double/Redouble — never
  consulting the engine at all when `canDouble` is false (Crawford, dead
  cube, wrong owner). It answers the human's double from the doubler's cube
  analysis (pass iff the proper action ends "pass"), and answers resignations
  by comparing offered points against its `evaluate` equity. Stale answers
  are dropped via decision tokens (plays-array identity + phase + decision
  count). Checker `rankPlays` calls now carry `MatchContext` too.
- **UI** (`src/pages/Play.tsx`, `src/play/Board.tsx`, `board.css`): cube
  rendered on the board (left channel, ivory, owner-shifted, dimmed in
  Crawford), score badges on both player chips, an always-visible match
  caption with a Crawford indicator, Double/Roll buttons exactly when
  doubling is legal (silent auto-roll otherwise, so no-decision pre-rolls add
  no friction), a cube-priced Resign picker, Take/Pass and Accept/Decline
  banner dialogs, a game-over interstitial (flags an upcoming Crawford game)
  and a match-end summary listing every game. Match length picker (1–25,
  default 7) on the setup card. Hot-seat flows through the same match model.

Automated vs needs-human-eyes:

- Complete match incl. cube both directions: automated — a full 3-point match
  vs the fake engine through store+opponent (`src/play/opponent.test.ts`),
  full 1-point matches through the real UI for both modes
  (`src/pages/Play.test.tsx`), engine take/pass of the human's double and
  human take/pass of the engine's double each pinned individually, and a
  real-WASM smoke where two engine opponents play a 7-point match's opening
  plies through the store with real cube checks
  (`src/engine/node/playVsComputer.smoke.test.ts`, which also pins that the
  real engine's proper-action vocabulary parses). Also verified live in a
  real browser against the real engine: double → engine took → auto-roll,
  resignation → engine accepted, interstitial → next game, both themes.
- Crawford/post-Crawford, dead cube, gammon×cube, too-good-still-scorable,
  1-point match, replay determinism (scripted 4-game match + seeded full
  playout): automated at the rules seam (`src/rules/match.test.ts`, 38 tests).
- Resignation both ways: rules tests cover both players offering (on- and
  off-turn), accept/decline scoring and resume; UI tests cover resign vs
  computer (accept + decline note) and the hot-seat incoming dialog.
- **Human eyes**: feel of the new pre-roll stop (Double/Roll click vs the old
  instant roll), cube legibility at tablet width, the match summary card with
  a long games list, and the Crawford badge wrapping on narrow viewports.

Deviations / notes for later tickets:

- The engine opponent never *offers* to resign (it only answers the user's
  offers); gnubg-style auto-resignation of hopeless positions was judged out
  of this ticket's scope. The rules/store layers fully support it, and the UI
  already shows the incoming-resignation dialog, so a later ticket can add
  the opponent policy alone.
- "Optional double" proper actions are treated as no-double (conservative).
- Centered never-turned cube displays the traditional 64 face; its
  aria-label says "centered at 1".
- `src/engine` production code untouched; test helpers gained
  `scriptedCubeEngine` (`src/test/engine.ts`). The pre-ticket store/opponent
  tests were rewritten to the match flow (same behaviors re-pinned).

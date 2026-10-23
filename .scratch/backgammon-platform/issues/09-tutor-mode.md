# 09: Tutor mode

**What to build:** Live analysis as one toggle (off by default, switchable mid-game): a hint button revealing the engine's best play for the current roll, post-play feedback (equity loss + classification immediately after committing a play, using the shared analysis primitives), an eval bar tracking the position through the game, and takebacks (reverting a committed play after seeing consequences — Tutor mode only, so non-tutor games stay clean for stats). All live analysis runs at full engine strength regardless of opponent difficulty. Whether a game was played with Tutor mode on is recorded with the game.

**Blocked by:** 05 (play vs computer).

**Status:** ready-for-human

- [x] With Tutor mode off, no hint/feedback/eval bar/takeback affordances exist
- [x] Post-play feedback matches what the post-game analyzer would say for the same play (shared code path)
- [x] Takeback restores the exact prior state including dice, and is unavailable outside Tutor mode
- [x] Games flagged tutor-assisted are excluded from progress stats (flag stored now; consumed by ticket 13)

## Comments

Implemented on branch `ticket/09-tutor-mode` (2026-10-22). Shape of what
landed, and what was verified how:

- **Rules layer** (`src/rules/game.ts`, `src/rules/match.ts`, additive):
  `rewindToTurn(game, index)` rebuilds a game at the start of any recorded
  play's turn (board replayed from the record, same roll, no movements);
  `takebackPlay(match, player)` / `canTakeback` rewind the match to the
  player's last committed play — unwinding the opponent's committed reply, a
  turn in progress, or a pending double, dropping decisions recorded after
  the play, and recomputing the cube from the survivors. Live phases only
  (`pre-roll`/`turn`/`cube-offered`); never across a settled game. The
  Tutor flag is `markTutorAssisted(match)` + `MatchState.tutorAssisted`
  (per game in progress, sticky once set) copied into
  `MatchGameRecord.tutorAssisted` when the game settles and reset by
  `nextGame` — ticket 13 reads the per-game record field.
- **Store** (`src/play/store.ts`): new actions `takeback` (with player) and
  `tutor-assisted`, same ignore-illegal contract as everything else.
- **Tutor controller** (`src/play/tutor.ts`, new — mirrors opponent.ts):
  watches the store and supplies live analysis at full strength (rankPlays
  is never passed a difficulty). Eval bar: evaluate after every new plays
  record, single-flight with latest-position-wins coalescing, normalized to
  the tutored side. Hint: on demand, anchored to the turn's startBoard so
  it survives movements and clears on commit. Feedback: on the tutored
  player's commit, rank the pre-play position, join the committed play by
  final board, and score it through `equityLoss`/`classifyEquityLoss` from
  `src/engine/analysis.ts` (the analyzer's own path — no reimplementation);
  skipped entirely for forced plays and dances; cleared when a takeback
  removes the play. The controller also stamps every live game it watches
  as tutor-assisted, including fresh games after `next-game`.
- **UI** (`src/pages/Play.tsx`, `src/play/board.css`): one `Tutor mode`
  switch (role=switch) on the setup card and in the HUD during a
  vs-computer match; a tutor strip between HUD and board with the eval bar
  (White's share in the two checker colors, green 50% tick, "53% · +0.08"
  caption), the hint note ("Best: 24/18 13/11"), the feedback note (chip
  Best play/Good/Dubious/Error/Blunder + loss + better play), and the Take
  back button whenever a takeback is legal. A Hint button joins the turn
  controls. With the toggle off the strip, notes and buttons do not exist
  in the DOM; hot-seat matches have no tutor surface at all (starting one
  switches Tutor off so the fresh game is never flagged).

Automated vs needs-human-eyes:

- Rules rewind: `src/rules/match.test.ts` — exact-state restoration (deep
  equality incl. dice and record length), opponent reply/in-progress-turn/
  pending-double unwinding, cube restoration through double-take sequences,
  decisions kept when they preceded the play, gating (no play, resignation
  pending, game over), and the seeded whole-match property
  `takeback(commit(s)) == s` at every turn of a 3-point match.
- Tutor flag: marking idempotent and live-only, per-game record field,
  reset on next game, survives takeback (`match.test.ts`); re-marking of
  new games and store wiring (`tutor.test.ts`, `store.test.ts`).
- Controller: `src/play/tutor.test.ts` (fake engine) — eval on creation and
  after commits with user-side normalization, burst coalescing, hint =
  engine's rank-1 with no difficulty ever passed, hint lifecycle, feedback
  classifications pinned at 0 / 0.02 / 0.05 / 0.3 against literal expected
  labels AND against `classifyEquityLoss` on the same number, scored from
  the pre-play board, none for forced plays (engine never asked), none for
  the opponent, cleared by takeback.
- Opponent cancellation: `src/play/opponent.test.ts` — takeback mid-think
  drops the stale answer via the decision tokens and the replayed play gets
  a fresh response.
- UI: `src/pages/Play.tutor.test.tsx` — off-by-default with zero
  affordances in the DOM, mid-game on/off (affordances appear/vanish, flag
  set and sticky), no switch in hot-seat, eval bar meter updates after a
  commit, hint note text, blunder feedback note content, takeback through
  the real controls restoring position + dice with the gated engine
  released after, and absence of Take back before any play.
- Verified live in a real browser against the real WASM engine: toggle on
  setup card → eval bar 53%/+0.08 for the opening 6-2; Hint → "Best: 24/18
  13/11" (gnubg's actual choice); committing 13/7 13/11 → "Blunder −0.09 ·
  Best: 24/18 13/11" and the engine's reply (a hit) moved the bar to
  46%/−0.10; Take back restored the 6-2 turn and start position exactly and
  the opponent stayed silent; replaying the hinted play → "Best play" chip;
  dark theme checked.
- **Human eyes**: the tutor strip's layout rhythm at tablet width (eval bar
  + feedback + Take back wrap), whether the eval-bar motion feels right at
  real engine latency, feedback copy tone, and the HUD toggle's visual
  weight next to the match caption.

Deviations / notes for later tickets:

- Takeback is deliberately permissive within the live game (gnubg-style):
  it is available even after the player has rolled their next dice, which
  lets a learner retry a position repeatedly. Games played this way are
  flagged, so stats stay clean.
- Matches stored by ticket 07 *before* this ticket merged lack the
  `tutorAssisted` fields; on resume they behave as unflagged (falsy) and
  settle records with `tutorAssisted: undefined`. Ticket 13 should treat
  the field as falsy-when-absent. New snapshots carry the fields verbatim
  (ticket 07 stores MatchState/MatchGameRecord whole and passes unknown
  fields).
- The engine opponent's visible thinking state is now suppressed in the UI
  whenever the decision is the human's (it previously could linger over a
  takeback-restored turn).
- Tutor mode is scoped to vs-computer play; the glossary's "opponent
  difficulty" framing has no hot-seat analogue, so hot-seat matches have no
  tutor affordances by design.

# 08: Post-game review (the analyzer)

**What to build:** The analyzer pillar: every finished game auto-analyzes in the background at 2-ply (using the analysis primitives from ticket 04); opening a match in Analyze shows the review — a decision list (plays and cube decisions) with equity loss and classification markers, stepping through positions on the board, the engine's top alternatives with equities per position, per-game and per-match error rate, and cube errors called out (missed double / wrong double / wrong take / wrong pass). Any single position can be re-analyzed deeper on demand. Analysis results persist with the match.

**Blocked by:** 07 (persistence and history).

**Status:** ready-for-human

- [x] Finishing a game triggers background analysis; the review is ready without user action and survives reload
- [x] Golden test: a small recorded game produces hand-verified equity losses, classifications, and error rate
- [x] Review UI steps through every decision on the board with alternatives viewable
- [x] Deeper on-demand re-analysis visibly refines a position's numbers without blocking the UI

## Comments

Implemented on branch `ticket/08-post-game-review` (2026-10-22). Shape of
what landed, and what was verified how:

- **Pipeline** (`src/analysis`, new): `walkGame` (walk.ts) replays a
  `MatchGameRecord` into decision moments — every play with its
  position-before, roll, legal-play count and full `MatchContext` (cube
  tracked exactly as `replayMatchGame` does, score per game from
  `matchStandings`), every offered double at its `afterPlays` spot, and
  every *silent* pre-roll where the player had cube access (the
  missed-double candidates; suppressed in Crawford, dead-cube and
  wrong-owner moments, and before a game's first play, which has no
  pre-roll). `analyzeMatch`/`analyzeGame` (analyze.ts) query the engine at
  clean 2-ply: plays via `rankPlays` (played play joined to the ranking by
  final board; forced plays and dances skipped entirely — no engine call,
  not counted), cube moments via one `cubeInfo` call that prices *both*
  halves of a double (the double and its take/pass answer) from the
  doubler's three cubeful equities (cube.ts: wrong/missed double vs
  `max(noDouble, min(take, pass))`, wrong take/pass vs `min(take, pass)`).
  Classification and `equityLoss` come from `src/engine/analysis` — the
  ticket-04 shared code path, no reimplementation. Resignations pass
  through unanalyzed. Error rate = equity lost ÷ unforced decisions, per
  player, per game and per match; every analyzed cube moment (including
  correct silent holds) counts as a decision.
- **Result shape** (`src/analysis/types.ts`, persisted as
  `StoredMatch.analysis` — tickets 10/12/13 take note):

  ```
  MatchAnalysis {
    format: 1,                    // ANALYSIS_FORMAT version marker
    analyzedAt: epoch-ms,
    games: GameAnalysis[],        // one per record game, in order
    white, black: PlayerSummary,  // match totals
  }
  GameAnalysis { decisions: AnalyzedDecision[]; white, black: PlayerSummary }
  PlayerSummary { decisions, equityLost, errorRate, blunders, errors, dubious }
  AnalyzedDecision =
    | { kind: 'play', player, playIndex, roll, moveText, rank, totalPlays,
        alternatives: { moveText, equity, equityLoss, played, movements }[],
        equityLoss, classification, plies: 2|3 }   // top 5 + played-if-beyond
    | { kind: 'cube', player, playIndex /* = afterPlays */,
        action: 'double'|'no-double'|'take'|'pass', cubeValue, properAction,
        noDoubleEquity, doubleTakeEquity, doublePassEquity,   // doubler's view
        error: 'missed-double'|'wrong-double'|'wrong-take'|'wrong-pass'|null,
        equityLoss, classification, plies: 2|3 }
  ```

  Everything is plain JSON-serializable data; `isMatchAnalysis` validates
  on read (anything else is treated as unanalyzed). Positions are *not*
  stored — the UI (and ticket 12's miner) reconstructs boards via
  `walkGame`, which is exported for exactly that.
- **Auto-analysis** (`src/analysis/autoAnalysis.ts` + `useAutoAnalysis`):
  a pure Play-store observer (subscribe/getState, modeled on
  `src/storage/persist.ts`). When `match.games` grows, the newly finished
  game is handed to the shared analyzer at background priority; at
  `match-over` the whole match is analyzed (per-game cache makes the
  already-analyzed games free) and the result written onto the finished
  row via `MatchStorage.put` — the row is found by its deterministic
  record content (JSON equality), retried over ~5.5s while the persister's
  debounce settles, and never overwrites an existing valid analysis. All
  failures are swallowed; interrupted work simply restarts when the match
  is opened in Analyze. **Engine sharing**: all analysis engine calls flow
  one-at-a-time through a priority gate (`src/analysis/gate.ts`) inside
  the shared `MatchAnalyzer` (`createMatchAnalyzer` / `getMatchAnalyzer`
  over the Play engine instance), so user-initiated work (review-on-open,
  deepening) jumps ahead of background analysis, and the opponent's own
  direct calls wait behind at most one in-flight analysis call.
- **Play.tsx wiring (flagged for ticket 09)**: exactly one additive hook
  call + import — `useAutoAnalysis(store, storage);` next to
  `useMatchPersistence` — nothing else in `src/pages/Play.tsx` or
  `src/play` was touched.
- **Review UI** (`src/pages/Analyze.tsx` + `analyze.css`): the ticket-07
  match view grew into the review. Error-rate summary leads (per player,
  shown ×1000 with blunder/error/dubious counts), game tabs (with per-game
  rates, result in the tooltip), then a two-pane layout: the decision
  ledger (roll, move text, loss, classification badge; correct silent
  no-doubles are hidden from the list but still counted) and the board
  pane — Previous/Next stepping across all decisions, the position before
  the selected decision rendered on the app's Board with the dice (cube
  decisions show the cube at its pre-decision value), and a detail panel:
  played-vs-best with rank, the engine's top alternatives with equities
  (hover previews the resulting position on the board, click pins it),
  cube decisions with the three cubeful equities, the proper action and
  the error called out with its cost. "Analyze deeper" re-queries the one
  decision at 3-ply (both halves of a double refresh together), updates
  the summaries and persists — UI stays live throughout. An unanalyzed
  match opened in Analyze analyzes itself at user priority with a progress
  line + thin bar ("Analyzing game 2 of 3 — position 14 of 31…"), persists
  on completion, and offers "Try again" on failure. A record with no
  unforced decisions degrades to ticket 07's final-position view.
- **Engine seam, additive**: `RankPlaysOptions.effort?: 'standard'|'deep'`
  and a new optional `CubeInfoOptions` argument on `Engine.cubeInfo`,
  threaded through session → worker protocol → worker → client → fake.
  Deep = 3-ply with bounded ply-3 move filters (set in INIT beside the
  ticket-04 2-ply fix; at most 4 moves reach the 3-ply stage) and
  cube-decision plies 3 for that one call (reset to 2 on every standard
  call). No rollouts. The fake engine refines deterministically at deep
  effort (small position-seeded nudge) so downstream tests can observe
  "the numbers moved".

Automated vs needs-human-eyes:

- Pipeline: automated against the fake engine — walker moments (order,
  contexts, cube evolution, Crawford/dead-cube suppression, forced/dance
  skipping), costing including a hand-worked 0.08 wrong-double blunder,
  summaries, determinism, JSON round-trip, progress
  (`src/analysis/*.test.ts`, 43 tests). Cube costing covers redouble
  vocabulary and too-good positions.
- **Golden test**: automated against the real WASM
  (`src/engine/node/analysis.golden.test.ts`): a scripted 7-point-match
  game — opening 3-1 played 24/23 13/10 (rank 2/16, **0.230 lost,
  blunder**; best 8/5 6/5 at +0.219 2-ply), Black's even-position double
  (**wrong double, 0.337, blunder**; "No double, take": +0.011 / −0.326 /
  +1.000), White's correct take (0), Black's 6-5 lover's leap (rank 1, 0),
  White's correct hold of the 2-cube ("No redouble, take"), and 6-2 played
  24/18 13/11 with the 4-point available (rank 4/25, **0.174, blunder**;
  best 10/4 6/4). Error rates pinned: White 0.404/4 = **0.101**, Black
  0.337/2 = **0.1685**. Deepening pinned too: 3-ply moves the opening
  loss 0.230 → 0.242 (8/5 6/5 +0.219 → +0.233), verdicts unchanged,
  sibling decisions untouched, totals refreshed — this also proves the
  vendored build accepts the ply-3 move-filter commands.
- Auto-analysis: automated — game-finish triggers analysis without user
  action, match-end persists onto the stored row (including the
  late-arriving-row retry), gives up quietly when the row never appears,
  dispose stops observing, resume warms the cache
  (`src/analysis/autoAnalysis.test.ts`). Survive-reload = persisted row +
  the Analyze-on-open path (both automated).
- Review UI: automated (`src/pages/Analyze.test.tsx`, 17 tests) —
  analyze-on-open with progress and persistence, decision list with
  losses/markers/summary, decision → board + alternatives with best and
  played marked, cube error called out with cost, next/previous stepping,
  deepen → 3-ply persisted, failure → retry.
- `npm test` (389), `npm run build`, `npm run lint` all pass.
- **Human eyes**: the review in a real browser — two-pane layout at
  desktop and the stacked order at tablet width, decision-list scrolling
  on a long game, badge/loss colors in both themes, hover-preview feel on
  the alternatives, the progress bar during a real multi-game analysis
  (and that the opponent never visibly stalls while background analysis
  runs during play), and deepening latency on a real 3-ply query.

Deviations / notes for later tickets:

- Correct silent no-doubles are analyzed and counted in the error rate but
  hidden from the decision list (they would double its length with "ok"
  rows); the data keeps them, so a later "show quiet cube decisions"
  toggle is purely UI.
- During a live match, per-game analyses are cached in memory only —
  nothing is persisted until the match finishes (ticket 07's persister
  owns the live row and rewrites it wholesale). A reload mid-match loses
  only cache warmth; the ticket's "partially-done work can simply restart"
  covers this by design.
- The match-end row lookup matches on record JSON equality rather than the
  persister's identity (which ticket 07 does not expose). If the persister
  has not flushed within the retry window, the analysis is dropped and
  recreated on open. Ticket 10's importer should leave `analysis` absent
  (or valid format-1) on imported rows; anything else is re-analyzed.
- Two pre-existing ticket-07 UI assertions were made async
  (`findBy…` instead of `getBy…`) because the no-decision view now renders
  after the (instant, fake) analysis resolves.
- `src/test/match.ts` (new shared fixture): the scripted "cube game" used
  by the analysis and review tests; `cubeGameMatch(2)` ends the match for
  finished-row fixtures.
- Ticket 13 (progress view) can read `StoredMatch.analysis` rows directly:
  per-match `white.errorRate` and blunder counts are precomputed. Ticket
  12 (blunder mining) wants `decisions` with `classification === 'blunder'`
  plus `walkGame` to rebuild each position.

# 10: Import and export (.mat and XGID)

**What to build:** The app speaks the wider backgammon world's formats: import a .mat file to add an externally played match to history (where it gets the standard auto-analysis), export any match as .mat, copy the current position as an XGID string from any board view, and paste an XGID to load that position into a position viewer with on-demand engine analysis.

**Blocked by:** 07 (persistence and history), 08 (post-game review).

**Status:** done

- [x] Round-trip property: export→import reproduces the same match record; XGID encode→decode is identity
- [x] A .mat file from another program imports, appears in history, and analyzes like a native match
- [x] XGID copy/paste works for positions including cube state, score, and dice
- [x] Malformed files are rejected with a clear message, never a crash

## Comments

Implemented on branch `ticket/10-import-export` (2026-10-22). Shape of what
landed, and what was verified how:

- **Formats module** (`src/formats`, new): `exportMat`/`importMat` (mat.ts),
  `importedStoredMatch` (imported.ts — a parsed .mat as a finished
  StoredMatch), the shared `CopyXgidButton`, and re-exports of
  `encodeXgid`/`decodeXgid`, which live in `src/engine/xgid.ts` (the
  ticket-04 encoder, extended rather than duplicated — the engine still
  drives gnubg through the same code).
- **.mat export**: follows the gnubg 1.05 writer conventions from the
  formats exploration notes — ` N point match` header, per-game
  ` name : score` line (left column padded to 31), `%3d) %-27s %s` move
  pairs (white = player 0 = left column), ` Doubles => N` / ` Takes` /
  ` Drops`, `Wins N point(s)` in the winner's column. Scores per game come
  from replaying the record (`matchStandings`/`replayMatchGame`), never
  from stored state. Identical consecutive hops group as `13/8*(2)`; only
  consecutive ones, so the notation replays hops in recorded order (global
  grouping can change which blots get hit — caught by the round-trip
  property). Resignations are not representable: an accepted one is just
  the Wins line (gnubg does the same); a declined one leaves no trace.
  Games from non-standard starting positions refuse to export. Sample
  (the shared cube-game fixture, a 2-point match):

  ```
   2 point match

   Game 1
   White : 0                      Black : 0
    1) 31: 8/5 6/5                  Doubles => 2
    2)  Takes                       65: 24/18 18/13
    3) 62: 24/18 13/11             Wins 2 points
  ```

- **.mat import**: tolerant per the notes' reader tolerances — `; [Tag]`
  header lines skipped (`[Variation]` other than Backgammon rejected),
  case-insensitive `N point match` located anywhere before content, games
  found by `Game N` substring, CRLF/CR fine, move entries split by
  *content* (dice `XY:`, Doubles/Takes/Drops/Wins keywords), not column
  position, `Cannot Move` accepted for a dance. Strict about meaning:
  every play is validated through src/rules legality
  (`matchPlayByMoveText` joins the notation against `legalPlays`) — an
  illegal move, a recorded dance where plays exist, a `Doubles => N` that
  does not follow from the cube, a take/drop with no double pending, a
  score line or Wins value that contradicts the replayed record, all are
  `MatParseError`s naming the 1-based line. Money sessions (`0 point
  match`) and unfinished matches are rejected with clear messages.
  **Crawford is inferred, not stored**: a game is the Crawford game
  exactly when, at its start, a player first stands one point from the
  target (`!crawfordPlayed && (white === length-1 || black === length-1)`)
  — the same rule `src/rules/match.ts` applies to native matches, so the
  inferred flags agree with native records (gnubg's reader uses the
  equivalent XOR form). A game-ending `Wins` with the board unfinished and
  no drop reconstructs an accepted resignation; the winner comes from
  which column the Wins sits in, classified against the columns the
  game's own entries actually used (writers' padding varies). Opening
  rolls are synthesized from the first play's dice (the opener holds the
  higher die); doubles rerolls before the opening are inherently lost.
  Imported rows: `status: 'finished'`, `config.mode: 'imported'` (the
  `MatchConfig` union grew that member; `difficulty` became optional),
  `config.players` keeps the file's names, `analysis` left absent so
  ticket 08's open-triggers-analysis path analyzes it like any native
  match (verified in a UI test, not rebuilt).
- **XGID**: `decodeXgid` added beside the encoder — player 1 (bottom,
  uppercase) maps to white, field semantics per the notes (cube as log2,
  owner/turn ±1, dice `00`/`D`/digit pair, rules flag = Crawford in match
  play, length 0 = money). `encodeXgid` gained a `pendingDouble` option
  (`D` dice field, on-roll = doubler, gnubg `SetXGID` semantics). Both
  reject malformed input with messages starting "not a valid XGID".
- **Copy XGID**: the Play HUD (next to the match caption; pre-roll, turn
  and cube-offered phases — pre-play position with dice during a turn,
  `D` while a double is offered) and the Analyze review board (position
  before the selected decision; take/pass decisions encode the pending
  double). Copies with the `XGID=` prefix; shared `CopyXgidButton` shows
  Copied/Copy failed.
- **Position viewer** (Analyze, below the history ledger): paste an XGID,
  Load position renders it read-only on the app's Board with cube, dice
  and a caption (who acts, match length, score, Crawford, money), and
  "Analyze position" runs on demand at user priority through the shared
  analyzer's new `analyzePosition` (additive `MatchAnalyzer` method using
  the existing priority gate): ranked plays when dice are present, the
  cube decision otherwise. Invalid XGID → message, no crash.

Automated vs needs-human-eyes:

- Round-trip property: automated — 20 seeded generated matches (random
  legal plays, doubles/takes/passes, accepted resignations, dances, 1-3
  point lengths via `src/test/generateMatch.ts`) export→import to a
  record deep-equal to the native one (openingRolls normalized to the
  deciding attempt); XGID: 100-run fast-check properties for
  decode(encode(p)) identity (white on roll) and encode(decode(s))
  string identity for either seat, plus hand-verified worked examples
  from the notes (`src/engine/xgid.test.ts`, `src/formats/mat.test.ts`).
- Export layout: automated golden test, byte-exact against the gnubg
  writer conventions above.
- Import tolerances and malformed files: automated — a foreign-styled
  file (tags, loose casing, tight columns, CRLF, named players) imports
  to the identical record; ten malformed/illegal inputs produce
  line-numbered `MatParseError`s.
- UI: automated (`Analyze.test.tsx` +5, `Play.test.tsx` +2) — import
  listing + open-analyzes-like-native (fake engine), malformed-file note
  with history intact, Export .mat download re-imports identically,
  viewer load/caption, on-demand plays and cube analyses, invalid-XGID
  message, review Copy XGID writes the exact expected string to the
  clipboard, HUD Copy XGID with dice, absent before a match.
- `npm test` (598), `npm run build`, `npm run lint` all pass.
- **Human eyes**: paste a real XG/gnubg-produced XGID and .mat file from
  the wild (tests use faithful reconstructions of the documented
  formats); clipboard behavior in a real browser (tests use the
  user-event stub); the viewer board/caption and the new buttons at
  tablet width and in dark theme; one real gnubg import of our export.

Deviations / notes:

- Export .mat is offered on finished matches only: an in-progress row's
  record holds completed games only and would re-import as "unfinished".
- `MatchConfig` widened (`mode: 'imported'`, optional `difficulty`) in
  src/storage/types.ts — type-level only, no schema/backup change;
  Play.tsx already treated both fields tolerantly. Ticket 13's progress
  view should decide whether imported matches count toward stats (they
  carry no difficulty and were not played here).
- The .mat resignation winner is inherently positional (the format names
  no winner); the importer classifies the Wins column against the
  game's own entry columns, so tight-format files still parse.

# pg-backgammon

A personal, browser-only backgammon training platform: play against the computer at multiple difficulties, review games with an analyzer, and drill practice puzzles. Solo play and two-player remote matches; no accounts; all personal data local (ADR-0004).

## Language

### Play

**Match**:
A series of games played to a fixed point target (1–25), using the doubling cube and the Crawford rule. The unit a player starts and finishes.
_Avoid_: Session, series

**Game**:
One game of standard backgammon within a match, from opening roll to a win (single, gammon, or backgammon) or a cube concession.
_Avoid_: Round

**Play**:
A player's complete checker action for one dice roll (all checker movements combined). The unit the analyzer scores.
_Avoid_: Move (ambiguous: sometimes means one checker's hop), turn

**Cube decision**:
A doubling-cube choice: whether to double, and whether to take or pass when doubled. Scored by the analyzer separately from plays.

**Money play**:
A game mode outside any match: unlimited single games, the cube live from the first roll and never dead, gammons and backgammons scored, and the **Jacoby rule** in force. Score accumulates across games but there is no target, so a session never ends on its own.
_Avoid_: Money session (as the mode name), unlimited mode

**Jacoby rule**:
A money-play rule: a gammon or backgammon counts only as a single until the cube has been turned (doubled and taken). Keeps either side from grinding out an undoubled gammon and keeps the cube central.

**Movement**:
One checker's move by a single die. A Play combines one or more movements.
_Avoid_: Hop, step

**Race**:
A position with no remaining contact: neither player can hit or be hit, so checkers only run home and bear off.
_Avoid_: No-contact (as a noun)

**Forced play**:
A turn with exactly one legal play, so the player has no decision to make. Excluded from analysis and eligible for auto-play.

**Race autopilot**:
A per-game toggle, offered only during a Race against the computer, that plays the user's remaining turns at full engine strength (paced and visible) until the game ends. It pauses for cube decisions aimed at the user and stops on a second press, a takeback, or game end. Autopiloted plays are recorded as the user's.
_Avoid_: Autoplay (reserved for the two preference-driven conveniences)

**Difficulty**:
A named opponent strength level (Beginner, Casual, Intermediate, Expert, World-class). All difficulties are the same engine deliberately weakened; they are not separate AIs.

**Board style**:
A selectable visual treatment of the board and checkers (artwork, palette, mood), independent of the light/dark app theme and of puzzle Themes.
_Avoid_: Skin, board theme

**Undo**:
Reverting checker movements within the current turn, before the play is committed. Always available.

**Takeback**:
Reverting a committed play after seeing its consequences. Available only in Tutor mode, so games played without it stay valid for progress stats.

**Remote match**:
A match between two people on two devices, relayed through a room. Mode `remote`, beside `computer` and `hotseat`. Match play only (no money play).
_Avoid_: Multiplayer

**Room**:
The server-side home of one remote match: its configuration, two seats, the live match state and the dice. Identified by an unguessable id that is the whole of the invite link. Rooms expire.
_Avoid_: Online game, lobby

**Seat**:
One of the two sides of a room (White or Black), held by whoever claimed it. Proof of holding a seat is a seat token the device keeps privately.

**Invite link**:
The URL `/play/<roomId>`. Anyone opening it while a seat is free takes that seat.

**Private link**:
The invite link plus `#seat=<token>`: a player's own bookmark for moving their seat to another device. Never shared.

### Analysis

**Engine**:
The neural-net evaluator used both as the opponent and as the ground truth for analysis. One engine serves both roles.

**Equity**:
The expected value of a position. In matches, expressed as EMG (normalized money-equivalent) so errors are comparable across scores.

**Error**:
The equity lost by a play or cube decision versus the engine's best choice. Forced plays are excluded.
_Avoid_: Mistake (colloquial)

**Blunder**:
An error at or above the blunder threshold (equity loss ≥ 0.08). Blunders are what puzzle mining feeds on.

**Error rate**:
A per-game or per-match quality score: total equity lost per unforced decision (lower is better). Stored in EMG; shown to players as **PR** (performance rating) — the equity lost per decision scaled ×500, the convention serious players calibrate in — and mapped to a skill band (world-class / expert / advanced / intermediate / beginner).
_Avoid_: rating

**Post-game review**:
The analyzer's report on a finished game or match: every play and cube decision scored, classified, and browsable with alternatives.
_Avoid_: Analysis (too generic alone)

**Live analysis**:
Engine feedback during play, available only while Tutor mode is on. Always full engine strength, regardless of opponent difficulty.

**Tutor mode**:
A single toggle (off by default, switchable mid-game) that enables all live analysis: the hint, post-play feedback, and the eval bar.

**Hint**:
An on-demand reveal of the engine's best play for the current roll.

**Post-play feedback**:
The equity loss and classification of a play, shown immediately after it is committed.

**Eval bar**:
A visible indicator of the current position's evaluation, updating as the game progresses.

### Puzzles

**Puzzle**:
A single stored position posing one question: best play for a given roll, or the correct cube decision.
_Avoid_: Problem, exercise

**Curated puzzle**:
A puzzle from the bundled, hand-tagged set that ships with the app.

**Blunder puzzle**:
A puzzle mined automatically from the player's own analyzed games, at a position where they blundered.

**Generated puzzle**:
A puzzle found on demand by in-app engine self-play mining (the "Find new puzzles" action), stored locally and drilled inside its theme beside curated puzzles.

**Theme**:
A tag classifying what a puzzle teaches (e.g. priming, blitzing, holding game, bear-off, cube handling).

**Drill**:
One run through a collection of puzzles (a theme or the blunder set), graded as you go.
_Avoid_: Session

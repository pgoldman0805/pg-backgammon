# 35: 2-ply honesty and opening handling

**What to build:** The analyzer is honest about its confidence and stops "correcting" well-known openings. Analysis is labelled as a 2-ply evaluation (deeper on demand), not a rollout; puzzles are only kept where 2-ply and a deeper check agree on the best play; and contested opening plays aren't flagged as errors on thin 2-ply margins.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The review and Tutor UI make clear the evaluation is 2-ply (deeper on demand), not a rollout
- [x] Bundled and generated puzzles whose top play flips between 2-ply and a deeper check are excluded
- [x] Opening decisions within a small margin are not classified as errors or blunders
- [x] Full gauntlet green

## Comments

Implemented on branch `ticket/35-two-ply-honesty-and-openings` (2026-10-25).
Three coherent changes:

- **Labelled as a 2-ply eval, not a rollout.** The player-facing `two-ply`
  glossary entry (`src/ui/glossary.ts`) is rewritten: its tooltip (`short`)
  and fuller entry (`long`) now say the analysis is a quick engine evaluation
  — every play and the best reply, two half-turns of look-ahead — explicitly
  **not a rollout** (which would play the position out thousands of times),
  and that on the closest decisions a rollout can disagree; deeper (3-ply) on
  demand is sharper but still not rolled-out. The Analyze review already wraps
  the per-decision depth chip in this glossary term (`src/pages/Analyze.tsx`),
  so its tooltip now carries the "not a rollout" message. Live Tutor post-play
  feedback gains a quiet `2-ply` glossary chip (`FeedbackNote` in
  `src/pages/Play.tsx`, styled `.tutor-note-depth` in `src/play/board.css`), so
  a player who knows the rollout answer understands why a close call can differ.

- **2-ply-vs-3-ply agreement gate on mined puzzles.** The self-play mining
  core (`src/puzzles/selfPlayMining.ts`) gains a required
  `deepRankPlays` on `SelfPlayMiningEngine`: after a play candidate clears the
  2-ply margin window, its 2-ply best must still be the best at a deeper
  (3-ply, bounded — no rollout) ranking, or the candidate is dropped
  (`stats.playDeepRejected`). Wired through the in-app generator
  (`generationInstance.ts`, analyzer at `effort: 'deep'`) and the offline miner
  (`scripts/minePuzzles.ts`, session at `effort: 'deep'`). Cube puzzles have no
  "top play" and are not depth-gated. For the **existing bundled set**, a new
  `checkPlayDepthAgreement` (`src/engine/node/curatedValidation.ts`) was added
  to `npm run validate:puzzles`, which re-ranks every bundled play puzzle at
  3-ply against the real WASM engine. Result: **0 of 132 play puzzles flip
  their top play at 3-ply**, so **nothing was dropped** and the bundled set is
  unchanged (171 puzzles, all engine-validated). Full summary:
  `Validated 171 puzzles (132 play, 39 cube; basics 12, priming 30, blitzing
  30, holding-game 30, bear-off 30, cube-handling 39) ... 171 ok, 0 failed
  (0 play puzzles flipped top play at 3-ply).`

- **Opening suppression on thin 2-ply margins.** New
  `classifyPlayLoss(loss, playIndex)` in `src/engine/analysis.ts`: the opening
  roll and the first reply (plays 0 and 1, `OPENING_PLY_COUNT = 2`) losing less
  than `OPENING_NOISE_MARGIN = 0.06` EMG are classified `ok`, never `error` or
  `blunder` — 2-ply disagrees with rollout consensus on several well-known
  openings, so a loss in that band is evaluation noise, not a mistake. The
  margin sits above the error threshold (0.04, so soft errors are suppressed)
  but no higher than the blunder threshold (0.08, so a gross opening still
  flags). Applied in the post-game review (`analyzePlayMoment` in
  `src/analysis/analyze.ts`); equity-loss figures (and thus PR) are unchanged —
  only the classification label is suppressed. Live Tutor feedback keeps the
  plain thresholds (per the lane note to keep the Play edit to the label).

Verification: `npm test` (1044 passed), `npm run lint`, `npm run build`,
`npm run e2e` (2 passed), `npm run e2e:audit` (1 passed, PNGs discarded),
`npm run e2e:pwa` (2 passed), and `npm run validate:puzzles` (171 ok, 0 failed)
all green.

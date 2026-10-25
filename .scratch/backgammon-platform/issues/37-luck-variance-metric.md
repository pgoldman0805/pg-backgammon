# 37: Luck / variance metric

**What to build:** A player can tell whether they lost to bad play or bad dice. Each analyzed game reports a luck/variance figure for each side alongside the error rate, so a painful loss with low error and bad luck is distinguishable from a deserved one, and the dice feel can be sanity-checked over time.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Post-game review shows a per-side luck figure for the game, aggregated per match
- [x] The metric is defined and labelled understandably and persists with the match analysis
- [x] It is clearly separated from the skill (PR) number, never conflated with it
- [x] Full gauntlet green

## Comments

Implementation notes (agent, ticket 37):

- **Method (luck).** Per unforced roll, luck = the best-play equity the actual
  roll gave (the review's top-ranked play, reused — no extra call) minus the
  engine's pre-roll evaluation of that position (`evaluate(...).cubefulEquity`,
  which already integrates over the possible rolls). This is the standard gnubg
  luck decomposition — realized minus expected on one cubeful EMG scale, from
  each player's own perspective, so positive = lucky. Summed per side per game
  in `src/analysis/luck.ts` + `analyze.ts`, rolled up to the match, and it
  rides the existing background auto-analysis untouched.
- **Deviation from the ticket's "e.g." (21-roll sweep).** First implemented
  literally — baseline = weighted average best-play equity over all 21 rolls
  (opening over the 15 non-doubles). It was correct and committed, but ~20
  extra engine rankings per play pushed a full-match background analysis past
  the review's render budget and the golden-path e2e timed out waiting for the
  summary. Switched to the one-evaluate-per-roll baseline above: same metric
  and meaning, ~20× cheaper, e2e green at 1.4m. (gnubg computes luck this way
  too; the 21-roll sweep is just an expensive way to get the same pre-roll
  expectation.)
- **Persistence / versioning.** Luck is an additive optional field on
  `GameAnalysis.luck` / `MatchAnalysis.luck` (`{ white, black }`), stored on
  the analysis blob. Did **not** bump `ANALYSIS_FORMAT`: an additive optional
  field needs no bump (the `isMatchAnalysis` guard stays tolerant, matching the
  established additive-evolution pattern), and bumping would force a costly
  re-analysis of all history plus cross-lane test churn. Reviews written before
  this field simply carry no luck and the UI shows none; new analyses always
  carry it. Deepening a decision preserves luck (it grades the dice, not the
  decision).
- **Display.** Analyze review summary shows luck per side, labelled "luck" and
  set visually apart from the PR number (its own bordered group), with a
  glossary tooltip ("Luck") defining it and a hint line stressing it is
  separate from PR. Multi-game matches show per-game luck in the game tabs;
  single-game matches read it off the match summary (match == game).
- **Glossary.** Added a player-facing `luck` entry (`src/ui/glossary.ts`), so
  the tooltip and the Learn > Glossary page both explain it.
- **Verification.** `npm test` 1000 passing (incl. the real-WASM golden
  analysis), lint clean, build clean, `npm run e2e` 2/2, `e2e:audit` 1/1
  (regenerated PNGs discarded), `e2e:pwa` 2/2 — all foreground.

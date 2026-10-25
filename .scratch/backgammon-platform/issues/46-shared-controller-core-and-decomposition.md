# 46: Shared play-controller core and page decomposition

**What to build:** The play-flow controllers stop duplicating logic and the biggest pages become maintainable. The shared token, pacing, and liveness logic behind the opponent, autoplay, and race-autopilot controllers is extracted into one tested core, and the oversized Play and Analyze pages are split into coherent pieces — with no change in observable behavior.

**Blocked by:** 29 (difficulty-aware opponent cube) and 36 (human-textured difficulty) — both edit the controllers; refactor after they land to avoid rework.

**Status:** ready-for-agent

- [x] The three controllers share one tested core; their observable behavior is unchanged
- [x] Play and Analyze are decomposed into smaller units; all existing tests pass
- [x] Pure refactor: no user-facing behavior change, verified by the existing gauntlet

## Comments

**Shared controller core** — `src/play/controllerCore.ts` (with its own
`controllerCore.test.ts`, written test-first). The opponent, autoplay and
race-autopilot controllers had each carried a verbatim copy of: the
`DecisionToken` shape, `tokenFor`, `sameToken`, the "is this moment still
live?" store lookup, the takeback detector, and the pacing defaults
(`defaultPace`, `stepMs ?? 450`). These are now one module:

- `DecisionToken`, `tokenFor`, `sameToken` — the decision-moment identity.
- `matchForToken(store, token)` — the shared liveness lookup. Each controller
  wraps it with its own guard: opponent/autoplay `disposed ? null : …`, race
  autopilot `disposed || !active ? null : …`.
- `isTakeback(prev, next)` — the same-game, fewer-plays detector autoplay and
  race autopilot both used inline.
- `gameLive(match)` — not-over check (was race-autopilot-local).
- `DEFAULT_STEP_MS`, `defaultPace`, `resolvePacing(options)` — pacing defaults
  (a `stepMs` of 0 stays honored).

`tutor.ts` was reviewed: it does not use the token/pacing/liveness machinery
(its own evaluatedPlays/hintAnchor/feedbackAnchor tracking is a different
concern), so it was left unchanged. `matchContext` stays exported from
`opponent.ts` (engine-context building, outside this ticket's scope).

The three controllers' existing suites pass untouched; 19 new unit tests cover
the core directly.

**Play.tsx decomposition** (was ~1210 lines → ~790). Extracted into
`src/pages/play/`: `playFormat.ts` (pure helpers/types/consts — setup state,
status/result text, XGID), `PlayDialog.tsx` (the modal dialog + focus trap),
`PlaySetup.tsx` (difficulty/game-type/length pickers, `SettingSwitch`,
`EngineNote`), `PlayHud.tsx` (the two player chips + center status/caption),
`tutorSurfaces.tsx` (`EvalBar`, `FeedbackNote`). The page keeps the
orchestration (hooks, effects) and the dialog-builder closures and side
controls, which close over component scope.

**Analyze.tsx decomposition** (was ~1360 lines → ~290). Extracted into
`src/pages/analyze/`: `reviewFormat.ts` (pure helpers/predicates/shapes),
`reviewPanels.tsx` (`Counts`, `ClassificationBadge`, `DecisionRow`,
`AlternativesPanel`, `CubePanel`), `Review.tsx`, `MatchView.tsx`,
`PositionViewer.tsx`, `ledger.tsx` (`OverflowMenu` + sort/filter helpers). The
page keeps the ledger orchestration.

**Remaining / not done:** both pages are fully decomposed. The
dialog-builder closures in Play (`gameOverCard`, `matchOverCard`, `cubeDialog`,
`resignDialog`, `setupCard`, `resignPicker`) remain inline — they close over
page state and callbacks, so extracting them would be prop-plumbing with no
readability win; left as a deliberate boundary, not an omission.

**Verification:** 1073 unit tests pass (1054 baseline + 19 new core tests),
biome lint clean, production build succeeds, and all three e2e projects pass
(`e2e` smoke, `e2e:audit`, `e2e:pwa`). Regenerated audit PNGs discarded. Pure
refactor — no user-facing behavior change, no existing test weakened or
rewritten.

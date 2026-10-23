# Spec: Backgammon training platform (v1)

Status: done

## Problem Statement

I want to get better at backgammon, but I have no good way to practice seriously on my own. Playing casual apps teaches nothing: there's no feedback on which plays and cube decisions lost equity, no way to review a finished match, no structured drills, and opponents are either trivially weak or opaque. I need one place where I can play real matches against a strong, adjustable computer opponent, find out exactly where I went wrong, and drill the kinds of positions I keep misplaying — all in the browser, with my data staying local.

## Solution

A single-player browser app (TypeScript + React + Vite SPA, no backend, GPL-3.0) with three connected areas:

1. **Play**: full matches of standard backgammon (match play 1–25 points, doubling cube, Crawford) against gnubg compiled to WebAssembly, at five difficulties (Beginner → World-class) produced by deliberately weakening one world-class engine. A clean, modern-minimal 2D board with drag-and-drop, click-to-move, legal-play highlighting, and within-turn undo. Optional Tutor mode (hint, post-play feedback, eval bar, takebacks) at full engine strength.
2. **Analyze**: every finished game auto-analyzed at 2-ply. Post-game review shows every play and cube decision scored for equity loss (EMG), classified (blunder/error/dubious/ok), alternatives viewable on the board, and a per-game/per-match error rate. Individual positions can be re-analyzed deeper on demand. A progress view plots error rate over time. Matches import/export as .mat; positions copy/paste as XGID.
3. **Puzzles**: checker-play and cube-decision puzzles graded by equity tolerance (correct if within 0.02 of best), with the full equity table revealed after answering. A bundled, hand-tagged curated set (themes: priming, blitzing, holding game, bear-off, cube handling) ships first; blunder puzzles are mined automatically from the player's own analyzed games (equity loss ≥ 0.08), with a retry queue for misses.

All game history, analysis, and puzzle progress persist in IndexedDB. Desktop-first, responsive to tablet. Light and dark themes.

## User Stories

### Playing

1. As a player, I want to start a match to a chosen length (1–25 points, default 7), so that I can practice the format real backgammon is played in.
2. As a player, I want to choose from five difficulties (Beginner, Casual, Intermediate, Expert, World-class), so that I can face an opponent matched to my level.
3. As a player, I want the opening roll, dice rolling, and turn order to follow standard rules automatically, so that I can focus on decisions.
4. As a player, I want to move checkers by drag-and-drop or by clicking, with legal destinations highlighted, so that I can play quickly without memorizing legality rules.
5. As a player, I want illegal plays to be impossible to commit (including forced-play and maximum-dice-use rules), so that my games are always valid.
6. As a player, I want to undo checker movements within my current turn before committing, so that I can explore candidate plays without penalty.
7. As a player, I want forced plays and no-play rolls to resolve with minimal friction, so that games keep moving.
8. As a player, I want to offer, take, and pass doubles with the cube state always visible, so that cube play is a first-class part of my practice.
9. As a player, I want match score, Crawford status, pip counts, and whose turn it is always visible, so that I can make score-aware decisions.
10. As a player, I want gammons and backgammons scored correctly, so that match results are accurate.
11. As a player, I want to resign a game (single, gammon, or backgammon) with the engine accepting or declining per its evaluation, so that hopeless games end fast.
12. As a player, I want an in-progress match to survive a page reload and be resumable later, so that I never lose a match to a closed tab.
13. As a player, I want the dice to come from a fair PRNG, so that I can trust results and my stats.
43. As a player, I want my dice to roll automatically in a race (no-contact position), so that the bear-in and bear-off don't require a Roll click every turn. (Persisted setting, on by default; I accept that auto-roll skips the pre-roll doubling moment while it's on. Added 2026-10-22.)
44. As a player, I want forced plays made for me automatically (visibly, then committed), so that turns without a decision cost no clicks. (Persisted setting, on by default; dance "Continue" stays manual so I see the dance. Added 2026-10-22.)
45. As a player, I want to double-click a checker to move it when it has exactly one legal destination, so that obvious movements cost one gesture. (Added 2026-10-23.)
46. As a player, I want a selected checker's final destination after two movements highlighted and clickable (both movements applied at once), so that moving one checker with both dice doesn't require clicking each intermediate point. Offered only when every die order reaching that point produces the identical board (same hits); otherwise I click per movement to choose the path. (Added 2026-10-23.)

### Tutor mode (live analysis)

14. As a learner, I want a single Tutor mode toggle (off by default, switchable mid-game), so that live help is a deliberate choice and my non-tutor games stay clean for stats.
15. As a learner, I want a hint button that reveals the engine's best play for my current roll, so that I can learn when stuck.
16. As a learner, I want feedback immediately after committing a play (equity loss and classification), so that mistakes are fresh when I learn about them.
17. As a learner, I want an eval bar showing the current evaluation as the game progresses, so that I can connect positions to winning chances.
18. As a learner, I want takebacks after seeing consequences (Tutor mode only), so that I can replay a mistake immediately.
19. As a learner, I want all live analysis at full engine strength regardless of opponent difficulty, so that feedback is always ground truth.

### Analyzer

20. As a learner, I want every finished game analyzed automatically in the background at 2-ply, so that the review is ready the moment I open it.
21. As a learner, I want every unforced play scored for EMG equity loss against the engine's best, so that I know exactly what each decision cost.
22. As a learner, I want plays classified (blunder ≥ 0.08, error ≥ 0.04, dubious ≥ 0.02), so that I can find the costly decisions fast.
23. As a learner, I want every cube decision analyzed (missed double, wrong double, wrong take, wrong pass) with its equity cost, so that my cube skill gets the same scrutiny as my checker play.
24. As a learner, I want to step through a reviewed game move by move on the board, with the engine's top alternatives and their equities viewable per position, so that I can see what I should have played.
25. As a learner, I want a per-game and per-match error rate (equity lost per unforced decision), so that I can summarize quality in one number.
26. As a learner, I want to re-analyze any single position deeper on demand, so that critical moments get extra scrutiny.
27. As a learner, I want a progress view plotting error rate per match over time plus blunder counts, so that I can see whether I'm improving.
28. As a learner, I want to import .mat files, so that matches played elsewhere get the same analysis.
29. As a player, I want to export any match as .mat and copy any position as XGID (and paste XGID to load a position), so that I can share and discuss positions.

### Puzzles

30. As a learner, I want checker-play puzzles ("find the best play for this roll"), so that I can drill play selection.
31. As a learner, I want cube-decision puzzles ("double, take, or pass?"), so that I can drill cube judgment.
32. As a learner, I want answers graded by equity tolerance (within 0.02 of best counts as correct), so that equally good plays aren't marked wrong.
33. As a learner, I want the full equity table revealed after I answer, so that each puzzle teaches rather than just tests.
34. As a learner, I want a bundled curated set tagged by theme, so that I can drill specific skills.
35. As a learner, I want puzzles auto-mined from my own blunders, so that I drill exactly what I get wrong in real games.
36. As a learner, I want missed puzzles to enter a retry queue, so that I see them again until I get them right.
37. As a learner, I want my puzzle progress (solved, missed, streaks per theme) persisted, so that drilling has continuity.
47. As a learner, I want a much larger bundled curated set (≥25 per theme), so that themed drills don't run dry in one sitting. (Added 2026-10-23.)
48. As a learner, I want the app to generate new puzzles on demand using the engine (self-play mining in the browser, persisted locally, slotted into their themes), so that I never run out of fresh material. (Added 2026-10-23.)
49. As a player, I want to choose among geographically-inspired Board styles (at least five beyond the default, each with unique artwork, palette, and mood), so that the board feels like mine. Board styles restyle the board and checkers only, work in both light and dark app themes, and never compromise training readability. (Added 2026-10-23.)
50. As a user, I want a Settings area collecting every controllable preference in one place (theme, Board style, Tutor mode default, auto-roll in races, auto-play forced plays, checker animation, and data management), so that I don't hunt for controls across pages. In-context quick toggles stay where they are; Settings is the comprehensive home. (Added 2026-10-23.)
51. As a player, I want checker movements animated as smooth travel with a configurable speed (off / fast / normal / slow; "off" is instant), applying to opponent moves, auto-played forced plays, two-movement clicks, and my own click-to-move, so that moves are easy to follow at my pace. Dragging stays direct; prefers-reduced-motion defaults animation off. (Added 2026-10-23.)
52. As a learner, I want a "Try again" action on every puzzle after the reveal (resetting the position for another attempt; only the first attempt counts toward progress and the retry queue), so that I can immediately practice the correct play. (Added 2026-10-23.)
53. As a player, I want the board rendered larger on screen with bigger point numbers, so that positions read effortlessly at a distance. (Added 2026-10-23.)
54. As a learner, I want the puzzle reveal (verdict and equity table, including my missed play) shown beside the board on desktop rather than beneath it, so that I can compare the table against the position without scrolling. (Added 2026-10-23.)
55. As the owner, I want a Capacitor Android project kept in-repo with a proven debug-APK build (landscape-locked), so that a store release is an afternoon away when wanted — not the delivery path today (see ADR-0003, including the GPL note for selling). (Added 2026-10-23, reshaped same day.)
56. As the owner, I want the app installable on my phone as a PWA (manifest, icons, service worker precaching the app and engine for offline), hosted on Cloudflare, so that my phone always runs the latest push and mobile UI work has a live target. (Added 2026-10-23.)
57. As a phone user, I want the app usable at phone viewports: navigation collapses into a hamburger menu, touch targets are finger-sized, safe-area insets are respected in the installed app, every area is readable and overflow-free in portrait, and board play works in landscape (portrait shows the board smaller with a gentle rotate hint). (Added 2026-10-23.)
58. As a player, I want the game view decluttered: preference controls (Board style, auto-roll, auto-play switches) live only in Settings, while the game view keeps only gameplay affordances (Tutor mode toggle stays in-game, since it's switchable mid-match by design). (Added 2026-10-23.)
59. As a player, I want a race-autopilot button during a Race: when pressed, the engine plays my remaining turns at full strength (paced and visible) until the game ends, pausing for any cube decision aimed at me; pressing again stops it. (Added 2026-10-23. Note: autopiloted plays are recorded as mine and score near-zero error — races slightly flatter the error rate; accepted, documented.)

### Platform

38. As the owner, I want all data local (IndexedDB), with no accounts and no backend, so that the app is private and runs anywhere a browser does.
39. As a user, I want a navigation shell with Play, Analyze, Puzzles, and Progress areas, so that the three pillars are one coherent app.
40. As a user, I want light and dark themes with a high-contrast, modern-minimal board, so that positions read at a glance.
41. As a desktop/tablet user, I want the layout responsive down to tablet width, so that I can play on either device.
42. As a user, I want the engine to run off the main thread (Web Worker), so that the UI never freezes while it thinks.

## Implementation Decisions

- **One engine, two roles** (ADR-0001): gnubg compiled to WASM (reusing the proven gnubg-web Emscripten build, ~2–4 MB with NN weights and one-sided bearoff DB) is both the opponent and the analysis ground truth. It runs in a dedicated Web Worker behind a typed async interface (evaluate position, ranked plays with equities, cube info). The app is GPL-3.0.
- **Difficulties** are gnubg's own recipe: Gaussian noise on 0-ply evaluations, position-seeded for reproducibility — Beginner 0.060, Casual 0.050, Intermediate 0.030, Expert 0-ply clean, World-class 2-ply clean.
- **Own TS rules engine** (ADR-0002): board state, legal-play enumeration (doubles, bar entry, bear-off, forced/max-dice rules), cube state machine, match scoring with Crawford, game-end detection (single/gammon/backgammon), resignation. Pure, synchronous, UI-independent; gnubg stays an async oracle. Cross-validated against gnubg move generation in tests.
- **Match model**: a Match (target 1–25, default 7) contains Games; every Play and Cube decision is recorded as an append-only sequence sufficient to replay the game deterministically. This record is the shared input for the analyzer, .mat export, takebacks, and blunder mining.
- **Analyzer**: runs in the worker against the recorded game; computes EMG equity loss per unforced decision; classifications at ≥0.02 dubious, ≥0.04 error, ≥0.08 blunder; error rate = total equity lost ÷ unforced decisions. Analysis results are persisted beside the game. Live (Tutor) feedback reuses the same analysis code path at full strength.
- **Persistence**: IndexedDB stores matches (with analysis), puzzle definitions, and puzzle progress. A full-history JSON backup export/import guards against browser storage eviction.
- **Formats**: .mat (Jellyfish) for match import/export; XGID for single-position copy/paste; internal format is our own JSON.
- **Puzzles**: a Puzzle is a stored position plus question type (play or cube) and graded answer set computed by the engine. Curated puzzles are bundled as app data, generated by engine self-play mining and hand-tagged by theme (no copyrighted book positions). Blunder puzzles are created automatically from analyzed games at ≥0.08 equity loss.
- **UI**: React SPA, 2D SVG board, drag-and-drop plus click-to-move, legal-move highlighting, within-turn undo, commit-to-end-turn. Modern-minimal, high-contrast, light + dark themes. Desktop-first, responsive to tablet.

## Testing Decisions

- Test external behavior at the highest seams, not implementation details. The three seams, highest first:
  1. **Rules engine interface** (pure functions): the bulk of tests live here — legal-play enumeration (including doubles, bar, bear-off, forced-play and max-dice rules), cube/match state machine, scoring, replay determinism. Property-based tests plus cross-validation against gnubg's move generation as an oracle.
  2. **Engine worker interface** (async): contract tests against the real WASM (loads, evaluates known positions sanely, noise levels change play quality); everything above it tests against a fake engine honoring the same interface.
  3. **App/UI**: component tests with Testing Library against a fake engine (start match, make a play, cube flow, review navigation, puzzle answering); a thin Playwright smoke test for the real end-to-end path.
- Analyzer gets golden tests: a small recorded game with hand-verified equity losses and classifications from the real engine.
- Format round-trip tests: .mat export→import and XGID encode→decode are identity-preserving.
- Vitest as the runner. No tests of styling.

## Out of Scope (v1)

- Money play, Jacoby rule, beavers; variants (Nackgammon, Hypergammon, Acey-deucey)
- Human vs human (hot-seat is incidental at most, not a feature), online play, accounts, backend
- Rollout analysis (deeper on-demand analysis is bounded-ply only)
- Spaced repetition scheduling for puzzles (retry queue only)
- Phone layout, PWA/offline install, sounds, clocks/time controls, localization (English only)
- Manual dice entry

## Further Notes

- Working title "pg-backgammon".
- GPL compliance: the repo is public-ready GPL-3.0; gnubg WASM artifacts' corresponding source must remain obtainable (link the gnubg-web build provenance in the README).
- Engine payload (~2–4 MB) loads lazily with a visible loading state; the app shell must be usable before the engine is ready.
- Analysis conventions follow gnubg/XG standards so numbers are comparable to the wider backgammon world.

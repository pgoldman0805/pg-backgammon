# 04: gnubg engine worker

**What to build:** The engine (ADR-0001) available to the app: gnubg-WASM artifacts (prebuilt gnubg-web build fetched at build time, with GPL provenance documented) loaded inside a Web Worker behind a typed async interface — evaluate a position, rank all legal plays with equities, cube info — plus the difficulty layer (position-seeded Gaussian noise at Beginner 0.060 / Casual 0.050 / Intermediate 0.030 / Expert clean 0-ply / World-class 2-ply) and the shared analysis primitives: EMG equity loss for a decision and classification thresholds (dubious ≥ 0.02, error ≥ 0.04, blunder ≥ 0.08). Demoable via a dev-only page or test that ranks plays for a known position. Exploration notes with artifact URLs and API details are in the scratchpad directory (pointer in the ticket's Comments).

**Blocked by:** 02 (rules engine core, for position types/encoding).

**Status:** ready-for-agent

- [ ] Contract tests against the real WASM: loads, evaluates a known opening position with sane equities, ranks 3-1 opening plays with 8/5 6/5 on top
- [ ] Difficulty noise measurably degrades play quality in a reproducible (seeded) way
- [ ] All engine calls run off the main thread; a fake engine implementing the same interface exists for downstream tests
- [ ] Engine payload lazy-loads with an observable loading state

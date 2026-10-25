# gnubg-WASM as the single engine; app licensed GPL-3.0

The app needs world-class play (as the top difficulty and as ground truth for the analyzer) running entirely in the browser. We compile GNU Backgammon's evaluator to WebAssembly (following the proven hwatheod/gnubg-web Emscripten build, ~2–4 MB with neural-net weights and one-sided bearoff database) and use it as the one engine for the opponent, live analysis, and post-game review. Because gnubg is GPL-3.0 and serving WASM is distribution, the whole app is licensed GPL-3.0: this is a personal training tool with no commercialization intent, so the GPL costs nothing and removes all legal ambiguity, including public hosting.

## Considered Options

- **wildbg (MIT/Apache)**: permissive and <1 MB, but alpha, meaningfully weaker, no match-play support — cannot power the analyzer.
- **Hybrid (wildbg opponent + isolated gnubg analyzer)**: only earns its complexity if the app must stay permissively licensed. Revisit if that ever changes.

## Consequences

- Difficulty levels weaken a 0-ply base in TypeScript (see `src/engine/difficulty.ts`): symmetric Gaussian equity noise that widens toward Beginner, plus a directional "human-error" bias toward characteristic beginner mistakes (over-hitting, running a back checker). Expert is clean 0-ply and World-class clean 2-ply, both unweakened. (Ticket 36 replaced the earlier symmetric-noise-only recipe; the noise is applied here, not via gnubg's own saturated WASM noise mode.)
- The engine runs in a Web Worker; the UI never blocks on evaluation.
- Analyzer conventions (EMG equity loss, error/blunder thresholds, error rate per decision) follow gnubg/XG standards.

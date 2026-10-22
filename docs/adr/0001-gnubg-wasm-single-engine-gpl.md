# gnubg-WASM as the single engine; app licensed GPL-3.0

The app needs world-class play (as the top difficulty and as ground truth for the analyzer) running entirely in the browser. We compile GNU Backgammon's evaluator to WebAssembly (following the proven hwatheod/gnubg-web Emscripten build, ~2–4 MB with neural-net weights and one-sided bearoff database) and use it as the one engine for the opponent, live analysis, and post-game review. Because gnubg is GPL-3.0 and serving WASM is distribution, the whole app is licensed GPL-3.0: this is a personal training tool with no commercialization intent, so the GPL costs nothing and removes all legal ambiguity, including public hosting.

## Considered Options

- **wildbg (MIT/Apache)**: permissive and <1 MB, but alpha, meaningfully weaker, no match-play support — cannot power the analyzer.
- **Hybrid (wildbg opponent + isolated gnubg analyzer)**: only earns its complexity if the app must stay permissively licensed. Revisit if that ever changes.

## Consequences

- Difficulty levels reuse gnubg's own technique: Gaussian noise on 0-ply evaluations (Beginner 0.060 → Expert none) and 2-ply for the top level.
- The engine runs in a Web Worker; the UI never blocks on evaluation.
- Analyzer conventions (EMG equity loss, error/blunder thresholds, error rate per decision) follow gnubg/XG standards.

# Own TypeScript rules engine, with gnubg as a correctness oracle

Even though gnubg-WASM is present (ADR-0001), the game rules — board state, legal-play enumeration (doubles, bar entry, bear-off), cube state machine, match scoring with Crawford — are our own TypeScript module rather than gnubg calls or the MIT `sugoroku` library. The UI needs synchronous legal-move queries for drag-and-drop highlighting, puzzles need arbitrary position setup, and takeback/undo needs full control of the state model; gnubg stays an async evaluation oracle in a Web Worker. The rules module is built test-first and cross-validated against gnubg's move generation in tests.

## Considered Options

- **gnubg for rules too**: every legal-move query crosses an async worker boundary; UI interactivity and puzzle setup would be built on awkward plumbing.
- **sugoroku (MIT)**: saves initial effort, but puts someone else's state model at the heart of the app where puzzles, undo, and the analyzer all need control.

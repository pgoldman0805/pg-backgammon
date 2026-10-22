# 02: Rules engine core

**What to build:** The pure TypeScript rules engine (ADR-0002) for a single game of standard backgammon, verifiable entirely through tests: board state model, opening roll, legal-play enumeration (doubles, bar entry, bear-off, forced-play and maximum-dice-use rules), applying and undoing checker movements within a turn, committing a play, game-end detection (single/gammon/backgammon), pip counting, and a deterministic append-only game record that can replay a game identically. Fair PRNG dice behind a seedable interface.

**Blocked by:** 01 (project scaffold).

**Status:** ready-for-agent

- [ ] Legal-play enumeration passes exhaustive unit + property tests, including the must-use-both-dice and use-larger-die rules, bar re-entry, and bear-off edge cases
- [ ] A recorded game replays to an identical final position (determinism test)
- [ ] Game end correctly distinguishes single, gammon, backgammon
- [ ] Interface is pure and synchronous: no React, no worker, no storage imports

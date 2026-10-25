# 28: Engine boot resilience

**What to build:** A flaky network or a stalled load never leaves the app stuck on "Engine loading…" forever. The engine load times out into a clear, recoverable error; Retry genuinely re-attempts (rebuilding the worker) rather than failing instantly; and an engine or worker crash shows an error the player can recover from instead of hanging.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A stalled or failed engine load resolves to an error state within a bounded time, with a Retry offered
- [ ] Retry after a failure recreates the engine and reaches ready when the network recovers (verified by forcing a first-load failure then a success)
- [ ] A worker crash surfaces a recoverable error rather than leaving play permanently unresponsive
- [ ] Full gauntlet green

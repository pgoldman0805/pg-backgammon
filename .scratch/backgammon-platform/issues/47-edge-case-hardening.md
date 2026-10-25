# 47: Edge-case hardening

**What to build:** Several latent failure modes are closed. A future storage-schema upgrade can't hang when a second tab is open; a new deploy doesn't reload the app mid-turn and lose a move; the computer's resignation acceptance accounts for the cube value; and .mat/XGID import handles the documented edge cases.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Storage open handles blocked / version-change so a schema bump with a second tab open doesn't hang reads or writes
- [ ] A service-worker update defers (or is prompted) during a live match, and in-progress state survives an unload within the save debounce
- [ ] Resignation acceptance scales with the cube value; documented .mat/XGID edge cases import without error or data loss
- [ ] Full gauntlet green

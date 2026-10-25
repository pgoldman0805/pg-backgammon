# 27: Safe backup restore

**What to build:** Importing a backup can never silently destroy the player's existing history. Choosing a backup file shows a confirmation naming how many matches and puzzles it contains and what will happen (replace vs merge); the restore either fully succeeds or leaves the existing data untouched (no half-wiped state); and a merge option adds the file's data without discarding what's already there.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Import shows a confirmation with item counts before any change; cancelling changes nothing
- [ ] A restore that fails or is interrupted midway leaves the prior history fully intact (all-or-nothing)
- [ ] Merge import preserves existing matches/puzzles and adds only non-duplicates; replace is a distinct, explicit choice
- [ ] Full gauntlet green

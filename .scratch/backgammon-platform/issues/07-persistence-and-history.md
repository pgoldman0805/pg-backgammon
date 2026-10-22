# 07: Persistence and match history

**What to build:** Nothing is lost: all matches (in-progress and finished, with their full game records) persist in IndexedDB; an in-progress match survives reload and resumes exactly where it was; the Analyze area lists match history (opponent difficulty, length, score, date) with the ability to open or delete a match; and a full-history JSON backup can be exported and re-imported to guard against browser storage eviction.

**Blocked by:** 06 (cube and match play).

**Status:** ready-for-agent

- [ ] Reload mid-match resumes the exact position, cube, score, and turn
- [ ] Finished matches appear in the history list and reopen for viewing
- [ ] Backup export then import into a cleared profile restores all matches and progress data
- [ ] Storage layer is behind an interface so tests run against an in-memory fake

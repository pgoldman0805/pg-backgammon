# 43: Code-splitting

**What to build:** Visitors download only what the screen they open needs. Routes load lazily and the large curated puzzle set is fetched only when Puzzles is opened, so a player who only wants to Play doesn't download the whole puzzle library up front. Offline still works (the service worker precache covers the split chunks).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The initial Play load no longer includes the curated puzzle data or non-Play page code
- [ ] Each area loads on navigation without a jarring delay; the app still works fully offline after first load
- [ ] Total transfer for a Play-only session is measurably smaller than today (record before/after)
- [ ] Full gauntlet green, including e2e:pwa

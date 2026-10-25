# 26: Durable storage and save-failure visibility

**What to build:** The player's matches and puzzle progress survive weeks of not opening the app, and the player is warned the moment their data stops being saved. On startup the app asks the browser to persist its storage; Settings shows how much space the app is using and whether storage is persisted; if a save fails (e.g. storage full), a non-blocking banner tells the player their progress isn't being saved and offers an immediate backup export.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Persistent storage is requested at startup; its granted/denied state and a storage-usage figure are visible in Settings
- [ ] A simulated write failure surfaces a non-blocking "progress isn't being saved — export now" banner with a working export action
- [ ] Normal play is unaffected when storage is healthy: no banner, no extra prompts
- [ ] Full gauntlet green (`npm test`, lint, build, e2e, e2e:audit, e2e:pwa)

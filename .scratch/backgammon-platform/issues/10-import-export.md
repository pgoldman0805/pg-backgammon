# 10: Import and export (.mat and XGID)

**What to build:** The app speaks the wider backgammon world's formats: import a .mat file to add an externally played match to history (where it gets the standard auto-analysis), export any match as .mat, copy the current position as an XGID string from any board view, and paste an XGID to load that position into a position viewer with on-demand engine analysis.

**Blocked by:** 07 (persistence and history), 08 (post-game review).

**Status:** ready-for-agent

- [ ] Round-trip property: export→import reproduces the same match record; XGID encode→decode is identity
- [ ] A .mat file from another program imports, appears in history, and analyzes like a native match
- [ ] XGID copy/paste works for positions including cube state, score, and dice
- [ ] Malformed files are rejected with a clear message, never a crash

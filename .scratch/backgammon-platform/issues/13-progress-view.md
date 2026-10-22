# 13: Progress view

**What to build:** The Progress area: error rate per match plotted over time (from stored analysis results), blunder counts per match, and simple aggregates (total matches, average error rate over the last N matches). Tutor-assisted games are excluded from stats. Empty states guide a new user toward playing an analyzed match.

**Blocked by:** 08 (post-game review).

**Status:** ready-for-agent

- [ ] The trend chart renders from stored analysis with correct values (golden test on a known history)
- [ ] Tutor-assisted games are excluded and the exclusion is visible/explained
- [ ] Works in both themes; readable at tablet width
- [ ] Empty state shows before any analyzed match exists

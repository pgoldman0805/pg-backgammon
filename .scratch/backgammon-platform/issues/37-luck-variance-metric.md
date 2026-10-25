# 37: Luck / variance metric

**What to build:** A player can tell whether they lost to bad play or bad dice. Each analyzed game reports a luck/variance figure for each side alongside the error rate, so a painful loss with low error and bad luck is distinguishable from a deserved one, and the dice feel can be sanity-checked over time.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Post-game review shows a per-side luck figure for the game, aggregated per match
- [ ] The metric is defined and labelled understandably and persists with the match analysis
- [ ] It is clearly separated from the skill (PR) number, never conflated with it
- [ ] Full gauntlet green

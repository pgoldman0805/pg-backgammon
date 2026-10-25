# 41: Board and analyze visual fixes

**What to build:** Three readability nits in the play and analyze surface are fixed: the eval bar reads as a position evaluation (not a loading/progress bar) with its number bound to it; the centered doubling cube no longer asserts "64" where it looks like a bug (hidden in no-doubling matches, or shown neutrally); and the Bosphorus Board style's gold action affordances and dark-mode felt are legible.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The eval bar is visually distinct from a progress indicator, and its value sits with it rather than stranded
- [ ] No confusing "64" cube appears in no-doubling or early states
- [ ] Bosphorus action highlights and dark-mode felt meet the training readability bar
- [ ] Audit captures refreshed; full gauntlet green

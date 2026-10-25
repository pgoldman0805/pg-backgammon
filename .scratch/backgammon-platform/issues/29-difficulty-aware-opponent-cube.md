# 29: Difficulty-aware opponent cube

**What to build:** At lower difficulties the computer makes cube decisions the player can punish. Today every level doubles, takes, and passes at full engine strength regardless of difficulty; after this, Beginner/Casual/Intermediate make loose or missed doubles and wrong takes/passes at rates matching their checker-play weakness, while Expert and World-class keep correct cube play. Analysis and Tutor feedback stay full strength (ground truth is never weakened).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The opponent's cube decisions degrade with difficulty in a seeded, reproducible way (measurable over sampled positions), not just its checker plays
- [ ] Expert and World-class cube decisions remain engine-correct
- [ ] Analysis, post-game review, and Tutor feedback are unaffected (still full strength)
- [ ] Full gauntlet green

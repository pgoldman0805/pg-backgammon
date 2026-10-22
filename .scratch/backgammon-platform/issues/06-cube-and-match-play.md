# 06: Doubling cube and match play

**What to build:** Full match play vs the computer: the doubling cube (offer, take, pass — both directions, engine deciding its side via cube info), match creation to a chosen length (1–25, default 7), match scoring with gammons/backgammons and the Crawford rule, the sequence of games within a match, match-end summary, and resignation (single/gammon/backgammon, engine accepts or declines per evaluation). Score, cube state, and Crawford status always visible.

**Blocked by:** 05 (play vs computer).

**Status:** ready-for-agent

- [ ] A complete match (e.g. 5-point) vs the computer can be played, including doubles taken and passed by both sides
- [ ] Crawford game is enforced (no doubling) and post-Crawford doubling works
- [ ] Cube state machine covered by tests: centered/owned, dead cube, match-score effects on availability
- [ ] Resignation flow works both ways and scores correctly

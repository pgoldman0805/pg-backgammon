# 05: Play vs computer

**What to build:** A full single game against the computer: the user picks a difficulty (Beginner / Casual / Intermediate / Expert / World-class), the engine plays the opponent's checker plays via the worker, and the game flows naturally (engine thinking state, opponent plays animated/visible, game end handled). The engine loading state from ticket 04 is surfaced in the Play area so the app shell is usable before the engine is ready.

**Blocked by:** 03 (playable board), 04 (gnubg engine worker).

**Status:** ready-for-agent

- [ ] A complete game vs the computer can be played at every difficulty
- [ ] The UI never blocks while the engine thinks; a thinking indicator shows
- [ ] Beginner is observably weaker than World-class over sampled positions (seeded test via the engine interface)
- [ ] Refreshing mid-game does not crash the app (resume itself lands in ticket 07)

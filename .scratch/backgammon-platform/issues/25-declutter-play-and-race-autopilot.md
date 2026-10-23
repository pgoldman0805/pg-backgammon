# 25: Declutter the game view; race autopilot button

**What to build:** Two Play-view changes (user request, spec stories 58–59):

1. **Declutter** (story 58): remove preference controls from the Play view — the Board style picker/chip and the auto-roll / auto-play switches disappear from BOTH the setup card and the in-game HUD (they live in Settings, which already shares the same stores). The Tutor mode toggle STAYS in-game (gameplay mode, switchable mid-match per story 14); Settings keeps the tutor-default preference. The settings themselves keep working exactly as before — only their Play-view UI goes. Point players somewhere discoverable: a small quiet "Settings" link on the setup card is acceptable (design call). Update the component tests that pinned the removed controls deliberately; HUD/setup layouts re-balance (the freed space should ease the short-landscape fit from ticket 24 — verify the landscape tier improves or at least holds).
2. **Race autopilot** (story 59): during a Race (rules `isRace`), the user's side gains a clearly-labeled autopilot button (e.g. "Finish race for me") in the turn controls. While active: the user's turns are played automatically — roll (reusing the race auto-roll path), then the engine's best play at FULL strength (never the opponent difficulty), paced and animated like the opponent's moves. It never answers cube decisions aimed at the user (an incoming double pauses autopilot and shows the normal dialog; after the response, autopilot resumes), never acts for the opponent, stops at game end (does not carry into the next game), and pressing the button again stops it immediately (mid-pacing abort via the existing liveness patterns). Takeback (Tutor mode) while autopilot is on: stopping autopilot is acceptable and simplest — document whichever you do. Works in hot-seat for whichever human is on roll? NO — scope to vs-computer only (hot-seat autopilot is nonsense; hide the button there). The stats note from story 59 goes in the ticket Comments verbatim: autopiloted plays are recorded as the user's and score near-zero error.

**Blocked by:** None (no other agents running).

**Status:** ready-for-agent

- [ ] Board style, auto-roll, and auto-play controls are gone from the Play view (setup + HUD) and remain fully functional via Settings; Tutor toggle unchanged in-game; affected tests updated deliberately
- [ ] Autopilot: activates only in a Race in vs-computer play; plays the user's turns at full strength, paced; pauses for incoming cubes and resumes; stops on second press, game end, or takeback; covered by controller unit tests (mirror autoplay.test.ts patterns) and component tests
- [ ] Short-landscape fit (ticket 24 tier) holds or improves with the slimmer HUD; audit captures refreshed where changed
- [ ] Full gauntlet green: `npm test`, lint, build, `npm run e2e`, `npm run e2e:audit`, `npm run e2e:pwa` — all run in the FOREGROUND and read

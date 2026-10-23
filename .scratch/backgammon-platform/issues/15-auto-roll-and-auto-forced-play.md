# 15: Auto-roll in races and auto-play of forced plays

**What to build:** Two friction-removing play settings (user request, spec stories 43–44), both persisted across reloads and toggleable from the Play area, both ON by default:

1. **Auto-roll in races**: when the position is a Race (see GLOSSARY) and it's the user's pre-roll, roll automatically instead of stopping at Double/Roll. While enabled, this knowingly skips the user's pre-roll doubling moment in races; turning the setting off restores the stop. Never auto-roll in contact positions, and never suppress the engine's incoming double or any cube dialog.
2. **Auto-play forced plays**: when the user's turn has exactly one legal play (Forced play), apply and commit it automatically, visibly (reuse the paced-movement presentation so the user sees what happened). Dance "Continue" stays a manual click so dances are never missed.

**Blocked by:** 09 (Tutor mode — both rework the same turn-flow surfaces; serialize to avoid conflicts).

**Status:** ready-for-agent

- [ ] In a race with auto-roll on, the user's turns proceed without Roll clicks; in contact positions the Double/Roll stop still appears; toggling off mid-game restores the stop
- [ ] Race detection is a pure rules-layer function with tests (no contact: no hitting possible for either player)
- [ ] A forced play auto-applies visibly and commits without user input; multi-option turns are untouched; dance still requires Continue
- [ ] Both settings persist across reloads and are discoverable in the Play area

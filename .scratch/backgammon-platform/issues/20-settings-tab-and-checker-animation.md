# 20: Settings tab and configurable checker animation

**What to build:** Two features (user request, spec stories 50–51):

1. **Settings tab**: a fifth navigation area collecting every controllable preference in one place:
   - Appearance: light/dark theme, Board style (reuse the existing picker component)
   - Play: auto-roll in races, auto-play forced plays, Tutor mode default for new matches (the in-game toggle still rules the live match), checker animation speed (item 2)
   - Data: history backup export/import (move the controls' home here from Analyze, or share one component used by both — implementer's call, but Settings must have them), storage usage note optional
   All settings use the existing shared stores (useStoredSwitch, theme, board style) so the in-context quick toggles on the Play setup card/HUD stay live and in sync. Keyboard accessible, both themes, tablet-clean.
2. **Checker-movement animation**: programmatic checker repositions animate as smooth travel between points (SVG transform transition or equivalent; a slight lift/arc is welcome if cheap and not janky). Speed setting: off / fast / normal / slow (off = instant, current behavior). Applies to the opponent's paced movements, auto-played forced plays, two-movement destination clicks, and the user's own click-to-move; dragging stays direct manipulation; takeback/undo repositions may animate fast or snap (implementer's judgment, consistent). The opponent/autoplay step pacing (currently fixed 450ms) derives from the same speed setting so "fast" genuinely feels fast end to end. `prefers-reduced-motion` defaults the setting to off (user can still override explicitly). No animation jank during drags; no test flakiness (tests run with animation off or use deterministic hooks).

**Blocked by:** None (no other agents running; full surface available).

**Status:** ready-for-agent

- [ ] Settings tab reachable from the nav with all listed settings functional, persisted, and bidirectionally in sync with existing in-context controls
- [ ] Checker travel animates at the selected speed across all listed programmatic move paths; off = instant; reduced-motion default honored; drag unaffected
- [ ] Opponent/autoplay pacing follows the speed setting
- [ ] Full gauntlet passes: `npm test`, lint, build, `npm run e2e`, `npm run e2e:audit` (audit extended with Settings captures at both widths/themes)

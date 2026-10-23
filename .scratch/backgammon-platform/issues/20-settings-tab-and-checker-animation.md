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

- [x] Settings tab reachable from the nav with all listed settings functional, persisted, and bidirectionally in sync with existing in-context controls
- [x] Checker travel animates at the selected speed across all listed programmatic move paths; off = instant; reduced-motion default honored; drag unaffected
- [x] Opponent/autoplay pacing follows the speed setting
- [x] Full gauntlet passes: `npm test`, lint, build, `npm run e2e`, `npm run e2e:audit` (audit extended with Settings captures at both widths/themes)

## Comments

**Settings page layout.** A fifth room in the shell's own language, not a form
dump: three titled sections (Appearance / Play / Data) under the 68ch measure,
each marked with the nav's board-point triangle in the accent green. A setting
is a row — name and one-line hint left, control right, hairline-separated;
rows stack at narrow widths. Theme and animation speed are pill radio groups
(the difficulty-pill vocabulary); the on/off settings are track-and-thumb
switches that spell out On/Off; the Board style picker is reused whole as a
full-width row. The backup controls moved into a shared `src/ui/BackupControls`
(own `backup.css`) used by Analyze and Settings; Analyze passes an `onImported`
callback to reload its ledger and close any open review.

**Theme store.** `useTheme` was a per-mount `useState`, so a second consumer
would have drifted; `src/theme.ts` is now a subscribable store (same pattern as
`boardStyles`) with the old hook API intact — the header toggle and the
Settings pills stay in sync both directions.

**Animation approach.** The Board cannot track checker identity (the rules
expose only counts), so instead of re-keying checkers it diffs consecutive
board props (`src/play/checkerTravel.ts` — pure, pip-ordered pairing of losses
to gains, hits yield the mover plus the blot-to-bar) and mounts short-lived
"traveler" `<g>` elements that glide via one inline CSS transform transition
each (compositor-driven; no per-frame React work). The checker that already
landed in the model hides (`visibility`) until its traveler retires on a
duration+80ms timer — robust where transitionend never fires (jsdom, throttled
windows). A scale keyframe on the inner group adds the subtle lift. Diffs
beyond 6 checkers (new game, far-apart resumes) snap; a drag's own drop sets a
suppress flag so it stays direct manipulation. Undo and small takebacks
animate at the current speed; a doubles takeback exceeds the cap and snaps.
Side effect worth knowing: Analyze's review board also animates when stepping
decisions (it shows what the play moved), and resuming a young match glides
the few moved checkers into place.

**Speed → duration/pacing mapping** (one setting drives both tempos):

| speed  | checker travel | opponent/autoplay step |
|--------|---------------|------------------------|
| off    | 0 (snap)      | 160ms                  |
| fast   | 120ms         | 250ms                  |
| normal | 250ms         | 450ms (the old fixed)  |
| slow   | 450ms         | 700ms                  |

Off keeps a minimal 160ms beat so multi-movement plays still read as a
sequence. `prefers-reduced-motion` makes the *default* off; any stored choice
wins. jsdom tests run under a reduced-motion matchMedia stub (`src/test/
setup.ts`), so vitest is animation-off by default and never timing-flaky.

**Automated vs human eyes.** Automated: 775 vitest tests (mapping and store as
pure logic; Board component test asserts the traveler + 120ms transition style
when enabled, none when off, and snap on big diffs), lint, build, e2e smoke,
e2e audit with `settings-{desktop,tablet}-{light,dark}` captures (no
horizontal scroll at tablet). Real-browser pass on the dev build: measured
Slow steps at 699ms with 450ms transitions, Fast at 260ms/120ms, Off at
~160-200ms with zero travelers; a hit produced two simultaneous travelers;
bar re-entry, click-to-move and the opponent's movements all traveled; an
OS-level drag dropped with zero travelers (suppression works). Caveat for
human eyes: the automation window was frame-throttled by Chrome (~3fps,
occluded display), so actual 60fps smoothness could not be visually graded
there — the mechanism (one compositor transition per traveler, no React
re-render per frame) is the standard smooth path, but a human glance at each
speed on a live screen is still worth a minute.

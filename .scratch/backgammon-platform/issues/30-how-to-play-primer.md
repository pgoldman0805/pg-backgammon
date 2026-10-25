# 30: How-to-play primer

**What to build:** A complete newcomer can learn the rules without leaving the app. A Learn/Help area (reachable from the nav, and surfaced on first run) walks through the goal, movement direction, hitting and the bar, bearing off, and what the doubling cube is — enough that a first-timer can confidently make their first move.

**Blocked by:** None (can start immediately). Lighter if ticket 32 (glossary & tooltips) lands first, so terms can link to definitions.

**Status:** done

- [x] A rules / how-to-play explanation is reachable from the main navigation
- [x] First run surfaces the primer (dismissible; never a hard block for returning users)
- [x] Coverage: objective, movement direction, hitting and bar re-entry, bearing off, and the cube — in plain language
- [x] Both themes, readable on phone; full gauntlet green

## Comments

Landed on `main` as impl `33e6c98`, merge `5ee96bc`. The primer (`HowToPlay.tsx`) leads the Learn area ahead of the glossary: five plain-language topics (goal; moving checkers + direction/dice; hitting and the bar + re-entry; bearing off; the cube), each with a small inline-SVG diagram in the board's point-triangle vocabulary, jargon linked via `GlossaryTerm`. A dismissible, non-blocking first-run strip (`FirstRunPrimerPrompt`, `role=note`) renders at the app shell — deliberately not on the Play setup card, to stay clear of the Tutor control. Its own flag `pg-backgammon.primer-seen`, independent of ticket 33's `has-played-before`. Verified green (897 tests, lint, build, e2e/audit/pwa) against the exact code now on main.

Note: the agent independently re-found and fixed the glossary-popover layout bug (closed popovers staying in layout, intercepting clicks / overflowing) — the same fix already on main as `bff001b`.


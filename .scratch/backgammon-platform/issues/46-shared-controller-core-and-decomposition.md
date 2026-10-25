# 46: Shared play-controller core and page decomposition

**What to build:** The play-flow controllers stop duplicating logic and the biggest pages become maintainable. The shared token, pacing, and liveness logic behind the opponent, autoplay, and race-autopilot controllers is extracted into one tested core, and the oversized Play and Analyze pages are split into coherent pieces — with no change in observable behavior.

**Blocked by:** 29 (difficulty-aware opponent cube) and 36 (human-textured difficulty) — both edit the controllers; refactor after they land to avoid rework.

**Status:** ready-for-agent

- [ ] The three controllers share one tested core; their observable behavior is unchanged
- [ ] Play and Analyze are decomposed into smaller units; all existing tests pass
- [ ] Pure refactor: no user-facing behavior change, verified by the existing gauntlet

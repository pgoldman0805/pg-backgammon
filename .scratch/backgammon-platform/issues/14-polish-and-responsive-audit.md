# 14: Visual polish and responsive audit

**What to build:** A coherence pass across the whole app once all pillars exist: consistent spacing/typography/color usage against the modern-minimal high-contrast direction, both themes audited on every screen, tablet-width layout verified for Play, Analyze (review), Puzzles, and Progress, keyboard accessibility for primary flows, and a final Playwright smoke test covering the golden path (start match → play → finish → review → drill a mined puzzle).

**Blocked by:** 09 (Tutor mode), 10 (import/export), 12 (blunder mining), 13 (progress view).

**Status:** ready-for-agent

- [ ] Every screen passes a both-themes, desktop + tablet visual audit (screenshots attached to the ticket)
- [ ] Golden-path Playwright smoke test passes headlessly
- [ ] No horizontal scroll or clipped board at tablet width anywhere
- [ ] Primary flows operable by keyboard

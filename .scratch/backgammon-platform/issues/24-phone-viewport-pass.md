# 24: Phone viewport pass — hamburger nav and mobile usability

**What to build:** The first dedicated phone-layout pass (spec story 57, user request). The PWA is installed on a real phone now; the app must be genuinely usable there.

1. **Hamburger navigation**: below a phone breakpoint (~640px; pick coherently with the existing 860px tablet tier), the five-tab nav collapses into a hamburger button opening a menu (slide-over or dropdown — design call): all five areas plus the theme toggle reachable, keyboard/screen-reader accessible (aria-expanded, focus trap or sane focus order, Escape closes), closes on navigation. The board-point triangle active marker survives in some form.
2. **Safe-area insets**: the installed standalone PWA must respect notches/system bars (`viewport-fit=cover` + `env(safe-area-inset-*)` padding on the header/edges) in both orientations.
3. **Touch targets**: interactive controls at phone widths hit ≥44px effective size (nav items, switches, pills, drill buttons, board-side turn controls). Audit and fix, don't rebuild.
4. **Per-area phone audit (portrait ~390px and landscape ~844×390)**: Browse/readability pass over Play setup, Analyze ledger + review, Puzzles browse/drill/reveal, Progress, Settings — no horizontal overflow, readable type, sane wrapping (the HUD, switch clusters, stat strips, equity table). Fix what fails.
5. **Board play on phones**: landscape is the play orientation — board + side controls must work at ~844×390. Portrait Play shows the board smaller with a subtle one-line rotate hint (dismissible or unobtrusive; never blocks play). No reflow redesign of the board itself in this ticket.
6. **Audit harness**: add a phone tier (portrait 390×844 and landscape 844×390) to `e2e/audit.spec.ts` captures and overflow assertions so phone stays enforced; refresh and commit captures.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] Hamburger nav at phone widths: all areas + theme reachable, accessible, closes on navigate; desktop/tablet nav unchanged
- [ ] Installed-PWA safe areas respected (viewport-fit cover + insets); no content under notches/bars in either orientation
- [ ] Phone-tier audit (portrait + landscape) added to the harness with zero horizontal overflow across all captured states; captures committed
- [ ] Landscape play works at 844×390 (a full turn: roll/move/commit reachable); portrait shows the rotate hint; full gauntlet green (`npm test`, lint, build, e2e, e2e:audit, e2e:pwa)

# 24: Phone viewport pass — hamburger nav and mobile usability

**What to build:** The first dedicated phone-layout pass (spec story 57, user request). The PWA is installed on a real phone now; the app must be genuinely usable there.

1. **Hamburger navigation**: below a phone breakpoint (~640px; pick coherently with the existing 860px tablet tier), the five-tab nav collapses into a hamburger button opening a menu (slide-over or dropdown — design call): all five areas plus the theme toggle reachable, keyboard/screen-reader accessible (aria-expanded, focus trap or sane focus order, Escape closes), closes on navigation. The board-point triangle active marker survives in some form.
2. **Safe-area insets**: the installed standalone PWA must respect notches/system bars (`viewport-fit=cover` + `env(safe-area-inset-*)` padding on the header/edges) in both orientations.
3. **Touch targets**: interactive controls at phone widths hit ≥44px effective size (nav items, switches, pills, drill buttons, board-side turn controls). Audit and fix, don't rebuild.
4. **Per-area phone audit (portrait ~390px and landscape ~844×390)**: Browse/readability pass over Play setup, Analyze ledger + review, Puzzles browse/drill/reveal, Progress, Settings — no horizontal overflow, readable type, sane wrapping (the HUD, switch clusters, stat strips, equity table). Fix what fails.
5. **Board play on phones**: landscape is the play orientation — board + side controls must work at ~844×390. Portrait Play shows the board smaller with a subtle one-line rotate hint (dismissible or unobtrusive; never blocks play). No reflow redesign of the board itself in this ticket.
6. **Audit harness**: add a phone tier (portrait 390×844 and landscape 844×390) to `e2e/audit.spec.ts` captures and overflow assertions so phone stays enforced; refresh and commit captures.

**Blocked by:** None.

**Status:** done

- [x] Hamburger nav at phone widths: all areas + theme reachable, accessible, closes on navigate; desktop/tablet nav unchanged
- [x] Installed-PWA safe areas respected (viewport-fit cover + insets); no content under notches/bars in either orientation
- [x] Phone-tier audit (portrait + landscape) added to the harness with zero horizontal overflow across all captured states; captures committed
- [x] Landscape play works at 844×390 (a full turn: roll/move/commit reachable); portrait shows the rotate hint; full gauntlet green (`npm test`, lint, build, e2e, e2e:audit, e2e:pwa)

## Comments

**Breakpoints.** Two named tiers, documented beside the menu styles in
`src/index.css`: tablet at 860px (the existing board-layout fold) and phone
at 640px (nav collapse + 44px touch sizing — the width every page already
used for its narrow fixes, so nothing new to learn). Landscape play got its
own tier, `(max-height: 480px) and (orientation: landscape)`, keyed on
height because 844px-wide phones land in the tablet width band: it keeps
`.play-layout` a row, hides the Play h1 visually, compacts the HUD, and
sizes the board from `100dvh` so roll → move → commit happens without the
board leaving view.

**The menu.** A full-width paper sheet dropping from under the header's
bottom rule — hairline rows, zero radius, no scrim, one soft shadow. The
active area carries the board-point triangle lying on its side at the row's
left rail; the last row is "Switch to dark theme". Button: aria-expanded +
aria-controls, Escape closes and refocuses it, navigation and outside taps
close it. Component tests cover open/contents/navigate/Escape/theme/outside
click; desktop and tablet headers render exactly as before.

**What the phone audit found and fixed** (automated overflow assertions
caught nothing — all of these were human-eyes findings from the captures):

- The setup/dialog banner overlay is taller than a phone-scale board and
  spilled over the header (it literally blocked the Menu button). At phone
  tiers the banner is flow content below the board; in short landscape the
  board drops to 52dvh while a banner is open so the card peeks above the
  fold.
- Settings rows: `.setting-copy`'s `flex-basis: 24ch` became ~200px of
  empty *height* once `.setting-row` went to column at ≤640px. Present on
  main for every ≤640px viewport; never caught because the audit's
  narrowest tier was 820px.
- Copy XGID's 44px touch minimum inflated the caption row and pushed the
  landscape board under the fold — exempted in the short-landscape tier
  only (it keeps 44px in portrait).
- Tutor mode's eval strip pushed the landscape board ~65px past the fold;
  the board now cedes that height.
- The menu's theme row said just "Dark" (the header's compact label) —
  now it says what it does.

**Deviations / judgment calls.**

- In short landscape the HUD switch pills (Tutor mode, autoplay, Board
  style) stay compact (~30px) rather than 44px: at 390px of height, 44px
  switch rows would push the board itself off-screen, and the ticket's
  hard target there is the turn controls, which are 44px. All controls are
  44px at portrait phone widths.
- With Tutor mode on in landscape the page can still scroll ~30px (the
  switch cluster wraps to two rows); the board + turn controls remain
  fully visible after one nudge, and the board never leaves view mid-turn.
- Two inherited breaks repaired en route: a duplicate `deploy` key in
  package.json failed `npm run lint`, and ticket 23's `npm run preview` →
  `wrangler dev` change broke Playwright's cold-start webServer command
  (wrangler rejects `--strictPort`); the config now serves dist via
  `vite preview` directly.
- No `orientation` field in the PWA manifest — portrait browsing stays
  free; landscape is encouraged by the rotate hint only.

**Automated vs human eyes.** The harness enforces zero horizontal overflow
at 390×844 and 844×390 (plus the open menu) forever; everything about
vertical fit, overlap, and readability above came from reviewing all 78
phone captures by eye.

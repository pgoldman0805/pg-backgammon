# 41: Board and analyze visual fixes

**What to build:** Three readability nits in the play and analyze surface are fixed: the eval bar reads as a position evaluation (not a loading/progress bar) with its number bound to it; the centered doubling cube no longer asserts "64" where it looks like a bug (hidden in no-doubling matches, or shown neutrally); and the Bosphorus Board style's gold action affordances and dark-mode felt are legible.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The eval bar is visually distinct from a progress indicator, and its value sits with it rather than stranded
- [x] No confusing "64" cube appears in no-doubling or early states
- [x] Bosphorus action highlights and dark-mode felt meet the training readability bar
- [x] Audit captures refreshed; full gauntlet green

## Comments

Implemented on branch `ticket/41-board-and-analyze-visual-fixes` (2026-10-25),
commit `a773242`. Lane held: only `src/play/Board.tsx`, `board.css`, and
`boardStyles.css` changed (plus a new `src/play/Board.test.tsx`); `Play.tsx`
untouched. How each fix works and what was verified:

- **Eval bar (#21)** — pure `board.css`. The `.eval-bar` no longer grows to
  fill the Tutor strip (`flex: 0 0 auto`) and the `.eval-track` is a bounded
  148px, 20px-tall, squared (5px radius) two-tone gauge instead of a
  full-width 12px pill. It reads as a position gauge — White's share over
  Black's, pivoting on the 50/50 accent tick — and the `48% · −0.05` caption
  now sits right beside it rather than stranded at the far right. The value is
  already bound to the fill width in `Play.tsx` (`width: ${percent}%`), so no
  Play.tsx edit was needed.
- **Doubling cube (#22)** — `Board.tsx` `CubeGlyph` + `board.css`. A centered,
  never-turned cube now renders the real current stake (`cube.value`, i.e. 1)
  at a quiet `opacity: 0.6` (`.cube--centered`) instead of the traditional
  "64" face that non-experts read as a bug. This covers every confusing state
  Board.tsx can see without match-length info: the 1-point / no-doubling
  match, the early centered state, and the cube-offered dialog (where the old
  "64" contradicted "Black doubles to 2"). The `centered at 1` aria-label is
  unchanged (Play.test.tsx depends on it); owned cubes still show their stake
  prominently on the owner's side.
- **Bosphorus (#23)** — `boardStyles.css`, scoped to
  `[data-board-style="bosphorus"]`. A dark `--bs-gold-halo` drop-shadow
  rim-lights every gold action affordance (selection ring, solid destination,
  bear-off tray) so it separates from the warm walnut felt; the ring gets a
  touch more weight (stroke-width 5); and the dashed two-move target is lifted
  from the 50%-mixed wash to the full `--board-gold-soft` tint plus the halo so
  its dashes read. The halo is deeper on the lifted dark felt.

Verification:

- `npm test` (992 passed, incl. new Board.test.tsx cube cases), `npm run lint`
  (clean), `npm run build` (ok), `npm run e2e` (smoke, 2 passed),
  `npm run e2e:audit` (passed), `npm run e2e:pwa` (2 passed) — all foreground.
- Visually reviewed the refreshed captures: `play-midgame-tutor-desktop`
  {light,dark}, `play-cube-dialog-desktop-light`, `board-style-bosphorus-
  desktop`{light,dark}. All three fixes confirmed by eye in both themes. The
  regenerated audit PNGs were intentionally NOT committed (per the PNG policy);
  they were refreshed and reviewed, then discarded, leaving the baselines.

Needs-human-eyes / notes:

- The resting centered cube shows "1" at 0.6 opacity. This departs from the
  physical-cube "64" convention that serious apps (XG, GNU) keep — a deliberate
  novice-clarity trade the ticket called for. If an expert-facing toggle is ever
  wanted, that is out of this ticket's scope.
- Board.tsx cannot distinguish a 1-point (never-doubling) match from a normal
  match's early centered state, so both get the same quiet "1" treatment rather
  than hiding the cube only in 1-point matches. Hiding specifically in 1-point
  matches would need a minimal additive `Play.tsx` edit (ticket 38's lane), so
  it was deliberately avoided; the neutral render satisfies the acceptance for
  all states.

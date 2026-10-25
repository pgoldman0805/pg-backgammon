# 44: Accessible modal dialogs

**What to build:** The cube, resign, game-over, and match-over dialogs are usable by keyboard and screen-reader users. Each is a proper modal: focus moves in and is trapped while open, Escape dismisses where non-destructive, focus restores on close, and assistive tech announces that a decision is required.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] These dialogs expose a dialog role and move, trap, and restore focus correctly
- [x] A keyboard-only user can resolve a cube or resign decision without the board stealing focus
- [x] Screen readers announce the dialog; the existing mouse/touch flow is unchanged
- [x] Full gauntlet green

## Comments

**Which dialogs:** The four `div.play-banner` overlays in `src/pages/Play.tsx`
that pose a decision or a result — the cube take/pass, the resign
accept/decline, the between-games game-over, and the match-over summary — now
render through one shared `PlayDialog` component. (The pre-match setup card is
also a `play-banner` but poses no decision over a live game, so it is left as
plain flow content and out of scope.) `PlayDialog` follows the restore-dialog
pattern ticket 27 established in `BackupControls`: `role="dialog"` +
`aria-modal="true"`, an accessible name via `aria-labelledby` pointing at the
card's title, and (for the three that have a decision/score line)
`aria-describedby` pointing at the line that states what is required — so a
screen reader announces, e.g., "Black doubles to 2 … Take to play on for 2
points, or pass to concede 1 point." The existing mouse/touch handlers are
untouched (Take/Pass/Accept/Decline/Next game/New match still dispatch the same
store actions); only the wrapping markup changed.

**Escape policy:** Escape dismisses only where a non-destructive default
exists. The cube take/pass dialog passes **no** `onDismiss` — a doubled player
must take or pass, there is no safe default, so Escape is inert. The resign
dialog maps Escape to **decline** (play on): declining is the status-quo answer
that loses nothing, giving a keyboard user a quick safe dismiss. Game-over and
match-over pass no `onDismiss` either — advancing to the next game / new match
is a deliberate acknowledgement and there is nothing non-destructive to dismiss
*to* (the overlay is the only place the forward action lives).

**Focus behavior:** On open, focus moves to the dialog card itself (tabIndex
-1) rather than a button, so assistive tech announces the dialog's name and
description before any affordance and no choice is pre-biased (notably never
pre-focusing a destructive option). While open, Tab is trapped: it wraps at the
first/last focusable control, and Tab/Shift+Tab from the container itself is
corralled to an end rather than escaping to the board behind the overlay. (The
board's checker buttons are only focusable while `interactive` — false in every
dialog phase — so they are already out of the tab order, which keeps the board
from stealing focus.) On close the component restores focus to whatever element
opened the dialog when it is still in the document; engine-initiated dialogs
(the cube) have no live opener, so focus returns to the body and the keyboard
user tabs forward into the now-current controls.

**Tests:** Component-only, in a new `src/pages/Play.dialogs.test.tsx`
(10 tests) — dialog role + name + described decision, Escape refusal on the
cube, Escape-declines on resign, the Tab trap wrapping both ends, a
keyboard-only take, focus restored to the opener, and the game-over/match-over
names + focus-in. No audit captures and no `e2e/audit.spec.ts` edits (ticket 45's
lane). Full gauntlet (test, lint, build, e2e, e2e:audit, e2e:pwa) green.

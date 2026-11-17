/**
 * Shared Playwright helpers: start a match from the setup card and play the
 * user's side to completion through the accessible board controls alone
 * (click-to-move: pick a highlighted origin, pick a highlighted destination).
 * Every choice is "the first legal option" — the point is reaching the end of
 * a real match, not playing well.
 */

import type { Page } from '@playwright/test';

export interface MatchSetup {
  /** Difficulty pill label, e.g. "Beginner". */
  readonly difficulty?: string;
  /** Match length option label, e.g. "1 point". */
  readonly length?: string;
  /** Switch Tutor mode on before starting. */
  readonly tutor?: boolean;
}

/** Configure the setup card and start a vs-computer match as White. */
export async function startComputerMatch(
  page: Page,
  {
    difficulty = 'Beginner',
    length = '1 point',
    tutor = false,
  }: MatchSetup = {},
): Promise<void> {
  await page.getByRole('radio', { name: difficulty }).check();
  await page.getByLabel('Match length').selectOption({ label: length });
  // Drive Tutor mode to exactly the requested state: a newcomer's first few
  // matches now open with it on by default (ticket 31), so a false here must
  // actively switch it off rather than assume it already is.
  const switchButton = page.getByRole('switch', { name: 'Tutor mode' });
  const tutorOn = (await switchButton.getAttribute('aria-checked')) === 'true';
  if (tutor !== tutorOn) {
    await switchButton.click();
  }
  await page.getByRole('button', { name: 'Play as White' }).click();
}

/** True when the given locator is visible right now (no waiting). */
async function visible(locator: ReturnType<Page['locator']>): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

/**
 * Advance the match by one user action if one is available. Returns true
 * when something was clicked. Clicks are allowed to miss (the engine moves
 * concurrently); the caller just loops.
 */
async function act(page: Page): Promise<boolean> {
  const click = async (locator: ReturnType<Page['locator']>) => {
    await locator.click({ timeout: 2_000 }).catch(() => {});
    return true;
  };

  // Dialogs first: an offered cube or resignation blocks everything else.
  const take = page.getByRole('button', { name: 'Take', exact: true });
  if (await visible(take)) {
    return click(take);
  }
  const accept = page.getByRole('button', { name: 'Accept', exact: true });
  if (await visible(accept)) {
    return click(accept);
  }
  // Between games.
  const nextGame = page.getByRole('button', { name: 'Next game' });
  if (await visible(nextGame)) {
    return click(nextGame);
  }
  // A dance resolves with Continue.
  const dance = page.getByRole('button', { name: 'Continue', exact: true });
  if (await visible(dance)) {
    return click(dance);
  }
  // Pre-roll stop (only when doubling is possible; otherwise it auto-rolls).
  const roll = page.getByRole('button', { name: 'Roll', exact: true });
  if (await visible(roll)) {
    return click(roll);
  }
  // A completed play commits.
  const commit = page.getByRole('button', { name: 'Commit play' });
  if (await commit.isEnabled({ timeout: 250 }).catch(() => false)) {
    return click(commit);
  }
  // A forced play resolves in one click when autoplay is off or paused.
  const forced = page.getByRole('button', { name: 'Play forced play' });
  if (await visible(forced)) {
    return click(forced);
  }
  // Engine hiccup: retry rather than time out.
  const retry = page.getByRole('button', { name: 'Retry' });
  if (await visible(retry)) {
    return click(retry);
  }
  // Otherwise move a checker.
  return moveOnce(page);
}

/**
 * Make one checker-movement step: select the first highlighted origin, or
 * take the selected origin's first destination. Activation goes through the
 * board's keyboard path (the SVG controls are focusable buttons), which is
 * exactly what the accessibility contract promises and is free of pointer
 * flake. Returns true when something was activated.
 */
export async function moveOnce(page: Page): Promise<boolean> {
  const dest = page
    .getByRole('button', { name: /^(Move to point|Bear off)/ })
    .first();
  if (await visible(dest)) {
    await dest.press('Enter', { timeout: 2_000 }).catch(() => {});
    return true;
  }
  const origin = page.getByRole('button', { name: /^Move from/ }).first();
  if (await visible(origin)) {
    await origin.press('Enter', { timeout: 2_000 }).catch(() => {});
    return true;
  }
  return false;
}

/** Play the current match until "… wins the match …" (the match-over card). */
export async function playUntilMatchOver(
  page: Page,
  timeoutMs = 300_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const over = page.getByText(/wins the match/).first();
  while (Date.now() < deadline) {
    if (await visible(over)) {
      return;
    }
    if (!(await act(page))) {
      // Nothing for the user to do: the engine is thinking or animating.
      await page.waitForTimeout(250);
    }
  }
  throw new Error(`The match did not finish within ${timeoutMs} ms.`);
}

/**
 * Play a remote match from both seats until "wins the match" shows on both
 * pages. Each round gives each page one action if it has one (the same
 * first-legal-option choices as `act`; doubles are taken, nothing ever
 * doubles or resigns). Auto-roll and auto forced plays make controls appear
 * and vanish on their own, so a missed click is harmless — the loop just
 * comes round again. Capped by rounds as well as time.
 */
export async function playRemoteUntilMatchOver(
  white: Page,
  black: Page,
  timeoutMs = 300_000,
  maxRounds = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const pages = [white, black];
  const isOver = (page: Page) =>
    visible(page.getByText(/wins the match/).first());
  for (let round = 0; round < maxRounds && Date.now() < deadline; round++) {
    const over = await Promise.all(pages.map(isOver));
    if (over.every(Boolean)) {
      return;
    }
    let acted = false;
    for (const [index, page] of pages.entries()) {
      if (!over[index] && (await act(page))) {
        acted = true;
      }
    }
    if (!acted) {
      // Neither side can act: a move is in flight or animating.
      await white.waitForTimeout(50);
    }
  }
  throw new Error(
    `The remote match did not finish within ${timeoutMs} ms / ${maxRounds} rounds.`,
  );
}

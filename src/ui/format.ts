/**
 * Shared display formatters for the UI areas (Play, Analyze, Puzzles,
 * Progress, the board): the player names and the equity/error-rate texts the
 * pages previously each kept a private copy of.
 */

import type { Player } from '../rules';

/** "White" / "Black" — a player's display name. */
export function playerName(player: Player): string {
  return player === 'white' ? 'White' : 'Black';
}

/**
 * XG-style PR (performance rating) from an EMG error rate: the equity lost per
 * unforced decision scaled by 500, the convention serious players calibrate
 * in. Stored analysis stays in EMG; this is display only. Lower is better.
 */
export function errorRatePr(errorRate: number): number {
  return errorRate * 500;
}

/** PR for display, to one decimal. Lower is better. */
export function prText(errorRate: number): string {
  return errorRatePr(errorRate).toFixed(1);
}

/**
 * The familiar skill band a PR falls in, so the number is interpretable to
 * anyone from the wider backgammon world. Bands are the PR ranges players
 * recognise; each boundary sits on the lower (better) side. Lower is better.
 */
export function skillBand(errorRate: number): string {
  const pr = errorRatePr(errorRate);
  if (pr < 5) {
    return 'World-class';
  }
  if (pr < 8) {
    return 'Expert';
  }
  if (pr < 13) {
    return 'Advanced';
  }
  if (pr < 20) {
    return 'Intermediate';
  }
  return 'Beginner';
}

/** A signed equity, minus sign included. */
export function signedEquityText(value: number, digits = 3): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(digits)}`;
}

/**
 * An equity loss for lists and tables: an em dash when nothing was lost
 * (below the 0.0005 display threshold — it would print as −0.000), the
 * loss with a minus sign otherwise.
 */
export function lossText(loss: number): string {
  return loss < 0.0005 ? '—' : `−${loss.toFixed(3)}`;
}

/**
 * A byte count for people: plain bytes under a kilobyte, otherwise KB/MB/GB
 * (base 1024) to one decimal. Used for the storage-usage figure in Settings
 * (ticket 26).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

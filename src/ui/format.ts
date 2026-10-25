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

/** Error rate for display: thousandths of a point per decision. */
export function rateText(errorRate: number): string {
  return (errorRate * 1000).toFixed(1);
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

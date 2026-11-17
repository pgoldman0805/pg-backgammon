/**
 * The one place that knows which side of a stored match is the user's.
 * Progress, blunder mining and the Analyze wording all ask here instead of
 * assuming White: a vs-computer match is always played by White, a remote
 * match by whichever seat this device held, and every other mode (hot-seat,
 * imported, unknown) has no single user side.
 */

import type { Player } from '../rules';
import type { MatchConfig } from './types';

/** The user's colour in a stored match, or null when there is no single one. */
export function userSide(config: MatchConfig): Player | null {
  if (config.mode === 'computer') {
    return 'white';
  }
  if (config.mode === 'remote') {
    const side: unknown = config.localSide;
    return side === 'white' || side === 'black' ? side : null;
  }
  return null;
}

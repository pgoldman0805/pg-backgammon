/**
 * Decides when a ready service-worker update may reload the page (ticket 47).
 * `registerType: 'autoUpdate'` reloads unprompted, which during a live match
 * can reload inside the 250 ms save debounce and clip the last move. This gate
 * applies the update immediately when nothing is at stake, but defers the
 * reload while a match is in progress and applies it the moment the match ends
 * (the player finishes or leaves the board), so a deploy never interrupts play.
 */

export interface UpdateGateSignal {
  /** Is a match in progress right now? (the live-match storage flag) */
  isMatchInProgress(): boolean;
  /** Watch for changes to that flag within this tab; returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
}

export interface UpdateGate {
  /** A new service worker is waiting: apply now, or defer past the live match. */
  onUpdateReady(apply: () => void): void;
}

export function createUpdateGate(signal: UpdateGateSignal): UpdateGate {
  return {
    onUpdateReady(apply) {
      if (!signal.isMatchInProgress()) {
        apply();
        return;
      }
      // Defer: apply the update the first time the match is no longer live.
      const unsubscribe = signal.subscribe(() => {
        if (!signal.isMatchInProgress()) {
          unsubscribe();
          apply();
        }
      });
    },
  };
}

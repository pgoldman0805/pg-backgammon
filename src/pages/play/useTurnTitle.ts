/**
 * Flag the browser tab while it is the player's turn in a remote game, so a
 * backgrounded tab says so. The original title comes back when the turn
 * passes or the page goes away.
 */

import { useEffect } from 'react';

export function useTurnTitle(myTurn: boolean): void {
  useEffect(() => {
    if (!myTurn) {
      return;
    }
    const base = document.title;
    document.title = `Your turn - ${base}`;
    return () => {
      document.title = base;
    };
  }, [myTurn]);
}

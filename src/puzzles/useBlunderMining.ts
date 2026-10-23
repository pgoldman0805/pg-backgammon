/**
 * App-shell wiring for blunder mining (ticket 12): one hook call keeps the
 * shared miner observing analysis persistence for the app's lifetime and
 * sweeps already-analyzed history once on mount, so pre-existing matches gain
 * puzzles without user action. The service swallows every failure.
 */

import { useEffect } from 'react';
import { getBlunderMiningService } from './miningInstance';

export function useBlunderMining(): void {
  useEffect(() => {
    // The shared service subscribes on creation and stays alive across
    // route changes; catch-up covers whatever it was not around to observe.
    void getBlunderMiningService().catchUp();
  }, []);
}

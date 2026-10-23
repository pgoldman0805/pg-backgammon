/**
 * React wiring for background auto-analysis on the Play page: one additive
 * hook call keeps an observer alive around the current store (recreated when
 * the store is replaced on resume, like useMatchPersistence). The observer
 * never dispatches into the store and never blocks play.
 */

import { useEffect } from 'react';
import type { MatchStorage, MatchStoreLike } from '../storage';
import type { MatchAnalyzer } from './analyzer';
import { createAutoAnalysis } from './autoAnalysis';
import { getMatchAnalyzer } from './instance';

export function useAutoAnalysis(
  store: MatchStoreLike,
  storage: MatchStorage,
  analyzer?: MatchAnalyzer,
): void {
  useEffect(() => {
    const auto = createAutoAnalysis({
      store,
      storage,
      analyzer: analyzer ?? getMatchAnalyzer(),
    });
    return () => auto.dispose();
  }, [store, storage, analyzer]);
}

/**
 * The app-wide shared analyzer: one MatchAnalyzer over the Play area's shared
 * engine instance (ADR-0001: one engine, two roles), so background analysis,
 * review-on-open and deepening all share one gate, one cache and one worker.
 */

import { getPlayEngine } from '../play/engineInstance';
import { createMatchAnalyzer, type MatchAnalyzer } from './analyzer';

let shared: MatchAnalyzer | null = null;

export function getMatchAnalyzer(): MatchAnalyzer {
  if (!shared) {
    shared = createMatchAnalyzer({ engine: getPlayEngine() });
  }
  return shared;
}

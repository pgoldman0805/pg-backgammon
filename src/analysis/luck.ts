/**
 * Luck / variance (GLOSSARY "Luck"): how kindly the dice fell, measured apart
 * from how well they were played. For one of a side's rolls the luck is the
 * best-play equity the actual roll yielded minus the position's pre-roll
 * equity — the engine's expectation over every roll it might have thrown. A
 * positive figure means the roll beat an average roll; summed over a side's
 * rolls it reads as "the dice were worth +N equity to me this game".
 *
 * This is the standard luck decomposition (gnubg): realized minus expected,
 * both on one cubeful EMG scale. The expected term is a single position
 * evaluation — the engine already integrates over the 21 possible rolls — so
 * luck rides the existing analysis at the cost of one evaluate per roll, and
 * the realized term reuses the ranking the review already computed.
 */

import type { Engine, EnginePosition } from '../engine/types';

/**
 * The luck of the roll just played from `position`: its best-play equity
 * (`actualBestEquity`, already found by the review) minus the pre-roll
 * expectation the engine assigns the position. Both are cubeful EMG from the
 * on-roll player's perspective, so a positive result is a lucky roll.
 */
export async function rollLuck(
  engine: Engine,
  position: EnginePosition,
  actualBestEquity: number,
): Promise<number> {
  const evaluated = await engine.evaluate(position);
  return actualBestEquity - evaluated.cubefulEquity;
}

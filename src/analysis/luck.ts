/**
 * Luck / variance (GLOSSARY "Luck"): how kindly the dice fell, measured apart
 * from how well they were played. For one of a side's rolls the luck is the
 * best-play equity the actual roll yielded minus the probability-weighted
 * average best-play equity over every roll possible from that same position —
 * the equity the dice handed over versus an average roll. A positive figure
 * means the roll beat the average; summed over a side's rolls it reads as
 * "the dice were worth +N equity to me this game".
 *
 * Pure over the engine seam, like the rest of the analyzer: the realized term
 * reuses the ranking the review already computed, so only the other rolls of
 * the baseline cost a fresh engine call.
 */

import type { Engine, EnginePosition } from '../engine/types';
import { type DiceRoll, type Die, opponent } from '../rules';

function buildRolls(includeDoubles: boolean): DiceRoll[] {
  const rolls: DiceRoll[] = [];
  for (let high = 1; high <= 6; high++) {
    for (let low = 1; low <= high; low++) {
      if (!includeDoubles && high === low) {
        continue;
      }
      rolls.push([high as Die, low as Die]);
    }
  }
  return rolls;
}

/** The 21 distinct rolls (order within a roll is immaterial). */
export const ALL_ROLLS: readonly DiceRoll[] = buildRolls(true);

/** The 15 non-double rolls — the opening roll can never be a double. */
export const OPENING_ROLLS: readonly DiceRoll[] = buildRolls(false);

/** Chance of a roll out of the 36 ordered outcomes: 1 for a double, else 2. */
export function rollWeight(roll: DiceRoll): number {
  return roll[0] === roll[1] ? 1 : 2;
}

/** Whether two rolls are the same pair, regardless of die order. */
function sameRoll(a: DiceRoll, b: DiceRoll): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

/**
 * The best achievable equity for `roll` from `position` (on-roll player's
 * perspective). A roll with no legal play is a dance: its value is the
 * unchanged position handed to the opponent, i.e. the negated evaluation of
 * the opponent on roll.
 */
export async function bestRollEquity(
  engine: Engine,
  position: EnginePosition,
  roll: DiceRoll,
): Promise<number> {
  const ranked = await engine.rankPlays(position, roll);
  if (ranked.length > 0) {
    return ranked[0].equity;
  }
  const evaluated = await engine.evaluate({
    ...position,
    onRoll: opponent(position.onRoll),
  });
  return -evaluated.cubefulEquity;
}

/**
 * The luck of `actualRoll` from `position`: its best-play equity (passed in as
 * `actualBestEquity`, already computed by the review) minus the weighted
 * average best-play equity over `rolls`. `rolls` defaults to all 21; pass
 * {@link OPENING_ROLLS} for the opening, which excludes doubles.
 */
export async function rollLuck(
  engine: Engine,
  position: EnginePosition,
  actualRoll: DiceRoll,
  actualBestEquity: number,
  rolls: readonly DiceRoll[] = ALL_ROLLS,
): Promise<number> {
  let weighted = 0;
  let weight = 0;
  for (const roll of rolls) {
    const equity = sameRoll(roll, actualRoll)
      ? actualBestEquity
      : await bestRollEquity(engine, position, roll);
    weighted += rollWeight(roll) * equity;
    weight += rollWeight(roll);
  }
  return actualBestEquity - weighted / weight;
}

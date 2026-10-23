/**
 * Cube-decision costing (GLOSSARY "Cube decision", "Error"): pure functions
 * from the engine's cube analysis — the three cubeful equities, all from the
 * doubler's perspective — to the equity lost by what actually happened.
 *
 * The doubler's optimal stake is min(take, pass): the opponent answers with
 * whichever response is worse for the doubler. Doubling is right exactly when
 * that beats rolling with the cube unturned.
 */

import type { CubeAnalysis } from '../engine/types';

/** The three cubeful equities, doubler's perspective. */
export interface CubeEquities {
  readonly noDouble: number;
  readonly doubleTake: number;
  readonly doublePass: number;
}

export type CubeError =
  | 'missed-double'
  | 'wrong-double'
  | 'wrong-take'
  | 'wrong-pass';

export interface CubeCost {
  readonly error: CubeError | null;
  /** EMG equity given up versus the best available choice (>= 0). */
  readonly equityLoss: number;
}

const NO_DOUBLE_RE = /^no (re)?double/i;
const TAKE_RE = /(, take$)|(^(take|accept)$)/i;
const PASS_RE = /(, pass$)|(^(pass|reject)$)/i;

function find(analysis: CubeAnalysis, pattern: RegExp, label: string): number {
  const option = analysis.options.find((o) => pattern.test(o.action.trim()));
  if (!option) {
    throw new Error(
      `cube analysis has no "${label}" option: ` +
        analysis.options.map((o) => o.action).join(', '),
    );
  }
  return option.equity;
}

/** Extract the no-double / double-take / double-pass cubeful equities. */
export function cubeEquities(analysis: CubeAnalysis): CubeEquities {
  return {
    noDouble: find(analysis, NO_DOUBLE_RE, 'no double'),
    doubleTake: find(analysis, TAKE_RE, 'double, take'),
    doublePass: find(analysis, PASS_RE, 'double, pass'),
  };
}

/** What doubling actually earns once the opponent answers optimally. */
function doubleValue(equities: CubeEquities): number {
  return Math.min(equities.doubleTake, equities.doublePass);
}

/** Cost the player's double-or-roll choice at a pre-roll moment. */
export function costDoubleDecision(
  equities: CubeEquities,
  doubled: boolean,
): CubeCost {
  const chosen = doubled ? doubleValue(equities) : equities.noDouble;
  const best = Math.max(equities.noDouble, doubleValue(equities));
  const equityLoss = Math.max(0, best - chosen);
  if (equityLoss === 0) {
    return { error: null, equityLoss: 0 };
  }
  return { error: doubled ? 'wrong-double' : 'missed-double', equityLoss };
}

/** Cost the opponent's take-or-pass answer to a double. */
export function costCubeResponse(
  equities: CubeEquities,
  response: 'take' | 'pass',
): CubeCost {
  // Equities are the doubler's: the responder keeps them as low as possible.
  const chosen =
    response === 'take' ? equities.doubleTake : equities.doublePass;
  const equityLoss = Math.max(0, chosen - doubleValue(equities));
  if (equityLoss === 0) {
    return { error: null, equityLoss: 0 };
  }
  return {
    error: response === 'take' ? 'wrong-take' : 'wrong-pass',
    equityLoss,
  };
}

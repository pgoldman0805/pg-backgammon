/**
 * The postMessage protocol between the engine client and its Web Worker.
 * Requests carry a correlation id; the worker answers each with exactly one
 * response. All payloads are structured-clone-safe.
 */

import type { DiceRoll } from '../rules';
import type {
  CubeInfoOptions,
  EnginePosition,
  RankPlaysOptions,
} from './types';

export type EngineRequest =
  | { readonly id: number; readonly kind: 'initialize' }
  | {
      readonly id: number;
      readonly kind: 'evaluate';
      readonly position: EnginePosition;
    }
  | {
      readonly id: number;
      readonly kind: 'rankPlays';
      readonly position: EnginePosition;
      readonly roll: DiceRoll;
      readonly options?: RankPlaysOptions;
    }
  | {
      readonly id: number;
      readonly kind: 'cubeInfo';
      readonly position: EnginePosition;
      readonly options?: CubeInfoOptions;
    };

export type EngineResponse =
  | { readonly id: number; readonly ok: true; readonly result: unknown }
  | { readonly id: number; readonly ok: false; readonly error: string };

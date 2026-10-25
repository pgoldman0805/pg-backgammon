/**
 * The gnubg command protocol, bound to a synchronous RunCommand channel
 * (`Module._run_command` under the hood). The session treats gnubg as a
 * stateless position oracle: every query re-establishes the position from
 * scratch, because gnubg caches hint analysis by position+dice regardless of
 * evaluation settings (verified against the vendored build).
 *
 * Game flow stays in src/rules; only evaluation questions come here.
 */

import type { DiceRoll, Play } from '../rules';
import { applyMovement, legalPlays } from '../rules';
import {
  applyCubeDifficulty,
  applyDifficultyNoise,
  DIFFICULTY_SETTINGS,
} from './difficulty';
import { applyMoveText, boardKey } from './moveText';
import { parseCubeAnalysis, parseEvalOutput, parseHintMoves } from './parse';
import type {
  CubeAnalysis,
  CubeInfoOptions,
  EnginePosition,
  PositionEvaluation,
  RankedPlay,
  RankPlaysOptions,
} from './types';
import { encodeXgid } from './xgid';

/** Run one gnubg command; the returned lines are everything it printed. */
export type RunCommand = (command: string) => readonly string[];

/** Full-strength analysis settings (ADR-0001 ground truth). */
const FULL_STRENGTH = { plies: 2, noise: 0 } as const;

/** On-demand deepening: 3-ply, bounded by the ply-3 move filters below. */
const DEEP = { plies: 3, noise: 0 } as const;

const INIT_COMMANDS = [
  'set confirm new off',
  'set confirm save off',
  'set output mwc off',
  'set automatic game off',
  'set automatic roll off',
  'set player 0 human',
  'set player 1 human',
  'set jacoby off',
  // The build's default move filters pass no moves to the deeper-ply stage;
  // without this, "2-ply" hints silently stay at 0-ply (verified).
  'set evaluation movefilter 2 0 8 8 0.16',
  // Deep (3-ply) analysis: a generous 0-ply gate, then at most 4 moves get
  // the full 3-ply treatment — bounded, as the spec demands (no rollouts).
  'set evaluation movefilter 3 0 8 8 0.16',
  'set evaluation movefilter 3 1 -1 0 0',
  'set evaluation movefilter 3 2 2 2 0.04',
  'set evaluation cubedecision evaluation plies 2',
  'new match 1',
] as const;

export interface GnubgSession {
  evaluate(position: EnginePosition): PositionEvaluation;
  rankPlays(
    position: EnginePosition,
    roll: DiceRoll,
    options?: RankPlaysOptions,
  ): RankedPlay[];
  cubeInfo(position: EnginePosition, options?: CubeInfoOptions): CubeAnalysis;
}

function playFinalKey(position: EnginePosition, play: Play): string {
  let board = position.board;
  for (const movement of play.movements) {
    board = applyMovement(board, position.onRoll, movement);
  }
  return boardKey(board);
}

export function createGnubgSession(run: RunCommand): GnubgSession {
  for (const command of INIT_COMMANDS) {
    run(command);
  }

  function preparePosition(
    position: EnginePosition,
    roll: DiceRoll | undefined,
    plies: number,
  ): string {
    run(`set evaluation chequerplay evaluation plies ${plies}`);
    run('set evaluation chequerplay evaluation noise 0');
    run('clear hint');
    run('new match 1');
    const xgid = encodeXgid(position, roll);
    const response = run(`set xgid ${xgid}`);
    const rejection = response.find((line) =>
      /not a valid xgid|illegal/i.test(line),
    );
    if (rejection) {
      throw new Error(`engine rejected position "${xgid}": ${rejection}`);
    }
    return xgid;
  }

  return {
    rankPlays(position, roll, options) {
      const settings = options?.difficulty
        ? DIFFICULTY_SETTINGS[options.difficulty]
        : options?.effort === 'deep'
          ? DEEP
          : FULL_STRENGTH;

      const legal = legalPlays(position.board, position.onRoll, roll);
      if (legal.length === 0) {
        return [];
      }
      const byFinalBoard = new Map<string, Play>();
      for (const play of legal) {
        byFinalBoard.set(playFinalKey(position, play), play);
      }

      const xgid = preparePosition(position, roll, settings.plies);
      const lines = run('hint 1000');
      const parsed = parseHintMoves(lines);
      if (parsed.length === 0) {
        throw new Error(
          `engine returned no plays for "${xgid}":\n${lines.join('\n')}`,
        );
      }

      const ordered =
        settings.noise > 0
          ? applyDifficultyNoise(parsed, settings.noise, xgid)
          : [...parsed];
      const bestEquity = ordered[0].equity;

      return ordered.map((move, index) => {
        const key = boardKey(
          applyMoveText(position.board, position.onRoll, move.moveText),
        );
        const play = byFinalBoard.get(key);
        if (!play) {
          throw new Error(
            `engine play "${move.moveText}" matches no legal play for ` +
              `${position.onRoll} rolling ${roll[0]}-${roll[1]}`,
          );
        }
        return {
          rank: index + 1,
          play,
          moveText: move.moveText,
          equity: move.equity,
          equityLoss: Math.max(0, bestEquity - move.equity),
          chances: move.chances,
        };
      });
    },

    evaluate(position) {
      const xgid = preparePosition(position, undefined, 0);
      const lines = run('eval');
      const rows = parseEvalOutput(lines);
      const row = rows.find((r) => r.plies === 2) ?? rows.at(-1);
      if (!row) {
        throw new Error(
          `engine returned no evaluation for "${xgid}":\n${lines.join('\n')}`,
        );
      }
      return {
        plies: row.plies,
        equity: row.equity,
        cubefulEquity: row.cubefulEquity,
        chances: row.chances,
      };
    },

    cubeInfo(position, options) {
      // A weakened difficulty keeps the full-strength cube evaluation and
      // perturbs it afterwards (seeded, reproducible), so Expert/World-class
      // and every analysis call stay engine-correct; effort is ignored then.
      const noise = options?.difficulty
        ? DIFFICULTY_SETTINGS[options.difficulty].noise
        : 0;
      const plies =
        !options?.difficulty && options?.effort === 'deep'
          ? DEEP.plies
          : FULL_STRENGTH.plies;
      run(`set evaluation cubedecision evaluation plies ${plies}`);
      const xgid = preparePosition(position, undefined, 0);
      const analysis = parseCubeAnalysis(run('hint'));
      return noise > 0 ? applyCubeDifficulty(analysis, noise, xgid) : analysis;
    },
  };
}

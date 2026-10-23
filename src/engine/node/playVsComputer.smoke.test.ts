// @vitest-environment node
/**
 * Play-vs-computer smoke against the real vendored gnubg WASM (tickets 05/06):
 * engine opponents drive the match store with real engine answers for a few
 * plies — checker plays via rankPlays and pre-roll cube checks via cubeInfo
 * with match context — proving the store/opponent/engine wiring against
 * reality. The fast, deterministic flow coverage lives in
 * src/play/opponent.test.ts against the fake engine.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  createEngineOpponent,
  recommendsDouble,
  recommendsPass,
} from '../../play/opponent';
import { createPlayStore } from '../../play/store';
import type { DiceRoll, Player } from '../../rules';
import { createSeededDice, initialBoard } from '../../rules';
import type { GnubgSession } from '../session';
import type { Engine, EnginePosition } from '../types';
import { loadGnubgSession } from './loadGnubg';

const OPENING: EnginePosition = {
  board: initialBoard(),
  onRoll: 'white',
  match: { matchLength: 7, score: { white: 0, black: 0 } },
};

let session: GnubgSession;

beforeAll(async () => {
  session = await loadGnubgSession();
}, 120_000);

/** The async Engine seam over the synchronous Node-loaded session. */
function engineOverSession(): Engine {
  return {
    status: 'ready',
    onStatusChange: () => () => {},
    initialize: () => Promise.resolve(),
    evaluate: (position) => Promise.resolve(session.evaluate(position)),
    rankPlays: (position, roll, options) =>
      Promise.resolve(session.rankPlays(position, roll, options)),
    cubeInfo: (position) => Promise.resolve(session.cubeInfo(position)),
    dispose: () => {},
  };
}

function waitUntil(predicate: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (predicate()) {
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        reject(new Error('timed out waiting for the game to advance'));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

describe('play vs computer with the real engine', () => {
  it('two engine opponents play several plies of a match through the store', async () => {
    const store = createPlayStore({ dice: createSeededDice(11) });
    const engine = engineOverSession();
    const opponents = (['white', 'black'] as Player[]).map((player) =>
      createEngineOpponent({
        store,
        engine,
        player,
        difficulty: 'expert',
        pace: () => Promise.resolve(),
        stepMs: 0,
      }),
    );
    store.dispatch({ type: 'start', length: 7 });

    const plies = 6;
    await waitUntil(() => {
      const match = store.getState().match;
      return (
        match !== null &&
        (match.game.record.plays.length >= plies ||
          match.phase === 'game-over' ||
          match.phase === 'match-over')
      );
    }, 90_000);

    for (const opponent of opponents) {
      expect(opponent.getState().error).toBeNull();
      opponent.dispose();
    }

    const match = store.getState().match;
    // The store accepts only complete legal plays, so reaching this depth —
    // through the pre-roll cube checks — proves every engine answer mapped
    // onto a legal rules-engine action.
    expect(match?.game.record.plays.length).toBeGreaterThanOrEqual(plies);
    const players = new Set(
      match?.game.record.plays.map((play) => play.player),
    );
    expect(players).toEqual(new Set(['white', 'black']));
  }, 120_000);

  it('real cube info speaks the proper-action vocabulary the opponent parses', () => {
    // The opening position is nobody's double; the engine must neither
    // recommend turning the cube nor passing it.
    const analysis = session.cubeInfo(OPENING);
    expect(analysis.properAction.length).toBeGreaterThan(0);
    expect(recommendsDouble(analysis.properAction)).toBe(false);
    expect(recommendsPass(analysis.properAction)).toBe(false);
  }, 120_000);

  it('beginner picks measurably weaker plays than world-class (seeded)', () => {
    const rolls: readonly DiceRoll[] = [
      [3, 1],
      [6, 1],
      [5, 2],
      [4, 3],
    ];
    let lossAtTruth = 0;
    let deviations = 0;
    for (const roll of rolls) {
      // World-class (clean 2-ply) ranks the candidates as ground truth...
      const truth = session.rankPlays(OPENING, roll, {
        difficulty: 'world-class',
      });
      // ...and by definition plays its own top choice: zero equity given up.
      expect(truth[0].equityLoss).toBe(0);

      // Beginner's noisy pick, scored against the world-class ranking.
      const noisy = session.rankPlays(OPENING, roll, {
        difficulty: 'beginner',
      });
      const pick = truth.find((p) => p.moveText === noisy[0].moveText);
      expect(pick).toBeDefined();
      lossAtTruth += pick?.equityLoss ?? 0;
      if (noisy[0].moveText !== truth[0].moveText) {
        deviations++;
      }
    }
    expect(deviations).toBeGreaterThan(0);
    expect(lossAtTruth).toBeGreaterThan(0);
  }, 120_000);
});

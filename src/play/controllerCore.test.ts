/**
 * The shared play-controller core: the decision-token, liveness, takeback and
 * pacing primitives the engine opponent, autoplay and race-autopilot
 * controllers all build on. These are the pure building blocks; the
 * controllers' own suites prove the behavior they assemble from them is
 * unchanged.
 */

import { describe, expect, it } from 'vitest';
import {
  createBoard,
  createGame,
  createMatch,
  type MatchState,
} from '../rules';
import { scriptedDice } from '../test/dice';
import {
  DEFAULT_STEP_MS,
  defaultPace,
  gameLive,
  isTakeback,
  matchForToken,
  resolvePacing,
  sameToken,
  tokenFor,
} from './controllerCore';
import { createPlayStore, type PlayStore } from './store';

/** A store at black's turn to play 3-1 from the standard opening. */
function openingStore(): PlayStore {
  return createPlayStore({
    match: createMatch({
      length: 7,
      game: createGame({
        board: createBoard({
          white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
          black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
        }),
        player: 'black',
        roll: [3, 1],
      }),
    }),
  });
}

function openingMatch(): MatchState {
  const match = openingStore().getState().match;
  if (!match) {
    throw new Error('expected a match');
  }
  return match;
}

describe('tokenFor', () => {
  it('captures the phase, the plays record identity and the decision count', () => {
    const match = openingMatch();
    const token = tokenFor(match);
    expect(token.phase).toBe(match.phase);
    expect(token.plays).toBe(match.game.record.plays);
    expect(token.decisions).toBe(match.decisions.length);
  });
});

describe('sameToken', () => {
  const plays: MatchState['game']['record']['plays'] = [];
  const base = { phase: 'turn' as const, plays, decisions: 0 };

  it('is true for tokens with matching phase, plays identity and count', () => {
    expect(sameToken(base, { ...base })).toBe(true);
  });

  it('is false when the phase differs', () => {
    expect(sameToken(base, { ...base, phase: 'pre-roll' })).toBe(false);
  });

  it('is false when the plays record is a different array', () => {
    expect(sameToken(base, { ...base, plays: [] })).toBe(false);
  });

  it('is false when the decision count differs', () => {
    expect(sameToken(base, { ...base, decisions: 1 })).toBe(false);
  });

  it('is false when either token is null', () => {
    expect(sameToken(null, base)).toBe(false);
    expect(sameToken(base, null)).toBe(false);
    expect(sameToken(null, null)).toBe(false);
  });
});

describe('matchForToken', () => {
  it('returns the live match while its token still matches', () => {
    const store = openingStore();
    const match = store.getState().match as MatchState;
    expect(matchForToken(store, tokenFor(match))).toBe(match);
  });

  it('returns null once the store has moved past the token', () => {
    const store = openingStore();
    const stale = tokenFor(store.getState().match as MatchState);
    // A fresh game replaces the plays record, so the captured token is dead.
    store.dispatch({ type: 'start', length: 3 });
    expect(matchForToken(store, stale)).toBeNull();
  });

  it('returns null when the store holds no match', () => {
    const token = tokenFor(openingMatch());
    const empty = createPlayStore();
    expect(matchForToken(empty, token)).toBeNull();
  });
});

describe('isTakeback', () => {
  it('detects a play removed from the same game', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3, 5, 2) });
    store.dispatch({ type: 'start', length: 7 });
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });
    store.dispatch({ type: 'commit' });
    const committed = store.getState().match as MatchState;
    store.dispatch({ type: 'takeback', player: 'white' });
    const restored = store.getState().match as MatchState;

    expect(isTakeback(committed, restored)).toBe(true);
    // The reverse — a freshly committed play — is a commit, not a takeback.
    expect(isTakeback(restored, committed)).toBe(false);
  });

  it('is not a takeback across different games', () => {
    const store = createPlayStore({ dice: scriptedDice(6, 3, 5, 2) });
    store.dispatch({ type: 'start', length: 7 });
    store.dispatch({ type: 'movement', from: 24, die: 6 });
    store.dispatch({ type: 'movement', from: 13, die: 3 });
    store.dispatch({ type: 'commit' });
    const gameA = store.getState().match as MatchState;
    store.dispatch({ type: 'start', length: 7 });
    const gameB = store.getState().match as MatchState;

    expect(isTakeback(gameA, gameB)).toBe(false);
  });

  it('is false when either state is null', () => {
    const match = openingMatch();
    expect(isTakeback(null, match)).toBe(false);
    expect(isTakeback(match, null)).toBe(false);
    expect(isTakeback(null, null)).toBe(false);
  });
});

describe('gameLive', () => {
  it('is true while the game is still in play', () => {
    expect(gameLive(openingMatch())).toBe(true);
  });

  it('is false once the game or the match is over', () => {
    const match = openingMatch();
    expect(gameLive({ ...match, phase: 'game-over' })).toBe(false);
    expect(gameLive({ ...match, phase: 'match-over' })).toBe(false);
  });
});

describe('resolvePacing', () => {
  it('defaults the step pause and the pacing function', () => {
    const { stepMs, pace } = resolvePacing({});
    expect(stepMs).toBe(DEFAULT_STEP_MS);
    expect(pace).toBe(defaultPace);
  });

  it("prefers the caller's step pause and pacing function", () => {
    const custom = () => Promise.resolve();
    const { stepMs, pace } = resolvePacing({ stepMs: 10, pace: custom });
    expect(stepMs).toBe(10);
    expect(pace).toBe(custom);
  });

  it('treats a zero step pause as explicit, not missing', () => {
    expect(resolvePacing({ stepMs: 0 }).stepMs).toBe(0);
  });
});

describe('defaultPace', () => {
  it('resolves after the requested delay', async () => {
    await expect(defaultPace(0)).resolves.toBeUndefined();
  });

  it('exposes the controllers’ shared default step pause', () => {
    expect(DEFAULT_STEP_MS).toBe(450);
  });
});

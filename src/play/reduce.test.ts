/**
 * Tests for the pure match reducer shared by the local store and the remote
 * room, and for decisionOwner (who may act in each match phase).
 */

import type { MatchState } from '../rules';
import { scriptedDice } from '../test/dice';
import {
  decisionOwner,
  isPlayAction,
  type PlayAction,
  reduceMatch,
} from './reduce';

function apply(
  match: MatchState | null,
  action: PlayAction,
  ...rolls: Parameters<typeof scriptedDice>
): MatchState {
  const next = reduceMatch(match, action, scriptedDice(...rolls));
  if (!next) {
    throw new Error(`illegal action ${action.type}`);
  }
  return next;
}

/** White to play 6-3 from the start position. */
function turnPhase(length: number): MatchState {
  return apply(null, { type: 'start', length }, 6, 3);
}

/** White committed the opening; black is at the pre-roll decision. */
function blackPreRoll(): MatchState {
  let match = turnPhase(7);
  match = apply(match, { type: 'movement', from: 24, die: 6 });
  match = apply(match, { type: 'movement', from: 13, die: 3 });
  return apply(match, { type: 'commit' });
}

describe('reduceMatch', () => {
  it('starts a match from null with the opening roll from the dice', () => {
    const match = reduceMatch(
      null,
      { type: 'start', length: 5 },
      scriptedDice(6, 3),
    );
    expect(match?.length).toBe(5);
    expect(match?.game.turn?.roll).toEqual([6, 3]);
  });

  it('returns null for an illegal action instead of throwing', () => {
    const match = reduceMatch(null, { type: 'start' }, scriptedDice(6, 3));
    expect(reduceMatch(match, { type: 'take' }, scriptedDice())).toBeNull();
  });

  it('returns null for any action before start', () => {
    expect(reduceMatch(null, { type: 'roll' }, scriptedDice())).toBeNull();
  });
});

describe('decisionOwner', () => {
  it('is the turn player during a turn', () => {
    const match = turnPhase(7);
    expect(match.phase).toBe('turn');
    expect(decisionOwner(match)).toBe('white');
  });

  it('is the player to roll before a roll', () => {
    const match = blackPreRoll();
    expect(match.phase).toBe('pre-roll');
    expect(decisionOwner(match)).toBe('black');
  });

  it('is the opponent of the doubler when a double is offered', () => {
    const match = apply(blackPreRoll(), { type: 'double' });
    expect(match.phase).toBe('cube-offered');
    expect(decisionOwner(match)).toBe('white');
  });

  it('is the opponent of the resigner when a resignation is offered', () => {
    const match = apply(turnPhase(7), { type: 'resign', kind: 'single' });
    expect(match.phase).toBe('resign-offered');
    expect(decisionOwner(match)).toBe('black');
  });

  it('is either player once a game is over', () => {
    const resigned = apply(turnPhase(7), { type: 'resign', kind: 'single' });
    const match = apply(resigned, { type: 'accept-resign' });
    expect(match.phase).toBe('game-over');
    expect(decisionOwner(match)).toBe('either');
  });

  it('is nobody once the match is over', () => {
    const resigned = apply(turnPhase(1), { type: 'resign', kind: 'single' });
    const match = apply(resigned, { type: 'accept-resign' });
    expect(match.phase).toBe('match-over');
    expect(decisionOwner(match)).toBeNull();
  });
});

describe('isPlayAction', () => {
  it.each([
    { type: 'movement', from: 13, die: 5 },
    { type: 'movement', from: 1, die: 1 },
    { type: 'movement', from: 24, die: 6 },
    { type: 'movement', from: 'bar', die: 3 },
    { type: 'movement', from: 13, die: 5, extra: 'ignored' },
    { type: 'undo' },
    { type: 'commit' },
    { type: 'forced' },
    { type: 'roll' },
    { type: 'double' },
    { type: 'take' },
    { type: 'pass' },
    { type: 'resign', kind: 'single' },
    { type: 'resign', kind: 'gammon' },
    { type: 'resign', kind: 'backgammon' },
    { type: 'accept-resign' },
    { type: 'decline-resign' },
    { type: 'next-game' },
    { type: 'tutor-assisted' },
    { type: 'start', length: 5 },
    { type: 'start', money: true },
    { type: 'takeback', player: 'white' },
  ])('accepts %o', (value) => {
    expect(isPlayAction(value)).toBe(true);
  });

  it.each([
    null,
    'roll',
    42,
    [],
    {},
    { type: 7 },
    { type: 'bogus' },
    { type: 'resign' },
    { type: 'resign', kind: 'x' },
    { type: 'movement', from: 13 },
    { type: 'movement', from: 13, die: 0 },
    { type: 'movement', from: 13, die: 7 },
    { type: 'movement', from: 13, die: 2.5 },
    { type: 'movement', from: 13, die: '5' },
    { type: 'movement', from: 0, die: 5 },
    { type: 'movement', from: 25, die: 5 },
    { type: 'movement', from: 1.5, die: 5 },
    { type: 'movement', from: 'off', die: 5 },
    { type: 'start', length: 'x' },
    { type: 'start', money: 'yes' },
    { type: 'takeback', player: 'red' },
  ])('rejects %o', (value) => {
    expect(isPlayAction(value)).toBe(false);
  });
});

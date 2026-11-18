/**
 * Tests for the pure remote-play room core: seating, the join-time match
 * start, who may act, dice attribution, rejection, and expiry.
 */

import {
  createBoard,
  createCryptoDice,
  createGame,
  createMatch,
} from '../rules';
import { scriptedDice } from '../test/dice';
import type { Presence } from './protocol';
import { FINISHED_TTL_MS, ROOM_TTL_MS } from './protocol';
import {
  createRoom,
  expiryAt,
  handleMessage,
  isExpired,
  joinRoom,
  type RoomState,
  type RoomStep,
  seatForToken,
} from './roomCore';

const NOW = 1_000_000;
const both: Presence = { white: true, black: true };

function playingRoom(...dice: Parameters<typeof scriptedDice>): RoomState {
  const step = joinRoom(
    createRoom('r1', { length: 5 }, 'w-tok', NOW),
    'b-tok',
    scriptedDice(...dice),
    NOW,
  );
  if ('error' in step) {
    throw new Error(step.error);
  }
  return step.room;
}

function act(
  room: RoomState,
  from: 'white' | 'black',
  message: Parameters<typeof handleMessage>[2],
  ...dice: Parameters<typeof scriptedDice>
): RoomStep {
  return handleMessage(room, from, message, scriptedDice(...dice), NOW, both);
}

/** White's 6-3 opening committed: black is at the pre-roll decision. */
function blackPreRoll(): RoomState {
  let room = playingRoom(6, 3);
  for (const action of [
    { type: 'movement', from: 24, die: 6 },
    { type: 'movement', from: 13, die: 3 },
    { type: 'commit' },
  ] as const) {
    room = act(room, 'white', { type: 'act', action }).room;
  }
  return room;
}

describe('createRoom', () => {
  it('creates a waiting room with White seated', () => {
    const room = createRoom('r1', { length: 5 }, 'w-tok', NOW);
    expect(room.status).toBe('waiting');
    expect(room.seats).toEqual([{ side: 'white', token: 'w-tok' }]);
    expect(room.seq).toBe(0);
    expect(room.match).toBeNull();
  });
});

describe('joinRoom', () => {
  it('starts the match with the room dice and snapshots both', () => {
    const step = joinRoom(
      createRoom('r1', { length: 5 }, 'w-tok', NOW),
      'b-tok',
      scriptedDice(6, 3),
      NOW,
    );
    if ('error' in step) {
      throw new Error(step.error);
    }
    expect(step.room.match?.game.turn?.roll).toEqual([6, 3]);
    expect(step.room.status).toBe('playing');
    expect(step.room.seq).toBe(1);
    expect(step.changed).toBe(true);
    expect(step.effects).toHaveLength(1);
    expect(step.effects[0]).toMatchObject({
      type: 'broadcast',
      message: { type: 'snapshot', seq: 1, status: 'playing' },
    });
  });

  it('rejects a second join as full', () => {
    const room = playingRoom(6, 3);
    expect(joinRoom(room, 'x', scriptedDice(), NOW)).toEqual({
      error: 'full',
    });
  });

  it('rejects joining an expired room', () => {
    const room = createRoom('r1', { length: 5 }, 'w-tok', NOW);
    expect(joinRoom(room, 'b-tok', scriptedDice(), NOW + ROOM_TTL_MS)).toEqual({
      error: 'expired',
    });
  });
});

describe('seatForToken', () => {
  it('maps tokens to seats and unknown tokens to null', () => {
    const room = playingRoom(6, 3);
    expect(seatForToken(room, 'w-tok')).toBe('white');
    expect(seatForToken(room, 'b-tok')).toBe('black');
    expect(seatForToken(room, 'nope')).toBeNull();
  });
});

describe('handleMessage act', () => {
  it("applies the actor's movement and broadcasts it with no dice", () => {
    const step = act(playingRoom(6, 3), 'white', {
      type: 'act',
      action: { type: 'movement', from: 24, die: 6 },
    });
    expect(step.changed).toBe(true);
    expect(step.room.seq).toBe(2);
    expect(step.room.lastActivity).toBe(NOW);
    expect(step.effects).toEqual([
      {
        type: 'broadcast',
        message: {
          type: 'applied',
          seq: 2,
          side: 'white',
          action: { type: 'movement', from: 24, die: 6 },
          dice: [],
          msLeft: null,
        },
      },
    ]);
  });

  it('attaches two dice to a roll', () => {
    const step = act(
      blackPreRoll(),
      'black',
      { type: 'act', action: { type: 'roll' } },
      4,
      2,
    );
    expect(step.effects[0]).toMatchObject({
      type: 'broadcast',
      message: { type: 'applied', side: 'black', dice: [4, 2] },
    });
    expect(step.room.match?.game.turn?.roll).toEqual([4, 2]);
  });

  it('rejects an action from the non-actor with not-your-turn and changed false', () => {
    const room = playingRoom(6, 3);
    const step = act(room, 'black', {
      type: 'act',
      action: { type: 'movement', from: 24, die: 6 },
    });
    expect(step.changed).toBe(false);
    expect(step.room).toBe(room);
    expect(step.effects).toEqual([
      {
        type: 'send',
        to: 'black',
        message: { type: 'rejected', seq: 1, reason: 'not-your-turn' },
      },
    ]);
  });

  it('rejects takeback, tutor-assisted and start with not-allowed', () => {
    const room = playingRoom(6, 3);
    for (const action of [
      { type: 'takeback', player: 'white' },
      { type: 'tutor-assisted' },
      { type: 'start', length: 3 },
    ] as const) {
      const step = act(room, 'white', { type: 'act', action });
      expect(step.changed).toBe(false);
      expect(step.effects).toEqual([
        {
          type: 'send',
          to: 'white',
          message: { type: 'rejected', seq: 1, reason: 'not-allowed' },
        },
      ]);
    }
  });

  it('rejects an illegal movement with illegal', () => {
    const step = act(playingRoom(6, 3), 'white', {
      type: 'act',
      action: { type: 'movement', from: 1, die: 6 },
    });
    expect(step.changed).toBe(false);
    expect(step.effects[0]).toMatchObject({
      message: { type: 'rejected', reason: 'illegal' },
    });
  });

  it('rejects an action while the room is not playing', () => {
    const waiting = createRoom('r1', { length: 5 }, 'w-tok', NOW);
    const step = act(waiting, 'white', {
      type: 'act',
      action: { type: 'roll' },
    });
    expect(step.effects[0]).toMatchObject({
      message: { type: 'rejected', reason: 'not-playing' },
    });
  });

  it('rejects a second next-game', () => {
    let room = playingRoom(6, 3);
    room = act(room, 'white', {
      type: 'act',
      action: { type: 'resign', kind: 'single' },
    }).room;
    room = act(room, 'black', {
      type: 'act',
      action: { type: 'accept-resign' },
    }).room;
    expect(room.match?.phase).toBe('game-over');
    const first = act(
      room,
      'black',
      { type: 'act', action: { type: 'next-game' } },
      5,
      2,
    );
    expect(first.changed).toBe(true);
    const second = act(first.room, 'white', {
      type: 'act',
      action: { type: 'next-game' },
    });
    expect(second.changed).toBe(false);
    expect(second.effects[0]).toMatchObject({
      message: { type: 'rejected', reason: 'illegal' },
    });
  });

  it('marks the room finished with finishedAt at match-over', () => {
    const game = createGame({
      board: createBoard({
        white: { points: { 1: 1 }, off: 14 },
        black: { points: { 19: 5, 20: 5, 21: 5 } },
      }),
      player: 'white',
      roll: [1, 2],
    });
    const room: RoomState = {
      ...playingRoom(6, 3),
      match: createMatch({ length: 1, game }),
    };
    const moved = act(room, 'white', {
      type: 'act',
      action: { type: 'movement', from: 1, die: 1 },
    });
    const later = handleMessage(
      moved.room,
      'white',
      { type: 'act', action: { type: 'commit' } },
      scriptedDice(),
      NOW + 5,
      both,
    );
    expect(later.room.match?.phase).toBe('match-over');
    expect(later.room.status).toBe('finished');
    expect(later.room.finishedAt).toBe(NOW + 5);
  });
});

describe('handleMessage hello and resync', () => {
  it('answer the sender with a snapshot and change nothing', () => {
    const room = playingRoom(6, 3);
    for (const message of [
      { type: 'hello', version: 1 },
      { type: 'resync' },
    ] as const) {
      const step = act(room, 'black', message);
      expect(step.changed).toBe(false);
      expect(step.room).toBe(room);
      expect(step.effects).toEqual([
        {
          type: 'send',
          to: 'black',
          message: {
            type: 'snapshot',
            seq: 1,
            match: room.match,
            status: 'playing',
            presence: both,
            names: { white: null, black: null },
            msLeft: null,
            forfeitBy: null,
          },
        },
      ]);
    }
  });
});

describe('expiry', () => {
  it('expires 7 days after activity and 24 hours after finishing', () => {
    const room = playingRoom(6, 3);
    expect(expiryAt(room)).toBe(NOW + ROOM_TTL_MS);
    expect(isExpired(room, NOW + ROOM_TTL_MS - 1)).toBe(false);
    expect(isExpired(room, NOW + ROOM_TTL_MS)).toBe(true);
    const finished: RoomState = {
      ...room,
      status: 'finished',
      finishedAt: NOW + 10,
    };
    expect(expiryAt(finished)).toBe(NOW + 10 + FINISHED_TTL_MS);
    expect(isExpired(finished, NOW + 10 + FINISHED_TTL_MS)).toBe(true);
  });
});

describe('createCryptoDice', () => {
  it('yields only 1..6', () => {
    const dice = createCryptoDice();
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(dice.rollDie());
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

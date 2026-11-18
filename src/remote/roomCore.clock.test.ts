/**
 * Tests for the room core's player names, per-turn move clock, timeout
 * forfeit, and the tiered expiry (unjoined invite, game in progress).
 */

import { scriptedDice } from '../test/dice';
import type { Presence, ServerMessage } from './protocol';
import {
  FINISHED_TTL_MS,
  ROOM_TTL_MS,
  type Side,
  WAITING_TTL_MS,
} from './protocol';
import {
  createRoom,
  expireTurn,
  expiryAt,
  handleMessage,
  isExpired,
  joinRoom,
  type RoomEffect,
  type RoomState,
  summarize,
} from './roomCore';

const NOW = 1_000_000;
const both: Presence = { white: true, black: true };

function seated(moveSeconds?: number): RoomState {
  const step = joinRoom(
    createRoom('r1', { length: 5, moveSeconds }, 'w-tok', NOW),
    'b-tok',
    scriptedDice(6, 3),
    NOW,
  );
  if ('error' in step) {
    throw new Error(step.error);
  }
  return step.room;
}

function send(
  room: RoomState,
  from: Side,
  message: Parameters<typeof handleMessage>[2],
  now = NOW,
) {
  return handleMessage(room, from, message, scriptedDice(), now, both);
}

function messagesTo(effects: readonly RoomEffect[], side: Side) {
  return effects
    .filter(
      (e) => e.type === 'broadcast' || (e.type === 'send' && e.to === side),
    )
    .map((e) => e.message);
}

function snapshotIn(effects: readonly RoomEffect[], side: Side) {
  return messagesTo(effects, side).find(
    (m): m is Extract<ServerMessage, { type: 'snapshot' }> =>
      m.type === 'snapshot',
  );
}

describe('player names', () => {
  it('stores a name from hello and tells both seats', () => {
    const step = send(seated(), 'white', {
      type: 'hello',
      version: 1,
      name: '  Alice ',
    });
    expect(step.changed).toBe(true);
    expect(snapshotIn(step.effects, 'white')?.names).toEqual({
      white: 'Alice',
      black: null,
    });
    expect(messagesTo(step.effects, 'black')).toContainEqual({
      type: 'names',
      names: { white: 'Alice', black: null },
    });
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['not a string', 7],
  ])('ignores a %s name', (_label, name) => {
    const step = send(seated(), 'white', {
      type: 'hello',
      version: 1,
      name: name as string,
    });
    expect(step.changed).toBe(false);
    expect(snapshotIn(step.effects, 'white')?.names).toEqual({
      white: null,
      black: null,
    });
  });

  it('does not persist or announce an unchanged name', () => {
    const first = send(seated(), 'black', {
      type: 'hello',
      version: 1,
      name: 'Bob',
    });
    const again = send(first.room, 'black', {
      type: 'hello',
      version: 1,
      name: 'Bob',
    });
    expect(again.changed).toBe(false);
    expect(messagesTo(again.effects, 'white')).toEqual([]);
  });

  it('shows the names in the room summary', () => {
    const named = send(seated(), 'white', {
      type: 'hello',
      version: 1,
      name: 'Alice',
    }).room;
    expect(summarize(named).names).toEqual({ white: 'Alice', black: null });
  });

  it('a name change does not extend the room lifetime', () => {
    const room = seated();
    const step = send(
      room,
      'white',
      { type: 'hello', version: 1, name: 'A' },
      NOW + 5000,
    );
    expect(step.room.lastActivity).toBe(room.lastActivity);
  });
});

describe('move clock', () => {
  it('has no clock when moveSeconds is absent or 0', () => {
    for (const seconds of [undefined, 0]) {
      const room = seated(seconds);
      const step = send(room, 'white', { type: 'resync' });
      expect(snapshotIn(step.effects, 'white')?.msLeft).toBeNull();
      expect(expireTurn(room, NOW + ROOM_TTL_MS - 1, both)).toBeNull();
    }
  });

  it('starts the first turn at the full allowance on join', () => {
    const step = send(seated(30), 'white', { type: 'resync' });
    expect(snapshotIn(step.effects, 'white')?.msLeft).toBe(30_000);
  });

  it('counts down against the server clock', () => {
    const step = send(seated(30), 'white', { type: 'resync' }, NOW + 12_000);
    expect(snapshotIn(step.effects, 'white')?.msLeft).toBe(18_000);
  });

  it('keeps the same deadline for further actions in one turn', () => {
    const room = seated(30);
    const moved = send(
      room,
      'white',
      { type: 'act', action: { type: 'movement', from: 24, die: 6 } },
      NOW + 10_000,
    );
    expect(moved.room.deadline).toBe(NOW + 30_000);
  });

  it('restarts the allowance when the turn passes to the other player', () => {
    let room = seated(30);
    for (const action of [
      { type: 'movement', from: 24, die: 6 },
      { type: 'movement', from: 13, die: 3 },
      { type: 'commit' },
    ] as const) {
      room = send(room, 'white', { type: 'act', action }, NOW + 10_000).room;
    }
    expect(room.deadline).toBe(NOW + 10_000 + 30_000);
  });

  it('reports the remaining time on applied actions', () => {
    const step = send(
      seated(30),
      'white',
      { type: 'act', action: { type: 'movement', from: 24, die: 6 } },
      NOW + 4_000,
    );
    const applied = step.effects.find(
      (e) => e.type === 'broadcast' && e.message.type === 'applied',
    );
    expect(applied?.message).toMatchObject({ msLeft: 26_000 });
  });
});

describe('timeout forfeit', () => {
  const lateBy = (ms: number) => NOW + 30_000 + ms;

  it('is not due before the deadline', () => {
    expect(expireTurn(seated(30), NOW + 29_999, both)).toBeNull();
  });

  it('forfeits the player on the move once the deadline passes', () => {
    const step = expireTurn(seated(30), lateBy(0), both);
    expect(step).not.toBeNull();
    expect(step?.changed).toBe(true);
    expect(step?.room).toMatchObject({
      status: 'finished',
      forfeitBy: 'white',
      deadline: null,
      finishedAt: lateBy(0),
    });
    expect(snapshotIn(step?.effects ?? [], 'black')).toMatchObject({
      status: 'finished',
      forfeitBy: 'white',
      msLeft: null,
    });
  });

  it('refuses a move that arrives after the deadline and forfeits instead', () => {
    const step = send(
      seated(30),
      'white',
      { type: 'act', action: { type: 'movement', from: 24, die: 6 } },
      lateBy(1),
    );
    expect(step.room.status).toBe('finished');
    expect(step.room.forfeitBy).toBe('white');
    expect(step.room.match).toEqual(seated(30).match);
  });

  it('forfeits on any late message, even a resync', () => {
    const step = send(seated(30), 'black', { type: 'resync' }, lateBy(5));
    expect(step.room.forfeitBy).toBe('white');
  });

  it('forfeits the opponent who must answer a double', () => {
    let room = seated(30);
    // White rolls out the opening turn, then black (on roll) is the mover.
    for (const action of [
      { type: 'movement', from: 24, die: 6 },
      { type: 'movement', from: 13, die: 3 },
      { type: 'commit' },
    ] as const) {
      room = send(room, 'white', { type: 'act', action }).room;
    }
    const step = expireTurn(room, room.deadline ?? 0, both);
    expect(step?.room.forfeitBy).toBe('black');
  });

  it('never forfeits twice or after the room is finished', () => {
    const done = expireTurn(seated(30), lateBy(0), both)?.room as RoomState;
    expect(expireTurn(done, lateBy(10_000), both)).toBeNull();
  });

  it('rejects further actions on a forfeited room as not-playing', () => {
    const done = expireTurn(seated(30), lateBy(0), both)?.room as RoomState;
    const step = send(
      done,
      'black',
      { type: 'act', action: { type: 'roll' } },
      lateBy(1),
    );
    expect(step.effects).toContainEqual({
      type: 'send',
      to: 'black',
      message: { type: 'rejected', seq: done.seq, reason: 'not-playing' },
    });
  });
});

describe('tiered expiry', () => {
  it('lets an unjoined invite lapse after 24 hours', () => {
    const room = createRoom('r1', { length: 5 }, 'w-tok', NOW);
    expect(expiryAt(room)).toBe(NOW + WAITING_TTL_MS);
    expect(isExpired(room, NOW + WAITING_TTL_MS - 1)).toBe(false);
    expect(isExpired(room, NOW + WAITING_TTL_MS)).toBe(true);
  });

  it('keeps a game in progress for 7 days after the last move', () => {
    expect(expiryAt(seated(0))).toBe(NOW + ROOM_TTL_MS);
  });

  it('removes a forfeited game 24 hours after it ended', () => {
    const done = expireTurn(seated(30), NOW + 40_000, both)?.room as RoomState;
    expect(expiryAt(done)).toBe(NOW + 40_000 + FINISHED_TTL_MS);
  });
});

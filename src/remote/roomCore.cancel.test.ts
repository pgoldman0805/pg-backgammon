/**
 * Tests for cancelling a room: who may, what both seats are told, that a
 * cancelled invite can no longer be joined, and the turn and outcome the room
 * summary reports for the "my online games" list.
 */

import { scriptedDice } from '../test/dice';
import type { Presence, Side } from './protocol';
import { FINISHED_TTL_MS } from './protocol';
import {
  cancelRoom,
  createRoom,
  expireTurn,
  expiryAt,
  joinRoom,
  type RoomState,
  summarize,
} from './roomCore';

const NOW = 1_000_000;
const both: Presence = { white: true, black: true };

function waiting(): RoomState {
  return createRoom('r1', { length: 5, moveSeconds: 30 }, 'w-tok', NOW);
}

function playing(): RoomState {
  const step = joinRoom(waiting(), 'b-tok', scriptedDice(6, 3), NOW);
  if ('error' in step) {
    throw new Error(step.error);
  }
  return step.room;
}

describe('cancelRoom', () => {
  it.each(['white', 'black'] as const)(
    'lets %s cancel a game in progress, telling both seats',
    (side) => {
      const step = cancelRoom(playing(), side, NOW + 5000, both);
      expect(step?.changed).toBe(true);
      expect(step?.room).toMatchObject({
        status: 'finished',
        cancelledBy: side,
        deadline: null,
        finishedAt: NOW + 5000,
      });
      expect(step?.effects).toEqual([
        {
          type: 'broadcast',
          message: expect.objectContaining({
            type: 'snapshot',
            status: 'finished',
            cancelledBy: side,
            msLeft: null,
          }),
        },
      ]);
    },
  );

  it('lets the host cancel an invite nobody has taken', () => {
    const step = cancelRoom(waiting(), 'white', NOW + 1, {
      white: true,
      black: false,
    });
    expect(step?.room.status).toBe('finished');
    expect(step?.room.cancelledBy).toBe('white');
  });

  it('does nothing to a room that already finished', () => {
    const done = cancelRoom(playing(), 'white', NOW, both)?.room as RoomState;
    expect(cancelRoom(done, 'black', NOW + 1, both)).toBeNull();
    const forfeited = expireTurn(playing(), NOW + 30_000, both)
      ?.room as RoomState;
    expect(cancelRoom(forfeited, 'white', NOW + 30_001, both)).toBeNull();
  });

  it('removes the room 24 hours after it was cancelled', () => {
    const done = cancelRoom(playing(), 'white', NOW + 9, both)
      ?.room as RoomState;
    expect(expiryAt(done)).toBe(NOW + 9 + FINISHED_TTL_MS);
  });

  it('can no longer be joined once cancelled', () => {
    const done = cancelRoom(waiting(), 'white', NOW + 1, {
      white: true,
      black: false,
    })?.room as RoomState;
    expect(joinRoom(done, 'b-tok', scriptedDice(6, 3), NOW + 2)).toEqual({
      error: 'expired',
    });
  });
});

describe('room summary for the games list', () => {
  it('reports whose move it is while playing', () => {
    const room = playing();
    const mover = summarize(room).toMove;
    expect(['white', 'black']).toContain(mover);
  });

  it('reports no mover while waiting or after the game ends', () => {
    expect(summarize(waiting()).toMove).toBeNull();
    expect(
      summarize(cancelRoom(playing(), 'white', NOW, both)?.room as RoomState)
        .toMove,
    ).toBeNull();
  });

  it('reports how a finished room ended', () => {
    const cancelled = cancelRoom(playing(), 'black', NOW, both)
      ?.room as RoomState;
    expect(summarize(cancelled)).toMatchObject({
      status: 'finished',
      cancelledBy: 'black',
      forfeitBy: null,
    });
    const forfeited = expireTurn(playing(), NOW + 30_000, both)
      ?.room as RoomState;
    const side = summarize(forfeited).forfeitBy as Side;
    expect(['white', 'black']).toContain(side);
    expect(summarize(forfeited).cancelledBy).toBeNull();
  });
});

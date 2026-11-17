/**
 * Tests for the client session over an in-memory loopback: two sessions and
 * one room host play real matches, so sync, ordering, rejection and resync
 * behaviour are exercised end to end without any socket.
 */

import { decisionOwner } from '../play/reduce';
import { canCommit, destinationsFrom, movableOrigins } from '../play/selectors';
import { createSeededDice, type DiceSource } from '../rules';
import { scriptedDice } from '../test/dice';
import { createQueueDice, QueueDiceUnderflow } from './queueDice';
import {
  createRemoteSession,
  type RemoteSession,
  socketUrl,
  type TransportFactory,
} from './session';
import { createLoopback, type Loopback } from './testing/loopback';

const pace = () => Promise.resolve();

function connect(
  lb: Loopback,
  side: 'white' | 'black',
  transport: TransportFactory = lb.transport(),
): RemoteSession {
  return createRemoteSession({
    roomId: 'loop',
    seatToken: side === 'white' ? lb.whiteToken : lb.blackToken,
    side,
    transport,
    pace,
  });
}

async function startedPair(
  dice: DiceSource,
  length = 1,
): Promise<{ lb: Loopback; white: RemoteSession; black: RemoteSession }> {
  const lb = createLoopback({ length }, dice);
  const white = connect(lb, 'white');
  await lb.flush();
  await lb.join();
  const black = connect(lb, 'black');
  await lb.flush();
  return { lb, white, black };
}

/** Dispatch one "first legal" step through whichever session owns the decision. */
async function playOneStep(
  lb: Loopback,
  white: RemoteSession,
  black: RemoteSession,
): Promise<void> {
  const match = white.getState().match;
  if (!match) {
    throw new Error('no match');
  }
  let session = white;
  if (match.phase === 'pre-roll') {
    session = match.toRoll === 'white' ? white : black;
    session.dispatch({ type: 'roll' });
  } else if (match.phase === 'turn') {
    session = match.game.turn?.player === 'white' ? white : black;
    if (canCommit(match.game)) {
      session.dispatch({ type: 'commit' });
    } else {
      const from = movableOrigins(match.game)[0];
      const movement = destinationsFrom(match.game, from)[0];
      session.dispatch({ type: 'movement', from, die: movement.die });
    }
  } else if (match.phase === 'game-over') {
    session.dispatch({ type: 'next-game' });
  } else {
    throw new Error(`unexpected phase ${match.phase}`);
  }
  await lb.flush();
}

async function playUntil(
  lb: Loopback,
  white: RemoteSession,
  black: RemoteSession,
  done: (phase: string) => boolean,
): Promise<void> {
  for (let i = 0; i < 5000; i += 1) {
    const phase = white.getState().match?.phase ?? 'none';
    if (done(phase)) {
      return;
    }
    await playOneStep(lb, white, black);
  }
  throw new Error('did not reach the target phase');
}

/** The session of whoever must act next ('either' picks White). */
function actorSession(
  white: RemoteSession,
  black: RemoteSession,
): RemoteSession {
  const match = white.getState().match;
  return match && decisionOwner(match) === 'black' ? black : white;
}

describe('socketUrl', () => {
  it('maps http(s) to ws(s) and appends the room path and seat', () => {
    expect(socketUrl('https://x.example', 'abc', 'tok')).toBe(
      'wss://x.example/api/rooms/abc/ws?seat=tok',
    );
    expect(socketUrl('http://localhost:5173', 'abc', 'tok')).toBe(
      'ws://localhost:5173/api/rooms/abc/ws?seat=tok',
    );
  });
});

describe('queue dice', () => {
  it('yields pushed dice in order and throws when empty', () => {
    const q = createQueueDice();
    q.push([3, 4]);
    expect(q.pending()).toBe(2);
    expect(q.rollDie()).toBe(3);
    expect(q.rollDie()).toBe(4);
    expect(() => q.rollDie()).toThrow(QueueDiceUnderflow);
  });
});

describe('remote session', () => {
  it('White sees a waiting room, then both see the opening position after Black joins', async () => {
    const lb = createLoopback({ length: 3 }, scriptedDice(6, 3));
    const white = connect(lb, 'white');
    await lb.flush();
    expect(white.getConnection()).toMatchObject({
      status: 'open',
      roomStatus: 'waiting',
      opponentPresent: false,
    });
    expect(white.getState().match).toBeNull();

    await lb.join();
    const black = connect(lb, 'black');
    await lb.flush();
    for (const s of [white, black]) {
      expect(s.getState().match?.phase).toBe('turn');
      expect(s.getConnection()).toMatchObject({
        roomStatus: 'playing',
        opponentPresent: true,
        seq: 1,
      });
    }
    expect(white.getState().match).toEqual(black.getState().match);
  });

  it('a movement dispatched by the actor lands on both boards in order', async () => {
    const { lb, white, black } = await startedPair(createSeededDice(7), 3);
    await playOneStep(lb, white, black); // first movement of the opening turn
    const wm = white.getState().match;
    expect(wm?.phase).toBe('turn');
    expect(wm?.game.turn?.movements.length).toBe(1);
    expect(black.getState().match?.game.board).toEqual(wm?.game.board);
    expect(black.getConnection().seq).toBe(white.getConnection().seq);
  });

  it('a dispatch by the non-actor is ignored and sends nothing', async () => {
    const { lb, white, black } = await startedPair(scriptedDice(6, 3), 3);
    const actor = actorSession(white, black);
    const other = actor === white ? black : white;
    const sent: string[] = [];
    // Spy on the idle session's wire from here on.
    const spy = createRemoteSession({
      roomId: 'loop',
      seatToken: other.side === 'white' ? lb.whiteToken : lb.blackToken,
      side: other.side,
      transport: (url) => {
        const t = lb.transport()(url);
        const send = t.send.bind(t);
        t.send = (data) => {
          sent.push(data);
          send(data);
        };
        return t;
      },
      pace,
    });
    await lb.flush();
    sent.length = 0;
    const before = lb.host.room;
    spy.dispatch({ type: 'roll' });
    spy.dispatch({ type: 'commit' });
    await lb.flush();
    expect(sent).toEqual([]);
    expect(lb.host.room).toBe(before);
  });

  it('roll dice come from the room, not the client', async () => {
    const { lb, white, black } = await startedPair(scriptedDice(6, 3, 5, 2), 3);
    await playUntil(lb, white, black, (p) => p === 'pre-roll');
    actorSession(white, black).dispatch({ type: 'roll' });
    await lb.flush();
    for (const s of [white, black]) {
      const match = s.getState().match;
      expect(match?.phase).toBe('turn');
      expect(match?.game.turn?.remainingDice).toEqual([5, 2]);
    }
  });

  it('a rejection triggers one resync and no visible error', async () => {
    const { lb, white, black } = await startedPair(createSeededDice(11), 3);
    await playUntil(lb, white, black, (p) => p === 'game-over');
    const resyncs: string[] = [];
    const counting: TransportFactory = (url) => {
      const t = lb.transport()(url);
      const send = t.send.bind(t);
      t.send = (data) => {
        if (data.includes('"resync"')) {
          resyncs.push(data);
        }
        send(data);
      };
      return t;
    };
    const late = connect(lb, 'black', counting);
    await lb.flush();
    resyncs.length = 0;
    // Both press next-game at once; the room accepts the first, rejects the second.
    white.dispatch({ type: 'next-game' });
    late.dispatch({ type: 'next-game' });
    await lb.flush();
    expect(resyncs).toHaveLength(1);
    expect(late.getConnection().error).toBeNull();
    expect(white.getConnection().error).toBeNull();
    expect(late.getState().match).toEqual(white.getState().match);
    expect(white.getState().match?.phase).toBe('turn');
    black.dispose();
  });

  it('snapshot restores an in-progress turn with movements', async () => {
    const { lb, white, black } = await startedPair(createSeededDice(5), 3);
    await playOneStep(lb, white, black); // one movement
    const third = connect(lb, 'white');
    await lb.flush();
    expect(third.getState().match?.game.turn?.movements).toHaveLength(1);
    expect(third.getState().match).toEqual(white.getState().match);
  });

  it('a sequence gap requests a resync', async () => {
    const lb = createLoopback({ length: 3 }, createSeededDice(3));
    let dropNextApplied = false;
    const resyncs: string[] = [];
    const lossy: TransportFactory = (url) => {
      const t = lb.transport()(url);
      const onMessage = t.onMessage.bind(t);
      t.onMessage = (cb) =>
        onMessage((data) => {
          if (dropNextApplied && data.includes('"applied"')) {
            dropNextApplied = false;
            return;
          }
          cb(data);
        });
      const send = t.send.bind(t);
      t.send = (data) => {
        if (data.includes('"resync"')) {
          resyncs.push(data);
        }
        send(data);
      };
      return t;
    };
    const white = connect(lb, 'white');
    await lb.flush();
    await lb.join();
    const black = connect(lb, 'black', lossy);
    await lb.flush();
    dropNextApplied = true;
    await playOneStep(lb, white, black); // roll: black misses it
    expect(resyncs).toHaveLength(0);
    await playOneStep(lb, white, black); // next applied has a gap
    expect(resyncs).toHaveLength(1);
    expect(black.getState().match).toEqual(white.getState().match);
    expect(black.getConnection().seq).toBe(white.getConnection().seq);
  });

  it('a full match drives to match-over on both sides', async () => {
    const { lb, white, black } = await startedPair(createSeededDice(42), 1);
    await playUntil(lb, white, black, (p) => p === 'match-over');
    expect(black.getState().match).toEqual(white.getState().match);
    expect(white.getConnection().roomStatus).toBe('finished');
    expect(lb.host.room.status).toBe('finished');
  });

  it('a closed socket sets status closed and maps the close code', async () => {
    const lb = createLoopback({ length: 1 }, scriptedDice(6, 3));
    const stranger = createRemoteSession({
      roomId: 'loop',
      seatToken: 'wrong',
      side: 'white',
      transport: lb.transport(),
      pace,
    });
    await lb.flush();
    expect(stranger.getConnection()).toMatchObject({
      status: 'closed',
      error: 'bad-token',
    });
  });
});

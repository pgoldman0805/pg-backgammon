/**
 * Tests for the client session over an in-memory loopback: two sessions and
 * one room host play real matches, so sync, ordering, rejection and resync
 * behaviour are exercised end to end without any socket.
 */

import { decisionOwner } from '../play/reduce';
import { canCommit, destinationsFrom, movableOrigins } from '../play/selectors';
import { createSeededDice, type DiceSource, startMatch } from '../rules';
import { scriptedDice } from '../test/dice';
import type { ServerMessage } from './protocol';
import { createQueueDice, QueueDiceUnderflow } from './queueDice';
import {
  createRemoteSession,
  type RemoteSession,
  type RemoteSessionOptions,
  socketUrl,
  type Transport,
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

/** One recorded connection of the fake network: the test drives its events. */
interface FakeSocket {
  readonly sent: string[];
  closed: boolean;
  open(): void;
  receive(message: ServerMessage): void;
  drop(code: number): void;
}

/** A transport factory that records every connection it opens. */
function fakeNetwork(): { sockets: FakeSocket[]; factory: TransportFactory } {
  const sockets: FakeSocket[] = [];
  const factory: TransportFactory = () => {
    let onOpen = () => {};
    let onMessage = (_data: string) => {};
    let onClose = (_code: number) => {};
    const socket: FakeSocket = {
      sent: [],
      closed: false,
      open: () => onOpen(),
      receive: (message) => onMessage(JSON.stringify(message)),
      drop: (code) => onClose(code),
    };
    sockets.push(socket);
    const transport: Transport = {
      send: (data) => {
        socket.sent.push(data);
      },
      close: () => {
        socket.closed = true;
      },
      onOpen: (cb) => {
        onOpen = cb;
      },
      onMessage: (cb) => {
        onMessage = cb;
      },
      onClose: (cb) => {
        onClose = cb;
      },
    };
    return transport;
  };
  return { sockets, factory };
}

/** A pace that records each requested wait; `hold` keeps every wait pending. */
function recordingPace(hold = false) {
  const waits: number[] = [];
  const pace = (ms: number) => {
    waits.push(ms);
    return hold ? new Promise<void>(() => {}) : Promise.resolve();
  };
  return { waits, pace };
}

function snapshot(seq = 1): ServerMessage {
  return {
    type: 'snapshot',
    seq,
    match: startMatch(3, scriptedDice(6, 3)),
    status: 'playing',
    presence: { white: true, black: true },
  };
}

async function settleMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe('reconnection', () => {
  const sessions: RemoteSession[] = [];

  function session(
    factory: TransportFactory,
    pace: RemoteSessionOptions['pace'],
  ): RemoteSession {
    const s = createRemoteSession({
      roomId: 'r',
      seatToken: 't',
      side: 'white',
      transport: factory,
      pace,
    });
    sessions.push(s);
    return s;
  }

  afterEach(() => {
    for (const s of sessions.splice(0)) {
      s.dispose();
    }
  });

  it('reconnects with the configured backoff after an unexpected close', async () => {
    const net = fakeNetwork();
    const { waits, pace } = recordingPace();
    const s = session(net.factory, pace);
    net.sockets[0].open();
    net.sockets[0].receive(snapshot());
    expect(s.getConnection().status).toBe('open');

    net.sockets[0].drop(1006);
    expect(s.getConnection().status).toBe('reconnecting');
    await settleMicrotasks();
    expect(net.sockets).toHaveLength(2);
    net.sockets[1].drop(1006); // fails before opening
    await settleMicrotasks();
    expect(net.sockets).toHaveLength(3);
    expect(waits).toEqual([1000, 2000]);
    expect(s.getConnection().status).toBe('reconnecting');

    net.sockets[2].open();
    expect(net.sockets[2].sent.map((d) => JSON.parse(d).type)).toEqual([
      'hello',
    ]);
    net.sockets[2].receive(snapshot(4));
    expect(s.getConnection()).toMatchObject({
      status: 'open',
      seq: 4,
      error: null,
    });
  });

  it('resets the backoff after a snapshot', async () => {
    const net = fakeNetwork();
    const { waits, pace } = recordingPace();
    session(net.factory, pace);
    net.sockets[0].open();
    net.sockets[0].receive(snapshot());
    net.sockets[0].drop(1006);
    await settleMicrotasks();
    net.sockets[1].drop(1006);
    await settleMicrotasks();
    net.sockets[2].open();
    net.sockets[2].receive(snapshot());
    net.sockets[2].drop(1006);
    await settleMicrotasks();
    expect(waits).toEqual([1000, 2000, 1000]);
    expect(net.sockets).toHaveLength(4);
  });

  it('does not retry after 4001, 4002 or 4003 and sets the matching error', async () => {
    const cases = [
      [4001, 'bad-token'],
      [4002, 'version'],
      [4003, 'expired'],
      [4004, 'full'],
    ] as const;
    for (const [code, error] of cases) {
      const net = fakeNetwork();
      const { waits, pace } = recordingPace();
      const s = session(net.factory, pace);
      net.sockets[0].open();
      net.sockets[0].receive(snapshot());
      net.sockets[0].drop(code);
      await settleMicrotasks();
      expect(s.getConnection()).toMatchObject({ status: 'closed', error });
      s.reconnectNow();
      await settleMicrotasks();
      expect(net.sockets).toHaveLength(1);
      expect(waits).toEqual([]);
    }
  });

  it('reconnects immediately on visibilitychange', async () => {
    const net = fakeNetwork();
    const { waits, pace } = recordingPace(true);
    const s = session(net.factory, pace);
    net.sockets[0].open();
    net.sockets[0].receive(snapshot());
    net.sockets[0].drop(1006);
    await settleMicrotasks();
    expect(waits).toEqual([1000]);
    expect(net.sockets).toHaveLength(1); // still waiting out the backoff

    document.dispatchEvent(new Event('visibilitychange'));
    expect(net.sockets).toHaveLength(2);
    net.sockets[1].open();
    net.sockets[1].receive(snapshot());
    expect(s.getConnection().status).toBe('open');

    // While open, another visibility change opens nothing new.
    document.dispatchEvent(new Event('visibilitychange'));
    expect(net.sockets).toHaveLength(2);
  });

  it('reconnects on the online event', async () => {
    const net = fakeNetwork();
    const { pace } = recordingPace(true);
    session(net.factory, pace);
    net.sockets[0].open();
    net.sockets[0].receive(snapshot());
    net.sockets[0].drop(1006);
    await settleMicrotasks();
    expect(net.sockets).toHaveLength(1);
    window.dispatchEvent(new Event('online'));
    expect(net.sockets).toHaveLength(2);
  });

  it('dispose stops reconnecting', async () => {
    const net = fakeNetwork();
    const { pace } = recordingPace();
    const s = session(net.factory, pace);
    net.sockets[0].open();
    net.sockets[0].receive(snapshot());
    net.sockets[0].drop(1006);
    s.dispose();
    await settleMicrotasks();
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    await settleMicrotasks();
    expect(net.sockets).toHaveLength(1);

    const net2 = fakeNetwork();
    const open = session(net2.factory, pace);
    net2.sockets[0].open();
    open.dispose();
    expect(net2.sockets[0].closed).toBe(true);
    net2.sockets[0].drop(1006);
    await settleMicrotasks();
    expect(net2.sockets).toHaveLength(1);
  });

  it('applies the snapshot match before announcing its seq', () => {
    const net = fakeNetwork();
    const s = session(net.factory, recordingPace().pace);
    const seen: (string | undefined)[] = [];
    s.subscribeConnection(() => {
      seen.push(s.getState().match?.phase);
    });
    net.sockets[0].open();
    net.sockets[0].receive(snapshot());
    expect(seen.length).toBeGreaterThan(0);
    expect(seen).not.toContain(undefined);
  });

  it('sends one resync per gap until the next snapshot', () => {
    const net = fakeNetwork();
    session(net.factory, recordingPace().pace);
    const socket = net.sockets[0];
    socket.open();
    socket.receive(snapshot(1));
    const gap: ServerMessage = {
      type: 'applied',
      seq: 5,
      side: 'white',
      action: { type: 'commit' },
      dice: [],
    };
    socket.receive(gap);
    socket.receive({ ...gap, seq: 6 });
    const resyncs = () =>
      socket.sent.filter((d) => JSON.parse(d).type === 'resync');
    expect(resyncs()).toHaveLength(1);
    socket.receive(snapshot(6));
    socket.receive({ ...gap, seq: 9 });
    expect(resyncs()).toHaveLength(2);
  });

  it('drops a dispatch while the socket is down instead of throwing', () => {
    const net = fakeNetwork();
    const s = session(net.factory, recordingPace(true).pace);
    net.sockets[0].open();
    net.sockets[0].receive(snapshot());
    net.sockets[0].drop(1006);
    const before = net.sockets[0].sent.length;
    expect(() => s.dispatch({ type: 'commit' })).not.toThrow();
    expect(net.sockets[0].sent).toHaveLength(before);
  });

  it('a busy room shows the busy error, which clears after five seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      let failSaves = false;
      const lb = createLoopback({ length: 3 }, scriptedDice(6, 3), {
        save: () =>
          failSaves ? Promise.reject(new Error('busy')) : Promise.resolve(),
      });
      const white = connect(lb, 'white');
      await lb.flush();
      await lb.join();
      const black = connect(lb, 'black');
      await lb.flush();
      sessions.push(white, black);
      failSaves = true;
      const match = white.getState().match;
      if (!match) {
        throw new Error('no match');
      }
      const from = movableOrigins(match.game)[0];
      const movement = destinationsFrom(match.game, from)[0];
      white.dispatch({ type: 'movement', from, die: movement.die });
      await lb.flush();
      expect(white.getConnection().error).toBe('busy');
      vi.advanceTimersByTime(4999);
      expect(white.getConnection().error).toBe('busy');
      vi.advanceTimersByTime(1);
      expect(white.getConnection().error).toBeNull();
      expect(white.getState().match).toEqual(match);
    } finally {
      vi.useRealTimers();
    }
  });
});

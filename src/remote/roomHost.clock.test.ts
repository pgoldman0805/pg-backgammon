/**
 * Tests for the room host's clock and name handling: `tick` forfeits a lapsed
 * turn (what the Durable Object alarm calls), a dropped opponent still runs
 * out of time, a failed save leaves the room unchanged, and names arrive over
 * hello with hostile input tolerated.
 */

import { scriptedDice } from '../test/dice';
import { PROTOCOL_VERSION, type ServerMessage } from './protocol';
import { createRoom, type RoomState } from './roomCore';
import { createRoomHost, type Sink } from './roomHost';

function fakeSink() {
  const received: ServerMessage[] = [];
  const sink: Sink = {
    send: (data) => {
      received.push(JSON.parse(data) as ServerMessage);
    },
    close: () => {},
  };
  return { sink, received };
}

function makeHost(
  moveSeconds: number | undefined,
  clock: { now: number },
  save: (room: RoomState) => Promise<void> = async () => {},
) {
  return createRoomHost({
    room: createRoom('r1', { length: 3, moveSeconds }, 'w-tok', clock.now),
    dice: scriptedDice(6, 3, 5, 2),
    now: () => clock.now,
    save,
  });
}

const hello = (name?: unknown) =>
  JSON.stringify({ type: 'hello', version: PROTOCOL_VERSION, name });

describe('room host clock', () => {
  it('tick forfeits the player on the move and tells both seats', async () => {
    const clock = { now: 1000 };
    const host = makeHost(30, clock);
    const white = fakeSink();
    const black = fakeSink();
    host.attach('w-tok', white.sink);
    await host.join('b-tok');
    host.attach('b-tok', black.sink);
    clock.now += 30_000;
    await host.tick();
    expect(host.room).toMatchObject({ status: 'finished', forfeitBy: 'white' });
    for (const side of [white, black]) {
      expect(side.received.at(-1)).toMatchObject({
        type: 'snapshot',
        status: 'finished',
        forfeitBy: 'white',
      });
    }
  });

  it('tick does nothing before the deadline or without a clock', async () => {
    const clock = { now: 1000 };
    const timed = makeHost(30, clock);
    await timed.join('b-tok');
    clock.now += 29_999;
    await timed.tick();
    expect(timed.room.status).toBe('playing');

    const untimed = makeHost(0, clock);
    await untimed.join('b-tok');
    clock.now += 10 * 24 * 3600 * 1000;
    await untimed.tick();
    expect(untimed.room.status).toBe('playing');
  });

  it('a disconnected player still runs out of time', async () => {
    const clock = { now: 1000 };
    const host = makeHost(15, clock);
    const white = fakeSink();
    host.attach('w-tok', white.sink);
    await host.join('b-tok');
    host.detach(white.sink);
    clock.now += 15_000;
    await host.tick();
    expect(host.room.forfeitBy).toBe('white');
  });

  it('keeps the room unchanged when saving the forfeit fails', async () => {
    const clock = { now: 1000 };
    let failing = false;
    const host = makeHost(15, clock, async () => {
      if (failing) {
        throw new Error('storage down');
      }
    });
    await host.join('b-tok');
    failing = true;
    clock.now += 15_000;
    await expect(host.tick()).rejects.toThrow('storage down');
    expect(host.room.status).toBe('playing');
    failing = false;
    await host.tick();
    expect(host.room.status).toBe('finished');
  });

  it('stores a name sent in hello and shows it to the other seat', async () => {
    const clock = { now: 1000 };
    const host = makeHost(0, clock);
    const white = fakeSink();
    const black = fakeSink();
    host.attach('w-tok', white.sink);
    await host.join('b-tok');
    host.attach('b-tok', black.sink);
    await host.message(white.sink, hello('Alice'));
    expect(white.received.at(-1)).toMatchObject({
      type: 'snapshot',
      names: { white: 'Alice', black: null },
    });
    expect(black.received).toContainEqual({
      type: 'names',
      names: { white: 'Alice', black: null },
    });
  });

  it('survives hostile names', async () => {
    const clock = { now: 1000 };
    const host = makeHost(0, clock);
    const white = fakeSink();
    host.attach('w-tok', white.sink);
    await host.join('b-tok');
    for (const name of [{ a: 1 }, [1], 5, null, 'x'.repeat(5000)]) {
      await host.message(white.sink, hello(name));
    }
    expect(host.room.seats[0].name).toBe('x'.repeat(20));
  });
});

describe('room host cancel', () => {
  it('cancels by seat token and tells both seats', async () => {
    const clock = { now: 1000 };
    const host = makeHost(0, clock);
    const white = fakeSink();
    const black = fakeSink();
    host.attach('w-tok', white.sink);
    await host.join('b-tok');
    host.attach('b-tok', black.sink);
    await expect(host.cancel('b-tok')).resolves.toBe('cancelled');
    expect(host.room).toMatchObject({
      status: 'finished',
      cancelledBy: 'black',
    });
    for (const side of [white, black]) {
      expect(side.received.at(-1)).toMatchObject({
        type: 'snapshot',
        cancelledBy: 'black',
      });
    }
  });

  it('refuses an unknown token and leaves the room alone', async () => {
    const host = makeHost(0, { now: 1000 });
    await host.join('b-tok');
    await expect(host.cancel('nope')).resolves.toBe('bad-token');
    expect(host.room.status).toBe('playing');
  });

  it('reports a room that already finished, and a failed save', async () => {
    const clock = { now: 1000 };
    let failing = false;
    const host = makeHost(0, clock, async () => {
      if (failing) {
        throw new Error('storage down');
      }
    });
    await host.join('b-tok');
    failing = true;
    await expect(host.cancel('w-tok')).rejects.toThrow('storage down');
    expect(host.room.status).toBe('playing');
    failing = false;
    await host.cancel('w-tok');
    await expect(host.cancel('b-tok')).resolves.toBe('finished');
  });
});

/**
 * Tests for the room host: socket attachment by token, presence, routing of
 * effects, the busy path when storage fails, and tolerance of bad frames.
 */

import { decisionOwner } from '../play/reduce';
import { destinationsFrom, movableOrigins } from '../play/selectors';
import type { MatchState } from '../rules';
import { scriptedDice } from '../test/dice';
import {
  CLOSE_BAD_TOKEN,
  CLOSE_VERSION,
  PROTOCOL_VERSION,
  type ServerMessage,
} from './protocol';
import { createRoom, type RoomState } from './roomCore';
import { createRoomHost, type Sink } from './roomHost';

function fakeSink() {
  const received: ServerMessage[] = [];
  const closed: number[] = [];
  const sink: Sink = {
    send: (data) => {
      received.push(JSON.parse(data) as ServerMessage);
    },
    close: (code) => {
      closed.push(code);
    },
  };
  return { sink, received, closed };
}

function makeHost(save: (room: RoomState) => Promise<void> = async () => {}) {
  return createRoomHost({
    room: createRoom('r1', { length: 3 }, 'w-tok', 1000),
    dice: scriptedDice(6, 3, 5, 2, 4, 1),
    now: () => 1000,
    save,
  });
}

/** A legal first movement for whoever owns the opening turn. */
function openingMovement(match: MatchState | null): string {
  if (!match) {
    throw new Error('no match');
  }
  const from = movableOrigins(match.game)[0];
  const { die } = destinationsFrom(match.game, from)[0];
  return JSON.stringify({
    type: 'act',
    action: { type: 'movement', from, die },
  });
}

describe('room host', () => {
  it('attaches a known token and broadcasts presence', () => {
    const host = makeHost();
    const white = fakeSink();
    expect(host.attach('w-tok', white.sink)).toBe('white');
    expect(host.presence()).toEqual({ white: true, black: false });
    expect(white.received).toEqual([
      { type: 'presence', presence: { white: true, black: false } },
    ]);
    host.detach(white.sink);
    expect(host.presence()).toEqual({ white: false, black: false });
  });

  it('closes an unknown token with CLOSE_BAD_TOKEN', () => {
    const host = makeHost();
    const stranger = fakeSink();
    expect(host.attach('nope', stranger.sink)).toBeNull();
    expect(stranger.closed).toEqual([CLOSE_BAD_TOKEN]);
    expect(host.presence()).toEqual({ white: false, black: false });
  });

  it('routes a broadcast to every socket of both sides', async () => {
    const host = makeHost();
    const white1 = fakeSink();
    const white2 = fakeSink();
    const black = fakeSink();
    host.attach('w-tok', white1.sink);
    host.attach('w-tok', white2.sink);
    host.attach('b-tok', black.sink); // unknown yet
    await host.join('b-tok');
    host.attach('b-tok', black.sink);
    for (const s of [white1, white2, black]) {
      s.received.length = 0;
    }
    await host.message(white1.sink, JSON.stringify({ type: 'resync' }));
    expect(white1.received).toHaveLength(1);
    expect(white2.received).toHaveLength(1);
    expect(black.received).toHaveLength(0);

    host.detach(white2.sink);
    for (const s of [white1, white2, black]) {
      s.received.length = 0;
    }
    // The joined snapshot-style broadcast reaches both sides on an accepted act.
    const owner = host.room.match && decisionOwner(host.room.match);
    const actor = owner === 'white' ? white1 : black;
    await host.message(actor.sink, openingMovement(host.room.match));
    expect(white1.received.map((m) => m.type)).toContain('applied');
    expect(black.received.map((m) => m.type)).toContain('applied');
  });

  it('answers busy and keeps the room unchanged when save rejects', async () => {
    let fail = false;
    const host = makeHost(async () => {
      if (fail) {
        throw new Error('storage down');
      }
    });
    const white = fakeSink();
    const black = fakeSink();
    host.attach('w-tok', white.sink);
    await host.join('b-tok');
    host.attach('b-tok', black.sink);
    white.received.length = 0;
    black.received.length = 0;
    const before = host.room;
    fail = true;
    const owner = before.match && decisionOwner(before.match);
    const actor = owner === 'white' ? white : black;
    const other = actor === white ? black : white;
    await host.message(actor.sink, openingMovement(before.match));
    expect(host.room).toBe(before);
    expect(actor.received).toEqual([
      { type: 'rejected', seq: before.seq, reason: 'busy' },
    ]);
    expect(other.received).toEqual([]);
  });

  it('ignores malformed JSON and malformed messages', async () => {
    const host = makeHost();
    const white = fakeSink();
    host.attach('w-tok', white.sink);
    white.received.length = 0;
    const before = host.room;
    for (const raw of [
      'not json',
      'null',
      '42',
      JSON.stringify({ type: 'bogus' }),
      JSON.stringify({ type: 'act' }),
      JSON.stringify({ type: 'act', action: 'roll' }),
      JSON.stringify({ type: 'act', action: {} }),
    ]) {
      await host.message(white.sink, raw);
    }
    expect(white.received).toEqual([]);
    expect(host.room).toBe(before);
  });

  it('closes a hello with another protocol version with CLOSE_VERSION', async () => {
    const host = makeHost();
    const white = fakeSink();
    host.attach('w-tok', white.sink);
    white.received.length = 0;
    await host.message(
      white.sink,
      JSON.stringify({ type: 'hello', version: PROTOCOL_VERSION + 1 }),
    );
    expect(white.closed).toEqual([CLOSE_VERSION]);
    expect(white.received).toEqual([]);
    expect(host.presence()).toEqual({ white: false, black: false });

    const current = fakeSink();
    host.attach('w-tok', current.sink);
    current.received.length = 0;
    await host.message(
      current.sink,
      JSON.stringify({ type: 'hello', version: PROTOCOL_VERSION }),
    );
    expect(current.closed).toEqual([]);
    expect(current.received.map((m) => m.type)).toEqual(['snapshot']);
  });

  it('ignores act frames whose action is malformed', async () => {
    const host = makeHost();
    const white = fakeSink();
    const black = fakeSink();
    host.attach('w-tok', white.sink);
    await host.join('b-tok');
    host.attach('b-tok', black.sink);
    white.received.length = 0;
    black.received.length = 0;
    const before = host.room;
    const owner = before.match && decisionOwner(before.match);
    const actor = owner === 'white' ? white : black;
    for (const action of [
      { type: 'resign', kind: 'x' },
      { type: 'resign' },
      { type: 'movement', from: 13, die: 9 },
      { type: 'movement', from: 'nowhere', die: 3 },
      { type: 'teleport' },
    ]) {
      await host.message(actor.sink, JSON.stringify({ type: 'act', action }));
    }
    expect(white.received).toEqual([]);
    expect(black.received).toEqual([]);
    expect(host.room).toBe(before);
  });

  it('refuses a second join', async () => {
    const host = makeHost();
    expect(await host.join('b-tok')).toEqual({
      side: 'black',
      seatToken: 'b-tok',
    });
    expect(await host.join('b2')).toEqual({ error: 'full' });
  });
});

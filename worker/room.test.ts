import {
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
  SELF,
} from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { decisionOwner } from '../src/play/reduce';
import { destinationsFrom, movableOrigins } from '../src/play/selectors';
import {
  CLOSE_BAD_TOKEN,
  CLOSE_EXPIRED,
  type CreateRoomResponse,
  type JoinRoomResponse,
  PROTOCOL_VERSION,
  type RoomSummary,
  type ServerMessage,
} from '../src/remote/protocol';
import type { RoomState } from '../src/remote/roomCore';

const ORIGIN = 'https://example.com';

async function createRoom(
  length = 1,
  extra: Record<string, unknown> = {},
): Promise<CreateRoomResponse> {
  const response = await SELF.fetch(`${ORIGIN}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ length, ...extra }),
  });
  expect(response.status).toBe(201);
  return response.json();
}

function join(roomId: string): Promise<Response> {
  return SELF.fetch(`${ORIGIN}/api/rooms/${roomId}/join`, { method: 'POST' });
}

/** A client socket that buffers every frame and its close code. */
interface Client {
  readonly ws: WebSocket;
  readonly messages: ServerMessage[];
  send(message: unknown): void;
  next(match: (m: ServerMessage) => boolean): Promise<ServerMessage>;
  closed: Promise<number>;
}

async function connect(roomId: string, seat: string): Promise<Client> {
  const response = await SELF.fetch(
    `${ORIGIN}/api/rooms/${roomId}/ws?seat=${seat}`,
    { headers: { Upgrade: 'websocket' } },
  );
  expect(response.status).toBe(101);
  const ws = response.webSocket;
  if (!ws) {
    throw new Error('no webSocket on the 101 response');
  }
  const messages: ServerMessage[] = [];
  const waiters: (() => void)[] = [];
  const closed = new Promise<number>((resolve) => {
    ws.addEventListener('close', (event) => resolve(event.code));
  });
  ws.addEventListener('message', (event) => {
    messages.push(JSON.parse(event.data as string));
    for (const wake of waiters.splice(0)) {
      wake();
    }
  });
  ws.accept();
  return {
    ws,
    messages,
    closed,
    send: (message) => ws.send(JSON.stringify(message)),
    async next(match) {
      for (;;) {
        const index = messages.findIndex(match);
        if (index >= 0) {
          return messages.splice(index, 1)[0];
        }
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
    },
  };
}

describe('the room Worker and Durable Object', () => {
  it('creates a room and reports it waiting', async () => {
    const created = await createRoom(3);
    expect(created.side).toBe('white');
    expect(created.roomId).toMatch(/^[a-z2-7]{20}$/);
    expect(created.seatToken).toMatch(/^[0-9a-f]{32}$/);

    const response = await SELF.fetch(`${ORIGIN}/api/rooms/${created.roomId}`);
    expect(response.status).toBe(200);
    const summary: RoomSummary = await response.json();
    expect(summary).toEqual({
      roomId: created.roomId,
      config: { length: 3 },
      status: 'waiting',
      seats: { white: true, black: false },
      names: { white: null, black: null },
    });
  });

  it('rejects a bad length with 400', async () => {
    for (const body of [
      { length: 0 },
      { length: 26 },
      { length: 2.5 },
      { length: '3' },
      {},
    ]) {
      const response = await SELF.fetch(`${ORIGIN}/api/rooms`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    const garbage = await SELF.fetch(`${ORIGIN}/api/rooms`, {
      method: 'POST',
      body: 'not json',
    });
    expect(garbage.status).toBe(400);
  });

  it('joins once, then 409', async () => {
    const { roomId, seatToken } = await createRoom();
    const first = await join(roomId);
    expect(first.status).toBe(200);
    const joined: JoinRoomResponse = await first.json();
    expect(joined.side).toBe('black');
    expect(joined.seatToken).toMatch(/^[0-9a-f]{32}$/);
    expect(joined.seatToken).not.toBe(seatToken);

    const summary: RoomSummary = await (
      await SELF.fetch(`${ORIGIN}/api/rooms/${roomId}`)
    ).json();
    expect(summary.status).toBe('playing');
    expect(summary.seats).toEqual({ white: true, black: true });

    const second = await join(roomId);
    expect(second.status).toBe(409);
  });

  it('404s an unknown room', async () => {
    const unknown = 'abcdefghijklmnopqrst';
    expect((await SELF.fetch(`${ORIGIN}/api/rooms/${unknown}`)).status).toBe(
      404,
    );
    expect((await join(unknown)).status).toBe(404);
    // A socket to a missing room ends cleanly with the expired code, so a
    // device still holding a seat stops instead of retrying forever.
    const ws = await connect(unknown, 'x');
    expect(await ws.closed).toBe(CLOSE_EXPIRED);
    // Probing must not create a record.
    expect((await SELF.fetch(`${ORIGIN}/api/rooms/${unknown}`)).status).toBe(
      404,
    );
  });

  it('answers 426 to a WebSocket route without an upgrade', async () => {
    const { roomId, seatToken } = await createRoom();
    const response = await SELF.fetch(
      `${ORIGIN}/api/rooms/${roomId}/ws?seat=${seatToken}`,
    );
    expect(response.status).toBe(426);
  });

  it('upgrades a WebSocket with a valid seat and answers hello with a snapshot', async () => {
    const { roomId, seatToken } = await createRoom();
    const white = await connect(roomId, seatToken);
    white.send({ type: 'hello', version: PROTOCOL_VERSION });
    const snapshot = await white.next((m) => m.type === 'snapshot');
    expect(snapshot).toMatchObject({
      type: 'snapshot',
      seq: 0,
      match: null,
      status: 'waiting',
      presence: { white: true, black: false },
    });
    white.ws.close(1000);
  });

  it('closes a WebSocket with 4001 for a bad seat token', async () => {
    const { roomId } = await createRoom();
    const stranger = await connect(roomId, 'not-a-seat');
    expect(await stranger.closed).toBe(CLOSE_BAD_TOKEN);
  });

  it('relays an applied action from White to Black', async () => {
    const created = await createRoom();
    const joined: JoinRoomResponse = await (await join(created.roomId)).json();
    const white = await connect(created.roomId, created.seatToken);
    const black = await connect(created.roomId, joined.seatToken);
    white.send({ type: 'hello', version: PROTOCOL_VERSION });
    black.send({ type: 'hello', version: PROTOCOL_VERSION });
    const snapshot = await white.next((m) => m.type === 'snapshot');
    await black.next((m) => m.type === 'snapshot');
    if (snapshot.type !== 'snapshot' || !snapshot.match) {
      throw new Error('expected a playing snapshot');
    }
    expect(snapshot.status).toBe('playing');

    // The opening roll is random: act from whichever side owns it.
    const owner = decisionOwner(snapshot.match);
    expect(owner === 'white' || owner === 'black').toBe(true);
    const [actor, watcher] =
      owner === 'white' ? [white, black] : [black, white];
    const game = snapshot.match.game;
    const from = movableOrigins(game)[0];
    const { die } = destinationsFrom(game, from)[0];
    const action = { type: 'movement', from, die };
    actor.send({ type: 'act', action });

    const applied = await watcher.next((m) => m.type === 'applied');
    expect(applied).toEqual({
      type: 'applied',
      seq: snapshot.seq + 1,
      side: owner,
      action,
      dice: [],
      msLeft: null,
    });
    white.ws.close(1000);
    black.ws.close(1000);
  });

  it('keeps serving sockets after the object hibernates', async () => {
    const { roomId, seatToken } = await createRoom();
    const white = await connect(roomId, seatToken);
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
    await evictDurableObject(stub);
    white.send({ type: 'resync' });
    const snapshot = await white.next((m) => m.type === 'snapshot');
    expect(snapshot).toMatchObject({
      status: 'waiting',
      presence: { white: true, black: false },
    });
    white.ws.close(1000);
  });

  it('treats an expired room as gone and the alarm deletes it', async () => {
    const { roomId, seatToken } = await createRoom();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
    // Age the record past its TTL, then drop the in-memory host.
    await runInDurableObject(stub, async (_instance, state) => {
      const room = await state.storage.get<RoomState>('room');
      await state.storage.put('room', { ...room, lastActivity: 0 });
    });
    await evictDurableObject(stub);

    expect((await SELF.fetch(`${ORIGIN}/api/rooms/${roomId}`)).status).toBe(
      404,
    );
    expect((await join(roomId)).status).toBe(404);
    const late = await connect(roomId, seatToken);
    expect(await late.closed).toBe(CLOSE_EXPIRED);

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const stored = await runInDurableObject(stub, (_instance, state) =>
      state.storage.get('room'),
    );
    expect(stored).toBeUndefined();

    // The seat holder returning after the delete is told the room expired,
    // and the probe writes nothing back.
    const returning = await connect(roomId, seatToken);
    expect(await returning.closed).toBe(CLOSE_EXPIRED);
    const after = await runInDurableObject(stub, async (_instance, state) => [
      ...(await state.storage.list()).keys(),
    ]);
    expect(after).toEqual([]);
  });
});

describe('move clock and names in the Durable Object', () => {
  it('stores a valid moveSeconds and rejects others with 400', async () => {
    const created = await createRoom(3, { moveSeconds: 30 });
    const summary: RoomSummary = await (
      await SELF.fetch(`${ORIGIN}/api/rooms/${created.roomId}`)
    ).json();
    expect(summary.config).toEqual({ length: 3, moveSeconds: 30 });

    for (const moveSeconds of [7, -15, 30.5, '30', null, 100000]) {
      const response = await SELF.fetch(`${ORIGIN}/api/rooms`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ length: 3, moveSeconds }),
      });
      expect(response.status).toBe(400);
    }
  });

  it('arms the alarm for the turn deadline once Black joins', async () => {
    const { roomId } = await createRoom(1, { moveSeconds: 15 });
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
    await join(roomId);
    const { alarm, deadline } = await runInDurableObject(
      stub,
      async (_instance, state) => ({
        alarm: await state.storage.getAlarm(),
        deadline: (await state.storage.get<RoomState>('room'))?.deadline,
      }),
    );
    expect(deadline).toBeGreaterThan(Date.now());
    expect(alarm).toBe(deadline);
  });

  it('forfeits the mover when the alarm fires past the deadline', async () => {
    const { roomId, seatToken } = await createRoom(1, { moveSeconds: 15 });
    const white = await connect(roomId, seatToken);
    const joined: JoinRoomResponse = await (await join(roomId)).json();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
    // The opening roll is random: whoever is on move is the one who forfeits.
    const mover = await runInDurableObject(stub, async (_instance, state) => {
      const room = await state.storage.get<RoomState>('room');
      await state.storage.put('room', { ...room, deadline: Date.now() - 1 });
      return room?.match ? decisionOwner(room.match) : null;
    });
    await evictDurableObject(stub);

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const stored = await runInDurableObject(stub, (_instance, state) =>
      state.storage.get<RoomState>('room'),
    );
    expect(stored).toMatchObject({ status: 'finished', forfeitBy: mover });
    const summary: RoomSummary = await (
      await SELF.fetch(`${ORIGIN}/api/rooms/${roomId}`)
    ).json();
    expect(summary.status).toBe('finished');
    expect(joined.side).toBe('black');
    white.ws.close(1000);
  });

  it('keeps names across hibernation and shows the host in the summary', async () => {
    const { roomId, seatToken } = await createRoom(1);
    const white = await connect(roomId, seatToken);
    white.send({ type: 'hello', version: PROTOCOL_VERSION, name: 'Alice' });
    await white.next(
      (m) => m.type === 'snapshot' && m.names?.white === 'Alice',
    );
    const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
    await evictDurableObject(stub);
    const summary: RoomSummary = await (
      await SELF.fetch(`${ORIGIN}/api/rooms/${roomId}`)
    ).json();
    expect(summary.names).toEqual({ white: 'Alice', black: null });
    white.ws.close(1000);
  });
});

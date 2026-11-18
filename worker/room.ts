/**
 * The room Durable Object: storage, sockets and alarms around the room host.
 *
 * One object per room id holds the room record under the storage key 'room'.
 * All room logic lives in the host (src/remote/roomHost.ts); this class only
 * loads and persists the record, adapts hibernatable WebSockets to sinks, and
 * schedules the expiry alarm. An unknown or expired room answers 404 (a
 * WebSocket upgrade is accepted and closed with CLOSE_EXPIRED instead) and
 * never gains a record.
 */

import { DurableObject } from 'cloudflare:workers';
import {
  CLOSE_EXPIRED,
  type CreateRoomResponse,
  type RoomConfig,
  type Side,
} from '../src/remote/protocol';
import {
  createRoom,
  isExpired,
  type RoomState,
  seatForToken,
  summarize,
  wakeAt,
} from '../src/remote/roomCore';
import {
  createRoomHost,
  type RoomHost,
  type Sink,
} from '../src/remote/roomHost';
import { createCryptoDice } from '../src/rules';
import { newSeatToken } from './ids';
import type { Env } from './index';

const ROOM_KEY = 'room';

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

/** Adapt a hibernatable socket; a socket already closing drops the frame. */
function sinkFor(ws: WebSocket): Sink {
  return {
    send(data) {
      try {
        ws.send(data);
      } catch {
        // Closed under us; webSocketClose detaches it.
      }
    },
    close: (code) => ws.close(code),
  };
}

export class RoomObject extends DurableObject<Env> {
  private host: RoomHost | null = null;
  private readonly sinks = new Map<WebSocket, Sink>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
  }

  /** Create the room record and seat White (called once, by the Worker). */
  async create(
    roomId: string,
    config: RoomConfig,
  ): Promise<CreateRoomResponse> {
    const seatToken = newSeatToken();
    const room = createRoom(roomId, config, seatToken, Date.now());
    await this.ctx.storage.put(ROOM_KEY, room);
    await this.ctx.storage.setAlarm(wakeAt(room));
    this.host = this.makeHost(room);
    return { roomId, side: 'white', seatToken };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const host = await this.loadHost();
    if (url.pathname.endsWith('/ws')) {
      return this.upgrade(request, url, host);
    }
    if (!host || isExpired(host.room, Date.now())) {
      return json({ error: 'not-found' }, 404);
    }
    if (url.pathname.endsWith('/join')) {
      return this.join(host);
    }
    return json(summarize(host.room));
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const host = await this.loadHost();
    const sink = this.sinks.get(ws);
    if (!host || !sink) {
      return;
    }
    const raw =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    await host.message(sink, raw);
    await this.ctx.storage.setAlarm(wakeAt(host.room));
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.drop(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.drop(ws);
  }

  async alarm(): Promise<void> {
    const host = await this.loadHost();
    if (!host) {
      return;
    }
    if (!isExpired(host.room, Date.now())) {
      // A turn clock may have run out: settle it, then wait for the next
      // thing (the next turn's deadline or the room's expiry).
      await host.tick();
      await this.ctx.storage.setAlarm(wakeAt(host.room));
      return;
    }
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(CLOSE_EXPIRED);
      } catch {
        // Already closing.
      }
    }
    await this.ctx.storage.deleteAll();
    this.host = null;
    this.sinks.clear();
  }

  private makeHost(room: RoomState): RoomHost {
    return createRoomHost({
      room,
      dice: createCryptoDice(),
      now: Date.now,
      save: (next) => this.ctx.storage.put(ROOM_KEY, next),
    });
  }

  /**
   * The host for this room, built from storage on first use (and after a
   * hibernation wake, re-attaching the surviving sockets once each); null
   * when the room has no record.
   */
  private async loadHost(): Promise<RoomHost | null> {
    if (this.host) {
      return this.host;
    }
    const room = await this.ctx.storage.get<RoomState>(ROOM_KEY);
    if (!room) {
      return null;
    }
    if (!this.host) {
      const host = this.makeHost(room);
      this.host = host;
      for (const ws of this.ctx.getWebSockets()) {
        const [side] = this.ctx.getTags(ws) as Side[];
        const token = room.seats.find((seat) => seat.side === side)?.token;
        const sink = sinkFor(ws);
        if (token && host.attach(token, sink)) {
          this.sinks.set(ws, sink);
        }
      }
    }
    return this.host;
  }

  private async join(host: RoomHost): Promise<Response> {
    let result: Awaited<ReturnType<RoomHost['join']>>;
    try {
      result = await host.join(newSeatToken());
    } catch {
      return json({ error: 'busy' }, 503);
    }
    if ('error' in result) {
      return result.error === 'full'
        ? json({ error: 'full' }, 409)
        : json({ error: 'not-found' }, 404);
    }
    await this.ctx.storage.setAlarm(wakeAt(host.room));
    return json(result);
  }

  private upgrade(request: Request, url: URL, host: RoomHost | null): Response {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    if (!host || isExpired(host.room, Date.now())) {
      // A device still holding a seat must hear a terminal close, not a
      // plain 404 (which a browser sees as 1006 and retries forever).
      // Nothing is written: probing never creates a record.
      this.ctx.acceptWebSocket(server, []);
      server.close(CLOSE_EXPIRED);
      return new Response(null, { status: 101, webSocket: client });
    }
    const token = url.searchParams.get('seat') ?? '';
    const side = seatForToken(host.room, token);
    this.ctx.acceptWebSocket(server, side ? [side] : []);
    // The host closes the socket itself for a bad token.
    const sink = sinkFor(server);
    if (host.attach(token, sink)) {
      this.sinks.set(server, sink);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  private async drop(ws: WebSocket): Promise<void> {
    const host = await this.loadHost();
    const sink = this.sinks.get(ws);
    if (sink) {
      this.sinks.delete(ws);
      host?.detach(sink);
    }
  }
}

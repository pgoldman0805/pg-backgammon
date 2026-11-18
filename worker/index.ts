/**
 * The Worker entry: routes /api/rooms to the room Durable Object.
 *
 * Routing and request validation only. Static assets are served by the
 * assets binding before this runs for every path outside /api/*.
 */

import { MOVE_SECONDS_PRESETS, type RoomConfig } from '../src/remote/protocol';
import { newRoomId } from './ids';
import type { RoomObject } from './room';

export { RoomObject } from './room';

export interface Env {
  readonly ROOMS: DurableObjectNamespace<RoomObject>;
}

const MAX_LENGTH = 25;
const ROOM_PATH = /^\/api\/rooms\/([a-z2-7]{20})(\/join|\/cancel|\/ws)?$/;

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const { length, moveSeconds } = (body ?? {}) as {
    length?: unknown;
    moveSeconds?: unknown;
  };
  if (
    typeof length !== 'number' ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > MAX_LENGTH
  ) {
    return json({ error: 'bad-request' }, 400);
  }
  // Absent means no clock (an older client); present must be a known preset.
  if (
    moveSeconds !== undefined &&
    !(MOVE_SECONDS_PRESETS as readonly unknown[]).includes(moveSeconds)
  ) {
    return json({ error: 'bad-request' }, 400);
  }
  const config: RoomConfig =
    typeof moveSeconds === 'number' ? { length, moveSeconds } : { length };
  const roomId = newRoomId();
  const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
  const created = await stub.create(roomId, config);
  return json(created, 201);
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/rooms') {
      return request.method === 'POST'
        ? createRoom(request, env)
        : json({ error: 'method-not-allowed' }, 405);
    }
    const route = ROOM_PATH.exec(pathname);
    if (!route) {
      return json({ error: 'not-found' }, 404);
    }
    const [, roomId, action] = route;
    const method = action === '/join' || action === '/cancel' ? 'POST' : 'GET';
    if (request.method !== method) {
      return json({ error: 'method-not-allowed' }, 405);
    }
    return env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(request);
  },
} satisfies ExportedHandler<Env>;

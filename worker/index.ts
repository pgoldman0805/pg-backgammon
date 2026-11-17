/**
 * The Worker entry: routes /api/rooms to the room Durable Object.
 *
 * Routing and request validation only. Static assets are served by the
 * assets binding before this runs for every path outside /api/*.
 */

import { newRoomId } from './ids';
import type { RoomObject } from './room';

export { RoomObject } from './room';

export interface Env {
  readonly ROOMS: DurableObjectNamespace<RoomObject>;
}

const MAX_LENGTH = 25;
const ROOM_PATH = /^\/api\/rooms\/([a-z2-7]{20})(\/join|\/ws)?$/;

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
  const length = (body as { length?: unknown } | null)?.length;
  if (
    typeof length !== 'number' ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > MAX_LENGTH
  ) {
    return json({ error: 'bad-request' }, 400);
  }
  const roomId = newRoomId();
  const stub = env.ROOMS.get(env.ROOMS.idFromName(roomId));
  const created = await stub.create(roomId, { length });
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
    const method = action === '/join' ? 'POST' : 'GET';
    if (request.method !== method) {
      return json({ error: 'method-not-allowed' }, 405);
    }
    return env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(request);
  },
} satisfies ExportedHandler<Env>;

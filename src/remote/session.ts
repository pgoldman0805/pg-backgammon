/**
 * The client side of a remote match.
 *
 * A `PlayStore` backed by a room: the session never applies its own actions.
 * It sends them to the room and applies what comes back (`applied` replayed
 * through the shared reducer with the room's dice, or a whole `snapshot`), so
 * both browsers stay identical. Any sequence gap or reducer disagreement asks
 * the room for a fresh snapshot.
 *
 * A dropped socket reconnects with backoff (skipped when the page comes back
 * online or into view) until a snapshot proves the session current again;
 * the room's terminal close codes end the session instead.
 */

import { decisionOwner } from '../play/reduce';
import {
  createReplaceablePlayStore,
  type PlayAction,
  type PlayState,
  type PlayStore,
} from '../play/store';
import {
  CLOSE_BAD_TOKEN,
  CLOSE_EXPIRED,
  CLOSE_FULL,
  CLOSE_VERSION,
  type ClientMessage,
  PROTOCOL_VERSION,
  type Presence,
  type RoomStatus,
  type ServerMessage,
  type Side,
} from './protocol';
import { createQueueDice } from './queueDice';

export interface Transport {
  send(data: string): void;
  close(): void;
  onOpen(cb: () => void): void;
  onMessage(cb: (data: string) => void): void;
  onClose(cb: (code: number) => void): void;
}
export type TransportFactory = (url: string) => Transport;

export interface ConnectionState {
  readonly status: 'connecting' | 'open' | 'reconnecting' | 'closed';
  readonly roomStatus: RoomStatus | null;
  readonly opponentPresent: boolean;
  readonly seq: number;
  readonly error: 'bad-token' | 'version' | 'expired' | 'full' | 'busy' | null;
}

export interface RemoteSessionOptions {
  readonly roomId: string;
  readonly seatToken: string;
  readonly side: Side;
  readonly transport?: TransportFactory;
  readonly baseUrl?: string;
  readonly pace?: (ms: number) => Promise<void>;
  readonly backoffMs?: readonly number[];
}

export interface RemoteSession extends PlayStore {
  readonly side: Side;
  readonly roomId: string;
  getConnection(): ConnectionState;
  subscribeConnection(listener: () => void): () => void;
  reconnectNow(): void;
  dispose(): void;
}

const BUSY_VISIBLE_MS = 5000;
const DEFAULT_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function socketUrl(
  baseUrl: string,
  roomId: string,
  seatToken: string,
): string {
  const ws = baseUrl.replace(/^http/, 'ws').replace(/\/+$/, '');
  return `${ws}/api/rooms/${encodeURIComponent(roomId)}/ws?seat=${encodeURIComponent(seatToken)}`;
}

function webSocketTransport(url: string): Transport {
  const socket = new WebSocket(url);
  return {
    send: (data) => socket.send(data),
    close: () => socket.close(),
    onOpen: (cb) => socket.addEventListener('open', () => cb()),
    onMessage: (cb) =>
      socket.addEventListener('message', (event) => cb(String(event.data))),
    onClose: (cb) =>
      socket.addEventListener('close', (event) => cb(event.code)),
  };
}

function errorForClose(code: number): ConnectionState['error'] {
  switch (code) {
    case CLOSE_BAD_TOKEN:
      return 'bad-token';
    case CLOSE_VERSION:
      return 'version';
    case CLOSE_EXPIRED:
      return 'expired';
    case CLOSE_FULL:
      return 'full';
    default:
      return null;
  }
}

export function createRemoteSession(
  options: RemoteSessionOptions,
): RemoteSession {
  const queue = createQueueDice();
  const inner = createReplaceablePlayStore({ dice: queue });
  const connectionListeners = new Set<() => void>();
  let connection: ConnectionState = {
    status: 'connecting',
    roomStatus: null,
    opponentPresent: false,
    seq: 0,
    error: null,
  };
  let busyTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  /** The current socket; null between a close and the next attempt. */
  let transport: Transport | null = null;
  let socketOpen = false;
  /** Reconnect attempts since the last snapshot, indexing the backoff. */
  let attempt = 0;
  /** Bumped per scheduled wait, so a cancelled wait never connects. */
  let waitToken = 0;
  let waiting = false;
  /** One resync in flight per gap; the next snapshot clears it. */
  let resyncPending = false;

  function setConnection(patch: Partial<ConnectionState>): void {
    connection = { ...connection, ...patch };
    for (const listener of connectionListeners) {
      listener();
    }
  }

  const baseUrl = options.baseUrl ?? globalThis.location?.origin ?? '';
  const factory = options.transport ?? webSocketTransport;
  const url = socketUrl(baseUrl, options.roomId, options.seatToken);
  const pace = options.pace ?? wait;
  const backoffMs =
    options.backoffMs && options.backoffMs.length > 0
      ? options.backoffMs
      : DEFAULT_BACKOFF_MS;

  /** Send a frame, or drop it when the socket is not open. */
  function send(message: ClientMessage): void {
    if (!transport || !socketOpen) {
      return;
    }
    transport.send(JSON.stringify(message));
  }

  function resync(): void {
    if (resyncPending) {
      return;
    }
    resyncPending = true;
    send({ type: 'resync' });
  }

  function opponentPresent(presence: Presence): boolean {
    return options.side === 'white' ? presence.black : presence.white;
  }

  function onApplied(message: Extract<ServerMessage, { type: 'applied' }>) {
    if (message.seq !== connection.seq + 1) {
      resync();
      return;
    }
    queue.push(message.dice);
    const before = inner.getState().match;
    inner.dispatch(message.action);
    if (inner.getState().match === before || queue.pending() > 0) {
      queue.clear();
      resync();
      return;
    }
    setConnection({
      seq: message.seq,
      roomStatus:
        inner.getState().match?.phase === 'match-over'
          ? 'finished'
          : connection.roomStatus,
    });
  }

  function onRejected(reason: string): void {
    resync();
    if (reason !== 'busy') {
      return;
    }
    setConnection({ error: 'busy' });
    if (busyTimer) {
      clearTimeout(busyTimer);
    }
    busyTimer = setTimeout(() => {
      busyTimer = null;
      setConnection({ error: null });
    }, BUSY_VISIBLE_MS);
  }

  function onMessage(data: string): void {
    if (disposed) {
      return;
    }
    let message: ServerMessage;
    try {
      message = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }
    switch (message.type) {
      case 'snapshot':
        queue.clear();
        resyncPending = false;
        attempt = 0;
        // The match first, so a connection listener never sees the new seq
        // alongside the old match.
        inner.replace(message.match);
        setConnection({
          status: 'open',
          seq: message.seq,
          roomStatus: message.status,
          opponentPresent: opponentPresent(message.presence),
        });
        break;
      case 'applied':
        onApplied(message);
        break;
      case 'rejected':
        onRejected(message.reason);
        break;
      case 'presence':
        setConnection({ opponentPresent: opponentPresent(message.presence) });
        break;
    }
  }

  /** Open a socket; `hello` on open, and the room answers with a snapshot. */
  function connect(): void {
    const t = factory(url);
    transport = t;
    socketOpen = false;
    resyncPending = false;
    const current = () => !disposed && transport === t;
    t.onOpen(() => {
      if (!current()) {
        return;
      }
      socketOpen = true;
      send({ type: 'hello', version: PROTOCOL_VERSION });
    });
    t.onMessage((data) => {
      if (current()) {
        onMessage(data);
      }
    });
    t.onClose((code) => {
      if (!current()) {
        return;
      }
      transport = null;
      socketOpen = false;
      const error = errorForClose(code);
      if (error) {
        setConnection({ status: 'closed', error });
        return;
      }
      scheduleReconnect();
    });
  }

  /** Wait out the next backoff step, then try again. */
  function scheduleReconnect(): void {
    setConnection({ status: 'reconnecting' });
    const ms = backoffMs[Math.min(attempt, backoffMs.length - 1)];
    attempt += 1;
    const token = ++waitToken;
    waiting = true;
    void pace(ms).then(() => {
      if (disposed || token !== waitToken) {
        return;
      }
      waiting = false;
      connect();
    });
  }

  function reconnectNow(): void {
    if (disposed || !waiting) {
      return;
    }
    waitToken += 1;
    waiting = false;
    connect();
  }

  function onOnline(): void {
    reconnectNow();
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      reconnectNow();
    }
  }

  const listening = typeof window !== 'undefined';
  if (listening) {
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  connect();

  return {
    side: options.side,
    roomId: options.roomId,
    getState: (): PlayState => inner.getState(),
    subscribe: inner.subscribe,
    dispatch(action: PlayAction) {
      const match = inner.getState().match;
      if (!match) {
        return;
      }
      const owner = decisionOwner(match);
      if (owner === options.side || owner === 'either') {
        send({ type: 'act', action });
      }
    },
    getConnection: () => connection,
    subscribeConnection(listener) {
      connectionListeners.add(listener);
      return () => {
        connectionListeners.delete(listener);
      };
    },
    reconnectNow,
    dispose() {
      disposed = true;
      waitToken += 1;
      waiting = false;
      if (busyTimer) {
        clearTimeout(busyTimer);
      }
      if (listening) {
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      transport?.close();
      transport = null;
      socketOpen = false;
    },
  };
}

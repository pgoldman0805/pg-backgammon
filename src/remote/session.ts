/**
 * The client side of a remote match.
 *
 * A `PlayStore` backed by a room: the session never applies its own actions.
 * It sends them to the room and applies what comes back (`applied` replayed
 * through the shared reducer with the room's dice, or a whole `snapshot`), so
 * both browsers stay identical. Any sequence gap or reducer disagreement asks
 * the room for a fresh snapshot.
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
  readonly error: 'bad-token' | 'version' | 'expired' | 'busy' | null;
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

  function setConnection(patch: Partial<ConnectionState>): void {
    connection = { ...connection, ...patch };
    for (const listener of connectionListeners) {
      listener();
    }
  }

  const baseUrl = options.baseUrl ?? globalThis.location?.origin ?? '';
  const factory = options.transport ?? webSocketTransport;
  const transport = factory(
    socketUrl(baseUrl, options.roomId, options.seatToken),
  );

  function send(message: ClientMessage): void {
    transport.send(JSON.stringify(message));
  }

  function resync(): void {
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
        setConnection({
          seq: message.seq,
          roomStatus: message.status,
          opponentPresent: opponentPresent(message.presence),
        });
        inner.replace(message.match);
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

  transport.onOpen(() => {
    setConnection({ status: 'open' });
    send({ type: 'hello', version: PROTOCOL_VERSION });
  });
  transport.onMessage(onMessage);
  transport.onClose((code) => {
    if (disposed) {
      return;
    }
    // Reconnection with backoff arrives in Task 12; for now a close is final.
    setConnection({
      status: 'closed',
      error: errorForClose(code) ?? connection.error,
    });
  });

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
    reconnectNow() {
      // No-op until reconnection lands (Task 12).
    },
    dispose() {
      disposed = true;
      if (busyTimer) {
        clearTimeout(busyTimer);
      }
      transport.close();
    },
  };
}

/**
 * The I/O-free shell around the room core.
 *
 * Owns the current room record, the attached sockets (as `Sink`s) and the
 * validate/save/route pipeline. The Durable Object and the in-memory loopback
 * both drive it, so it imports no DOM or Worker types. Messages are processed
 * one at a time so a slow save cannot interleave with the next action.
 */

import { isPlayAction } from '../play/reduce';
import type { DiceSource } from '../rules';
import {
  CLOSE_BAD_TOKEN,
  CLOSE_EXPIRED,
  CLOSE_VERSION,
  type ClientMessage,
  type JoinRoomResponse,
  PROTOCOL_VERSION,
  type Presence,
  type ServerMessage,
  type Side,
} from './protocol';
import {
  cancelRoom,
  expireTurn,
  handleMessage,
  isExpired,
  joinRoom,
  type RoomEffect,
  type RoomState,
  seatForToken,
} from './roomCore';

export interface Sink {
  send(data: string): void;
  close(code: number): void;
}

export interface RoomHostOptions {
  readonly room: RoomState;
  readonly dice: DiceSource;
  readonly now: () => number;
  /** Persist the record; reject to signal storage failure (busy). */
  readonly save: (room: RoomState) => Promise<void>;
}

export interface RoomHost {
  readonly room: RoomState;
  /** Attach a socket by token; returns the side or closes with CLOSE_BAD_TOKEN / CLOSE_EXPIRED. */
  attach(token: string, sink: Sink): Side | null;
  detach(sink: Sink): void;
  message(sink: Sink, raw: string): Promise<void>;
  join(
    blackToken: string,
  ): Promise<JoinRoomResponse | { error: 'full' | 'expired' }>;
  presence(): Presence;
  /**
   * Settle a turn whose clock has run out (the Durable Object alarm calls
   * this); a no-op when none has. Rejects when the forfeit cannot be saved,
   * leaving the room as it was so a later tick retries.
   */
  tick(): Promise<void>;
  /**
   * End the room at the request of the seat holding `token`. Rejects when
   * the save fails, leaving the room as it was.
   */
  cancel(token: string): Promise<'cancelled' | 'bad-token' | 'finished'>;
}

const CLIENT_TYPES: readonly string[] = ['hello', 'act', 'resync'];

/**
 * Parse and shape-check an inbound frame, including every action's payload,
 * so a modified client cannot feed the core a malformed action; null for
 * anything unusable.
 */
function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { type } = value as { type?: unknown };
  if (typeof type !== 'string' || !CLIENT_TYPES.includes(type)) {
    return null;
  }
  if (type === 'act') {
    const { action } = value as { action?: unknown };
    return isPlayAction(action) ? { type: 'act', action } : null;
  }
  return value as ClientMessage;
}

export function createRoomHost(options: RoomHostOptions): RoomHost {
  let room = options.room;
  const sinks = new Map<Sink, Side>();
  let queue: Promise<unknown> = Promise.resolve();

  function presence(): Presence {
    const sides = new Set(sinks.values());
    return { white: sides.has('white'), black: sides.has('black') };
  }

  /** Send to every socket of one side, or of both when `side` is null. */
  function sendTo(side: Side | null, message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const [sink, sinkSide] of sinks) {
      if (side === null || sinkSide === side) {
        sink.send(data);
      }
    }
  }

  function detach(sink: Sink): void {
    if (sinks.delete(sink)) {
      sendTo(null, { type: 'presence', presence: presence() });
    }
  }

  function route(effects: readonly RoomEffect[]): void {
    for (const effect of effects) {
      sendTo(effect.type === 'send' ? effect.to : null, effect.message);
    }
  }

  /** Run tasks strictly in order, whatever earlier ones did. */
  function serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  }

  async function process(sink: Sink, raw: string): Promise<void> {
    const side = sinks.get(sink);
    const message = parseClientMessage(raw);
    if (!side || !message) {
      return;
    }
    if (message.type === 'hello' && message.version !== PROTOCOL_VERSION) {
      // An out-of-date client: tell it to reload, and never play its frames.
      detach(sink);
      sink.close(CLOSE_VERSION);
      return;
    }
    const step = handleMessage(
      room,
      side,
      message,
      options.dice,
      options.now(),
      presence(),
    );
    if (step.changed) {
      try {
        await options.save(step.room);
      } catch {
        const busy: ServerMessage = {
          type: 'rejected',
          seq: room.seq,
          reason: 'busy',
        };
        sink.send(JSON.stringify(busy));
        return;
      }
    }
    room = step.room;
    route(step.effects);
  }

  return {
    get room() {
      return room;
    },
    attach(token, sink) {
      const side = seatForToken(room, token);
      if (!side) {
        sink.close(CLOSE_BAD_TOKEN);
        return null;
      }
      if (isExpired(room, options.now())) {
        sink.close(CLOSE_EXPIRED);
        return null;
      }
      sinks.set(sink, side);
      sendTo(null, { type: 'presence', presence: presence() });
      return side;
    },
    detach,
    message: (sink, raw) => serialize(() => process(sink, raw)),
    join(blackToken) {
      return serialize(async () => {
        const step = joinRoom(room, blackToken, options.dice, options.now());
        if ('error' in step) {
          return step;
        }
        await options.save(step.room);
        room = step.room;
        route(step.effects);
        return { side: 'black' as const, seatToken: blackToken };
      });
    },
    presence,
    cancel(token) {
      return serialize(async () => {
        const side = seatForToken(room, token);
        if (!side) {
          return 'bad-token' as const;
        }
        const step = cancelRoom(room, side, options.now(), presence());
        if (!step) {
          return 'finished' as const;
        }
        await options.save(step.room);
        room = step.room;
        route(step.effects);
        return 'cancelled' as const;
      });
    },
    tick() {
      return serialize(async () => {
        const step = expireTurn(room, options.now(), presence());
        if (!step) {
          return;
        }
        await options.save(step.room);
        room = step.room;
        route(step.effects);
      });
    },
  };
}

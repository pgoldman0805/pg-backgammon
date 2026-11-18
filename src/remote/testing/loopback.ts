/**
 * An in-memory wire between sessions and one room host, for tests. Delivery
 * is asynchronous (queueMicrotask) in both directions, so ordering bugs that a
 * synchronous wire would hide still show up.
 */

import type { DiceSource } from '../../rules';
import type { RoomConfig } from '../protocol';
import { createRoom, type RoomState } from '../roomCore';
import { createRoomHost, type RoomHost, type Sink } from '../roomHost';
import type { Transport, TransportFactory } from '../session';

export interface Loopback {
  readonly host: RoomHost;
  readonly whiteToken: string;
  readonly blackToken: string;
  /** Connects a session to the host in memory. */
  transport(): TransportFactory;
  /** Seats Black. */
  join(): Promise<void>;
  /** Drain pending deliveries. */
  flush(): Promise<void>;
}

export function createLoopback(
  config: RoomConfig,
  dice: DiceSource,
  options: {
    save?: (room: RoomState) => Promise<void>;
    /** The room's clock; defaults to a fixed instant. */
    now?: () => number;
  } = {},
): Loopback {
  const whiteToken = 'white-token';
  const blackToken = 'black-token';
  const now = options.now ?? (() => 1_000_000);
  const host = createRoomHost({
    room: createRoom('loop', config, whiteToken, now()),
    dice,
    now,
    save: options.save ?? (() => Promise.resolve()),
  });
  let pending = 0;

  function deliver(task: () => void | Promise<void>): void {
    pending += 1;
    queueMicrotask(() => {
      Promise.resolve(task()).finally(() => {
        pending -= 1;
      });
    });
  }

  return {
    host,
    whiteToken,
    blackToken,
    transport: () => (url) => {
      const token = new URL(url, 'http://loopback').searchParams.get('seat');
      let onOpen: () => void = () => undefined;
      let onMessage: (data: string) => void = () => undefined;
      let onClose: (code: number) => void = () => undefined;
      let closed = false;
      const sink: Sink = {
        send: (data) =>
          deliver(() => {
            if (!closed) {
              onMessage(data);
            }
          }),
        close: (code) => deliver(() => onClose(code)),
      };
      const transport: Transport = {
        send: (data) => deliver(() => host.message(sink, data)),
        close() {
          closed = true;
          host.detach(sink);
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
      deliver(() => {
        if (host.attach(token ?? '', sink)) {
          onOpen();
        }
      });
      return transport;
    },
    async join() {
      const result = await host.join(blackToken);
      if ('error' in result) {
        throw new Error(result.error);
      }
    },
    async flush() {
      for (let i = 0; i < 1000 && pending > 0; i += 1) {
        await Promise.resolve();
      }
      if (pending > 0) {
        throw new Error('loopback did not settle');
      }
    },
  };
}

/**
 * The pure core of a remote-play room.
 *
 * (room, message) in, (room, effects) out, with no I/O, so a Durable Object
 * can wrap it and tests can drive it directly. The room is the authority: it
 * owns the dice, checks that the sender owns the decision, and applies actions
 * through the shared reducer, so both browsers run identical rules.
 */

import { decisionOwner, reduceMatch } from '../play/reduce';
import type { DiceSource, Die, MatchState } from '../rules';
import {
  type ClientMessage,
  FINISHED_TTL_MS,
  type Presence,
  ROOM_TTL_MS,
  type RoomConfig,
  type RoomStatus,
  type RoomSummary,
  type ServerMessage,
  type Side,
} from './protocol';

export interface Seat {
  readonly side: Side;
  readonly token: string;
}

export interface RoomState {
  readonly roomId: string;
  readonly config: RoomConfig;
  readonly seats: readonly Seat[];
  readonly seq: number;
  readonly match: MatchState | null;
  readonly status: RoomStatus;
  /** Epoch ms of the last accepted action or join. */
  readonly lastActivity: number;
  /** Epoch ms the match ended, or null while it is still going. */
  readonly finishedAt: number | null;
}

export type RoomEffect =
  | { type: 'send'; to: Side; message: ServerMessage }
  | { type: 'broadcast'; message: ServerMessage };

export interface RoomStep {
  readonly room: RoomState;
  readonly effects: readonly RoomEffect[];
  /** True when the room record must be persisted (accepted action or join). */
  readonly changed: boolean;
}

/** Actions a client may never submit: the room starts matches, Tutor is local. */
const FORBIDDEN_ACTIONS: readonly string[] = [
  'start',
  'takeback',
  'tutor-assisted',
];

export function createRoom(
  roomId: string,
  config: RoomConfig,
  whiteToken: string,
  now: number,
): RoomState {
  return {
    roomId,
    config,
    seats: [{ side: 'white', token: whiteToken }],
    seq: 0,
    match: null,
    status: 'waiting',
    lastActivity: now,
    finishedAt: null,
  };
}

/** Wrap a dice source and record every die it yields, in order. */
export function recordingDice(source: DiceSource): {
  readonly dice: DiceSource;
  readonly drawn: Die[];
} {
  const drawn: Die[] = [];
  return {
    drawn,
    dice: {
      rollDie(): Die {
        const die = source.rollDie();
        drawn.push(die);
        return die;
      },
    },
  };
}

export function seatForToken(room: RoomState, token: string): Side | null {
  return room.seats.find((seat) => seat.token === token)?.side ?? null;
}

function snapshot(room: RoomState, presence: Presence): ServerMessage {
  return {
    type: 'snapshot',
    seq: room.seq,
    match: room.match,
    status: room.status,
    presence,
  };
}

/** Seat Black and start the match with the room's dice; snapshots both seats. */
export function joinRoom(
  room: RoomState,
  blackToken: string,
  dice: DiceSource,
  now: number,
): RoomStep | { readonly error: 'full' | 'expired' } {
  if (isExpired(room, now)) {
    return { error: 'expired' };
  }
  if (room.seats.length >= 2) {
    return { error: 'full' };
  }
  const match = reduceMatch(
    null,
    { type: 'start', length: room.config.length },
    recordingDice(dice).dice,
  );
  const next: RoomState = {
    ...room,
    seats: [...room.seats, { side: 'black', token: blackToken }],
    seq: 1,
    match,
    status: 'playing',
    lastActivity: now,
  };
  return {
    room: next,
    effects: [
      {
        type: 'broadcast',
        message: snapshot(next, { white: true, black: true }),
      },
    ],
    changed: true,
  };
}

function reject(
  room: RoomState,
  from: Side,
  reason: 'not-your-turn' | 'illegal' | 'not-allowed' | 'not-playing',
): RoomStep {
  return {
    room,
    effects: [
      {
        type: 'send',
        to: from,
        message: { type: 'rejected', seq: room.seq, reason },
      },
    ],
    changed: false,
  };
}

export function handleMessage(
  room: RoomState,
  from: Side,
  message: ClientMessage,
  dice: DiceSource,
  now: number,
  presence: Presence,
): RoomStep {
  switch (message.type) {
    case 'hello':
    case 'resync':
      return {
        room,
        effects: [
          { type: 'send', to: from, message: snapshot(room, presence) },
        ],
        changed: false,
      };
    case 'act':
      break;
    default:
      return { room, effects: [], changed: false };
  }

  const { action } = message;
  if (FORBIDDEN_ACTIONS.includes(action.type)) {
    return reject(room, from, 'not-allowed');
  }
  if (room.status !== 'playing' || !room.match) {
    return reject(room, from, 'not-playing');
  }
  const owner = decisionOwner(room.match);
  if (owner !== from && owner !== 'either') {
    return reject(room, from, 'not-your-turn');
  }
  const recorder = recordingDice(dice);
  const match = reduceMatch(room.match, action, recorder.dice);
  if (!match) {
    return reject(room, from, 'illegal');
  }
  const over = match.phase === 'match-over';
  const next: RoomState = {
    ...room,
    match,
    seq: room.seq + 1,
    lastActivity: now,
    status: over ? 'finished' : room.status,
    finishedAt: over ? now : room.finishedAt,
  };
  return {
    room: next,
    effects: [
      {
        type: 'broadcast',
        message: {
          type: 'applied',
          seq: next.seq,
          side: from,
          action,
          dice: recorder.drawn,
        },
      },
    ],
    changed: true,
  };
}

export function summarize(room: RoomState): RoomSummary {
  return {
    roomId: room.roomId,
    config: room.config,
    status: room.status,
    seats: {
      white: room.seats.some((seat) => seat.side === 'white'),
      black: room.seats.some((seat) => seat.side === 'black'),
    },
  };
}

/** Epoch ms at which the room is gone. */
export function expiryAt(room: RoomState): number {
  return room.status === 'finished' && room.finishedAt !== null
    ? room.finishedAt + FINISHED_TTL_MS
    : room.lastActivity + ROOM_TTL_MS;
}

export function isExpired(room: RoomState, now: number): boolean {
  return now >= expiryAt(room);
}

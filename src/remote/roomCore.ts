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
import { sanitizeName } from './names';
import {
  type ClientMessage,
  FINISHED_TTL_MS,
  type PlayerNames,
  type Presence,
  ROOM_TTL_MS,
  type RoomConfig,
  type RoomStatus,
  type RoomSummary,
  type ServerMessage,
  type Side,
  WAITING_TTL_MS,
} from './protocol';

export interface Seat {
  readonly side: Side;
  readonly token: string;
  /** Cosmetic display name, set from the seat's hello. */
  readonly name?: string;
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
  /** Epoch ms the mover must act by; null when there is no running clock.
   * Absent on records stored before the clock existed (same as null). */
  readonly deadline?: number | null;
  /** The side that ran out of time, once the room has finished that way. */
  readonly forfeitBy?: Side | null;
  /** The side that cancelled the game, once it has been cancelled. */
  readonly cancelledBy?: Side | null;
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
    deadline: null,
    forfeitBy: null,
    cancelledBy: null,
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

export function namesOf(room: RoomState): PlayerNames {
  const nameFor = (side: Side) =>
    room.seats.find((seat) => seat.side === side)?.name ?? null;
  return { white: nameFor('white'), black: nameFor('black') };
}

/** Ms left on the mover's clock at `now`, or null when no clock runs. */
export function msLeft(room: RoomState, now: number): number | null {
  const deadline = room.deadline ?? null;
  return deadline === null ? null : Math.max(0, deadline - now);
}

/**
 * The deadline after the decision moved from `before` to the match's owner: a fresh
 * allowance whenever a different player takes the decision (or none was
 * running), none once nobody is on the move.
 */
function deadlineFor(
  room: RoomState,
  match: MatchState | null,
  before: ReturnType<typeof decisionOwner> | undefined,
  now: number,
): number | null {
  const seconds = room.config.moveSeconds ?? 0;
  const after = match ? decisionOwner(match) : null;
  if (seconds <= 0 || (after !== 'white' && after !== 'black')) {
    return null;
  }
  const running = room.deadline ?? null;
  return before === after && running !== null ? running : now + seconds * 1000;
}

function snapshot(
  room: RoomState,
  presence: Presence,
  now: number,
): ServerMessage {
  return {
    type: 'snapshot',
    seq: room.seq,
    match: room.match,
    status: room.status,
    presence,
    names: namesOf(room),
    msLeft: msLeft(room, now),
    forfeitBy: room.forfeitBy ?? null,
    cancelledBy: room.cancelledBy ?? null,
  };
}

/**
 * End the room at a seat's request, whether the opponent has joined or not.
 * Both seats get a snapshot saying who cancelled. Null when the room has
 * already finished (nothing to cancel).
 */
export function cancelRoom(
  room: RoomState,
  by: Side,
  now: number,
  presence: Presence,
): RoomStep | null {
  if (room.status === 'finished') {
    return null;
  }
  const next: RoomState = {
    ...room,
    status: 'finished',
    finishedAt: now,
    deadline: null,
    cancelledBy: by,
    seq: room.seq + 1,
  };
  return {
    room: next,
    effects: [{ type: 'broadcast', message: snapshot(next, presence, now) }],
    changed: true,
  };
}

/**
 * Forfeit the player on the move when their clock has run out: the room
 * finishes, the clock stops, and both seats get a snapshot. Null when no
 * clock is running or it has not yet run out.
 */
export function expireTurn(
  room: RoomState,
  now: number,
  presence: Presence,
): RoomStep | null {
  const deadline = room.deadline ?? null;
  if (
    room.status !== 'playing' ||
    !room.match ||
    deadline === null ||
    now < deadline
  ) {
    return null;
  }
  const owner = decisionOwner(room.match);
  if (owner !== 'white' && owner !== 'black') {
    return null;
  }
  const next: RoomState = {
    ...room,
    status: 'finished',
    finishedAt: now,
    deadline: null,
    forfeitBy: owner,
    seq: room.seq + 1,
  };
  return {
    room: next,
    effects: [{ type: 'broadcast', message: snapshot(next, presence, now) }],
    changed: true,
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
  // A finished (cancelled or forfeited) room is gone to anyone not yet in it.
  if (room.status === 'finished') {
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
  const started: RoomState = {
    ...next,
    deadline: deadlineFor(next, match, undefined, now),
  };
  return {
    room: started,
    effects: [
      {
        type: 'broadcast',
        message: snapshot(started, { white: true, black: true }, now),
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
  // The server's clock is the authority: a late frame of any kind settles
  // the lapsed turn before it is looked at.
  const lapsed = expireTurn(room, now, presence);
  if (lapsed) {
    return lapsed;
  }
  switch (message.type) {
    case 'hello': {
      const name = sanitizeName(message.name);
      const current = room.seats.find((seat) => seat.side === from)?.name;
      if (!name || name === current) {
        return {
          room,
          effects: [
            { type: 'send', to: from, message: snapshot(room, presence, now) },
          ],
          changed: false,
        };
      }
      const named: RoomState = {
        ...room,
        seats: room.seats.map((seat) =>
          seat.side === from ? { ...seat, name } : seat,
        ),
      };
      return {
        room: named,
        effects: [
          { type: 'send', to: from, message: snapshot(named, presence, now) },
          {
            type: 'send',
            to: from === 'white' ? 'black' : 'white',
            message: { type: 'names', names: namesOf(named) },
          },
        ],
        changed: true,
      };
    }
    case 'resync':
      return {
        room,
        effects: [
          { type: 'send', to: from, message: snapshot(room, presence, now) },
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
  const moved: RoomState = {
    ...room,
    match,
    seq: room.seq + 1,
    lastActivity: now,
    status: over ? 'finished' : room.status,
    finishedAt: over ? now : room.finishedAt,
  };
  const next: RoomState = {
    ...moved,
    deadline: over ? null : deadlineFor(moved, match, owner, now),
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
          msLeft: msLeft(next, now),
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
    names: namesOf(room),
    toMove: toMoveOf(room),
    forfeitBy: room.forfeitBy ?? null,
    cancelledBy: room.cancelledBy ?? null,
  };
}

function toMoveOf(room: RoomState): Side | 'either' | null {
  if (room.status !== 'playing' || !room.match) {
    return null;
  }
  const owner = decisionOwner(room.match);
  return owner === 'white' || owner === 'black' || owner === 'either'
    ? owner
    : null;
}

/** Epoch ms at which the room is gone. */
export function expiryAt(room: RoomState): number {
  if (room.status === 'finished' && room.finishedAt !== null) {
    return room.finishedAt + FINISHED_TTL_MS;
  }
  // An invite nobody has taken lapses sooner than a game in progress.
  return (
    room.lastActivity +
    (room.status === 'waiting' ? WAITING_TTL_MS : ROOM_TTL_MS)
  );
}

export function isExpired(room: RoomState, now: number): boolean {
  return now >= expiryAt(room);
}

/** Epoch ms of the next thing the room must do on its own: a turn clock
 * running out, or the room expiring, whichever comes first. */
export function wakeAt(room: RoomState): number {
  const deadline = room.deadline ?? null;
  return deadline === null
    ? expiryAt(room)
    : Math.min(deadline, expiryAt(room));
}

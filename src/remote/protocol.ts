/**
 * The wire protocol and shared constants for remote play.
 *
 * Types and constants only, no logic, so the browser client and the Worker
 * room both import it. The seat token travels in the WebSocket URL query
 * (`?seat=`), not in `hello`, so the host maps socket to side before any
 * message is parsed.
 */

import type { PlayAction } from '../play/reduce';
import type { Die, MatchState, Player } from '../rules';

export const PROTOCOL_VERSION = 1;

export type Side = Player;

export interface RoomConfig {
  readonly length: number;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'expired';

export interface Presence {
  readonly white: boolean;
  readonly black: boolean;
}

export type RejectReason =
  | 'not-your-turn'
  | 'illegal'
  | 'not-allowed'
  | 'not-playing'
  | 'busy';

export type ClientMessage =
  | { type: 'hello'; version: number }
  | { type: 'act'; action: PlayAction }
  | { type: 'resync' };

export type ServerMessage =
  | {
      type: 'snapshot';
      seq: number;
      match: MatchState | null;
      status: RoomStatus;
      presence: Presence;
    }
  | {
      type: 'applied';
      seq: number;
      side: Side;
      action: PlayAction;
      dice: readonly Die[];
    }
  | { type: 'rejected'; seq: number; reason: RejectReason }
  | { type: 'presence'; presence: Presence };

export interface RoomSummary {
  readonly roomId: string;
  readonly config: RoomConfig;
  readonly status: RoomStatus;
  readonly seats: Presence;
}

export interface CreateRoomResponse {
  readonly roomId: string;
  readonly side: 'white';
  readonly seatToken: string;
}

export interface JoinRoomResponse {
  readonly side: 'black';
  readonly seatToken: string;
}

export const CLOSE_BAD_TOKEN = 4001;
export const CLOSE_VERSION = 4002;
export const CLOSE_EXPIRED = 4003;
export const CLOSE_FULL = 4004;

export const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const FINISHED_TTL_MS = 24 * 60 * 60 * 1000;

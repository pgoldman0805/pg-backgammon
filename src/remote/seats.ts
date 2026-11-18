/**
 * Which seat this device holds in a remote room. The seat token is the only
 * credential for a seat, so it lives in localStorage keyed by room id and is
 * handed between devices through a URL fragment (never sent to a server).
 * Best-effort like `storage/liveMatch.ts`: blocked storage degrades to "no
 * seat" and never throws.
 */

import type { Side } from './protocol';

export const SEAT_KEY_PREFIX = 'pg-backgammon.room.';

export interface StoredSeat {
  readonly side: Side;
  readonly token: string;
}

const TOKEN_RE = /^[0-9a-f]{32}$/;

function isSide(value: unknown): value is Side {
  return value === 'white' || value === 'black';
}

/** Every seat this device holds, one per room, for the "my games" list. */
export function listSeats(): { roomId: string; seat: StoredSeat }[] {
  const found: { roomId: string; seat: StoredSeat }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(SEAT_KEY_PREFIX)) {
        continue;
      }
      const roomId = key.slice(SEAT_KEY_PREFIX.length);
      const seat = readSeat(roomId);
      if (seat) {
        found.push({ roomId, seat });
      }
    }
  } catch {
    return [];
  }
  return found;
}

export function readSeat(roomId: string): StoredSeat | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SEAT_KEY_PREFIX + roomId);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const { side, token } = parsed as Record<string, unknown>;
    return isSide(side) && typeof token === 'string' && token !== ''
      ? { side, token }
      : null;
  } catch {
    return null;
  }
}

export function writeSeat(roomId: string, seat: StoredSeat): void {
  try {
    localStorage.setItem(SEAT_KEY_PREFIX + roomId, JSON.stringify(seat));
  } catch {
    // Ignore: a blocked/full localStorage must never break the page.
  }
}

export function clearSeat(roomId: string): void {
  try {
    localStorage.removeItem(SEAT_KEY_PREFIX + roomId);
  } catch {
    // Ignore.
  }
}

/** `#seat=<token>&side=<white|black>` → store it and strip the fragment. */
export function adoptSeatFromFragment(
  roomId: string,
  hash: string,
): StoredSeat | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('seat');
  const side = params.get('side');
  if (token === null || !TOKEN_RE.test(token) || !isSide(side)) {
    return null;
  }
  const seat: StoredSeat = { side, token };
  writeSeat(roomId, seat);
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    // Ignore: no history API (or no location) just leaves the fragment.
  }
  return seat;
}

export function inviteLink(origin: string, roomId: string): string {
  return `${origin}/play/${roomId}`;
}

export function privateLink(
  origin: string,
  roomId: string,
  seat: StoredSeat,
): string {
  return `${inviteLink(origin, roomId)}#seat=${seat.token}&side=${seat.side}`;
}

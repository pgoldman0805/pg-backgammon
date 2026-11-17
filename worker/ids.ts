/**
 * Unguessable identifiers for remote-play rooms and seats.
 *
 * The room id is the game URL's secret (lowercase base32, so it survives
 * case-folding and reads cleanly); the seat token proves a socket's side.
 */

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

/** 20 base32 characters: 100 random bits. */
export function newRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let id = '';
  for (const byte of bytes) {
    id += BASE32[byte & 31];
  }
  return id;
}

/** 32 lowercase hex characters: 128 random bits. */
export function newSeatToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let token = '';
  for (const byte of bytes) {
    token += byte.toString(16).padStart(2, '0');
  }
  return token;
}

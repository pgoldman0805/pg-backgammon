/** Tests for seat storage: round trip, fragment adoption and link building. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adoptSeatFromFragment,
  clearSeat,
  inviteLink,
  listSeats,
  privateLink,
  readSeat,
  SEAT_KEY_PREFIX,
  writeSeat,
} from './seats';

const TOKEN = 'a'.repeat(32);

afterEach(() => {
  localStorage.clear();
  history.replaceState(null, '', '/');
});

describe('seat storage', () => {
  it('round trips and clears a seat', () => {
    expect(readSeat('r1')).toBeNull();
    writeSeat('r1', { side: 'white', token: TOKEN });
    expect(readSeat('r1')).toEqual({ side: 'white', token: TOKEN });
    expect(localStorage.getItem(`${SEAT_KEY_PREFIX}r1`)).not.toBeNull();
    clearSeat('r1');
    expect(readSeat('r1')).toBeNull();
  });

  it('treats corrupt stored data as no seat', () => {
    localStorage.setItem(`${SEAT_KEY_PREFIX}r1`, '{nope');
    expect(readSeat('r1')).toBeNull();
    localStorage.setItem(`${SEAT_KEY_PREFIX}r1`, '{"side":"red","token":"x"}');
    expect(readSeat('r1')).toBeNull();
  });
});

describe('adoptSeatFromFragment', () => {
  it('stores the seat and strips the fragment', () => {
    history.replaceState(null, '', '/play/r1?x=1#seat=abc');
    const token = 'b'.repeat(32);
    const seat = adoptSeatFromFragment('r1', `#side=black&seat=${token}`);
    expect(seat).toEqual({ side: 'black', token });
    expect(readSeat('r1')).toEqual(seat);
    expect(location.hash).toBe('');
    expect(location.pathname + location.search).toBe('/play/r1?x=1');
  });

  it('ignores bad fragments and stores nothing', () => {
    for (const hash of [
      '',
      '#seat=short&side=white',
      `#seat=${TOKEN}`,
      `#seat=${TOKEN}&side=red`,
      `#seat=${'z'.repeat(32)}&side=white`,
    ]) {
      expect(adoptSeatFromFragment('r1', hash)).toBeNull();
    }
    expect(readSeat('r1')).toBeNull();
  });
});

describe('links', () => {
  it('builds invite and private links', () => {
    const seat = { side: 'white' as const, token: TOKEN };
    expect(inviteLink('https://x.test', 'r1')).toBe('https://x.test/play/r1');
    const priv = privateLink('https://x.test', 'r1', seat);
    expect(priv).toBe(`https://x.test/play/r1#seat=${TOKEN}&side=white`);
    expect(priv).not.toBe(inviteLink('https://x.test', 'r1'));
  });
});

describe('listSeats', () => {
  it('lists every stored seat with its room id', () => {
    localStorage.clear();
    writeSeat('roomaaaaaaaaaaaaaaaa', { side: 'white', token: 'a'.repeat(32) });
    writeSeat('roombbbbbbbbbbbbbbbb', { side: 'black', token: 'b'.repeat(32) });
    localStorage.setItem('unrelated', 'x');
    localStorage.setItem(`${SEAT_KEY_PREFIX}broken`, '{nope');
    const seats = listSeats();
    expect(seats.map((s) => s.roomId).sort()).toEqual([
      'roomaaaaaaaaaaaaaaaa',
      'roombbbbbbbbbbbbbbbb',
    ]);
    expect(
      seats.find((s) => s.roomId === 'roombbbbbbbbbbbbbbbb')?.seat,
    ).toEqual({ side: 'black', token: 'b'.repeat(32) });
  });

  it('is empty when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(listSeats()).toEqual([]);
    spy.mockRestore();
  });
});

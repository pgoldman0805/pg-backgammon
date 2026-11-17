/**
 * The room lifecycle hook: which view a visitor to /play/:roomId gets (join,
 * full, ended, seated), seat storage on join, and a live session over the
 * in-memory loopback room once seated.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { RemoteApi } from '../../remote/api';
import type { RoomSummary } from '../../remote/protocol';
import { readSeat, writeSeat } from '../../remote/seats';
import type { TransportFactory } from '../../remote/session';
import { createLoopback } from '../../remote/testing/loopback';
import { scriptedDice } from '../../test/dice';
import { type RemoteDeps, useRemoteRoom } from './useRemoteRoom';

const ROOM = 'loop';

function summary(patch: Partial<RoomSummary> = {}): RoomSummary {
  return {
    roomId: ROOM,
    config: { length: 5 },
    status: 'waiting',
    seats: { white: true, black: false },
    ...patch,
  };
}

function fakeApi(overrides: Partial<RemoteApi> = {}): RemoteApi {
  return {
    createRoom: vi.fn(() => Promise.reject(new Error('unused'))),
    getRoom: vi.fn(() => Promise.resolve(summary())),
    joinRoom: vi.fn(() => Promise.resolve(null)),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('useRemoteRoom', () => {
  it('returns null without a room id', () => {
    const { result } = renderHook(() =>
      useRemoteRoom(undefined, { api: fakeApi(), origin: 'http://test' }),
    );
    expect(result.current).toBeNull();
  });

  it('shows join for a waiting room without a seat', async () => {
    const deps = { api: fakeApi(), origin: 'http://test' };
    const { result } = renderHook(() => useRemoteRoom(ROOM, deps));
    expect(result.current?.kind).toBe('loading');
    await waitFor(() => expect(result.current?.kind).toBe('join'));
    const view = result.current;
    if (view?.kind !== 'join') {
      throw new Error('expected join');
    }
    expect(view.summary.config.length).toBe(5);
    expect(view.joining).toBe(false);
  });

  it('joining stores the seat and yields a seated Black view', async () => {
    const loop = createLoopback({ length: 3 }, scriptedDice(6, 3));
    const api = fakeApi({
      joinRoom: vi.fn(async () => {
        await loop.join();
        return { side: 'black' as const, seatToken: loop.blackToken };
      }),
    });
    const deps: RemoteDeps = {
      api,
      transport: loop.transport(),
      origin: 'http://test',
    };
    const { result } = renderHook(() => useRemoteRoom(ROOM, deps));
    await waitFor(() => expect(result.current?.kind).toBe('join'));
    const view = result.current;
    if (view?.kind !== 'join') {
      throw new Error('expected join');
    }
    await act(async () => {
      await view.join();
    });
    expect(api.joinRoom).toHaveBeenCalledWith(ROOM);
    expect(readSeat(ROOM)).toEqual({ side: 'black', token: loop.blackToken });
    await act(async () => {
      await loop.flush();
    });
    const seated = result.current;
    if (seated?.kind !== 'seated') {
      throw new Error('expected seated');
    }
    expect(seated.side).toBe('black');
    expect(seated.connection.status).toBe('open');
    expect(seated.connection.roomStatus).toBe('playing');
    expect(seated.session.getState().match?.phase).toBe('turn');
    expect(seated.inviteLink).toBe(`http://test/play/${ROOM}`);
    expect(seated.privateLink).toBe(
      `http://test/play/${ROOM}#seat=${loop.blackToken}&side=black`,
    );
  });

  it('a stored seat connects straight away', async () => {
    const loop = createLoopback({ length: 3 }, scriptedDice(6, 3));
    writeSeat(ROOM, { side: 'white', token: loop.whiteToken });
    let closed = 0;
    const transport: TransportFactory = (url) => {
      const t = loop.transport()(url);
      const close = t.close.bind(t);
      t.close = () => {
        closed += 1;
        close();
      };
      return t;
    };
    const api = fakeApi();
    const { result, unmount } = renderHook(() =>
      useRemoteRoom(ROOM, { api, transport, origin: 'http://test' }),
    );
    expect(result.current?.kind).toBe('seated');
    expect(api.getRoom).not.toHaveBeenCalled();
    await act(async () => {
      await loop.flush();
    });
    expect(result.current).toMatchObject({
      kind: 'seated',
      side: 'white',
      connection: { status: 'open', roomStatus: 'waiting' },
    });
    unmount();
    expect(closed).toBe(1);
  });

  it('a full room shows full; a 404 shows ended', async () => {
    const full = renderHook(() =>
      useRemoteRoom(ROOM, {
        api: fakeApi({
          getRoom: () =>
            Promise.resolve(
              summary({
                status: 'playing',
                seats: { white: true, black: true },
              }),
            ),
        }),
        origin: 'http://test',
      }),
    );
    await waitFor(() => expect(full.result.current?.kind).toBe('full'));

    const missing = renderHook(() =>
      useRemoteRoom(ROOM, {
        api: fakeApi({ getRoom: () => Promise.resolve(null) }),
        origin: 'http://test',
      }),
    );
    await waitFor(() => expect(missing.result.current?.kind).toBe('ended'));

    const expired = renderHook(() =>
      useRemoteRoom(ROOM, {
        api: fakeApi({
          getRoom: () => Promise.resolve(summary({ status: 'expired' })),
        }),
        origin: 'http://test',
      }),
    );
    await waitFor(() => expect(expired.result.current?.kind).toBe('ended'));
  });

  it('adopts a seat from the URL fragment', async () => {
    const token = 'ab'.repeat(16);
    window.history.replaceState(
      null,
      '',
      `/play/${ROOM}#seat=${token}&side=white`,
    );
    const loop = createLoopback({ length: 3 }, scriptedDice(6, 3));
    const api = fakeApi();
    const { result } = renderHook(() =>
      useRemoteRoom(ROOM, {
        api,
        transport: loop.transport(),
        origin: 'http://test',
      }),
    );
    expect(result.current).toMatchObject({ kind: 'seated', side: 'white' });
    expect(readSeat(ROOM)).toEqual({ side: 'white', token });
    expect(window.location.hash).toBe('');
    expect(api.getRoom).not.toHaveBeenCalled();
    await act(async () => {
      await loop.flush();
    });
  });
});

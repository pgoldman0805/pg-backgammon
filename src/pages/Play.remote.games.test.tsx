/**
 * Turn indicators in a remote game, and the "Your online games" list on the
 * setup card: every room this device holds a seat in, with whose move it is
 * and a way to cancel (or clear) each one.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createFakeEngine } from '../engine/fake';
import type { RemoteApi } from '../remote/api';
import type { RoomSummary, Side } from '../remote/protocol';
import { readSeat, writeSeat } from '../remote/seats';
import { createRemoteSession } from '../remote/session';
import { createLoopback } from '../remote/testing/loopback';
import { createMemoryStorage } from '../storage';
import { scriptedDice } from '../test/dice';
import { Play } from './Play';

const ROOM = 'loop';
const token = (c: string) => c.repeat(32);

beforeEach(() => {
  localStorage.clear();
  document.title = 'pg-backgammon';
});

function fakeApi(overrides: Partial<RemoteApi> = {}): RemoteApi {
  return {
    createRoom: vi.fn(() => Promise.reject(new Error('unused'))),
    getRoom: vi.fn(() => Promise.resolve(null)),
    joinRoom: vi.fn(() => Promise.resolve(null)),
    cancelRoom: vi.fn(() => Promise.resolve('cancelled' as const)),
    ...overrides,
  };
}

async function renderSeated(side: Side, opponentName?: string) {
  const loop = createLoopback({ length: 3 }, scriptedDice(6, 3, 5, 2));
  if (side === 'black') {
    await loop.join();
  }
  writeSeat(ROOM, {
    side,
    token: side === 'white' ? loop.whiteToken : loop.blackToken,
  });
  const view = render(
    <MemoryRouter>
      <Play
        roomId={ROOM}
        remote={{
          api: fakeApi(),
          transport: loop.transport(),
          origin: 'http://test',
        }}
        engine={createFakeEngine()}
        storage={createMemoryStorage()}
        opponentStepMs={0}
      />
    </MemoryRouter>,
  );
  await act(async () => {
    await loop.flush();
  });
  const other: Side = side === 'white' ? 'black' : 'white';
  if (other === 'black') {
    await loop.join();
  }
  createRemoteSession({
    roomId: ROOM,
    seatToken: other === 'white' ? loop.whiteToken : loop.blackToken,
    side: other,
    transport: loop.transport(),
    pace: () => Promise.resolve(),
    name: opponentName,
  });
  await act(async () => {
    await loop.flush();
  });
  return { loop, view };
}

describe('turn indicators', () => {
  it('says Your turn on your move and flags the tab', async () => {
    await renderSeated('white');
    expect(screen.getByText('Your turn')).toBeVisible();
    expect(document.title).toBe('Your turn - pg-backgammon');
  });

  it('says who you are waiting for on the opponent move', async () => {
    await renderSeated('black', undefined);
    expect(screen.getByText('Waiting for White')).toBeVisible();
    expect(document.title).toBe('pg-backgammon');
  });

  it('uses the opponent name when they set one', async () => {
    await renderSeated('black', 'Alice');
    expect(screen.getByText('Waiting for Alice')).toBeVisible();
  });

  it('restores the tab title when the game is left', async () => {
    const { view } = await renderSeated('white');
    expect(document.title).toContain('Your turn');
    view.unmount();
    expect(document.title).toBe('pg-backgammon');
  });
});

describe('cancelled game', () => {
  it('tells you what happened when the opponent cancels', async () => {
    const { loop } = await renderSeated('white', 'Bob');
    await act(async () => {
      await loop.host.cancel(loop.blackToken);
      await loop.flush();
    });
    expect(await screen.findByText('Bob cancelled the game.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Leave game' })).toBeVisible();
    expect(screen.queryByText('Your turn')).toBeNull();
  });

  it('tells you when you cancelled it yourself', async () => {
    const { loop } = await renderSeated('white');
    await act(async () => {
      await loop.host.cancel(loop.whiteToken);
      await loop.flush();
    });
    expect(await screen.findByText('You cancelled the game.')).toBeVisible();
  });
});

function summary(over: Partial<RoomSummary>): RoomSummary {
  return {
    roomId: 'x',
    config: { length: 5 },
    status: 'playing',
    seats: { white: true, black: true },
    names: { white: null, black: null },
    toMove: 'white',
    forfeitBy: null,
    cancelledBy: null,
    ...over,
  };
}

function renderSetup(api: RemoteApi) {
  return render(
    <MemoryRouter>
      <Play
        remote={{ api, origin: 'http://test' }}
        engine={createFakeEngine()}
        storage={createMemoryStorage()}
      />
    </MemoryRouter>,
  );
}

function rowFor(element: HTMLElement): HTMLElement {
  const row = element.closest('li');
  if (!row) {
    throw new Error('no row for element');
  }
  return row;
}

describe('Your online games', () => {
  it('is absent when this device has no online games', () => {
    renderSetup(fakeApi());
    expect(screen.queryByText('Your online games')).toBeNull();
  });

  it('lists each game with whose move it is, your turn first', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    writeSeat('bbbbbbbbbbbbbbbbbbbb', { side: 'black', token: token('b') });
    writeSeat('cccccccccccccccccccc', { side: 'white', token: token('c') });
    const rooms: Record<string, RoomSummary> = {
      aaaaaaaaaaaaaaaaaaaa: summary({
        toMove: 'black',
        names: { white: null, black: 'Bob' },
      }),
      bbbbbbbbbbbbbbbbbbbb: summary({
        toMove: 'black',
        names: { white: 'Alice', black: null },
      }),
      cccccccccccccccccccc: summary({
        status: 'waiting',
        seats: { white: true, black: false },
        toMove: null,
      }),
    };
    renderSetup(
      fakeApi({
        getRoom: vi.fn((id: string) => Promise.resolve(rooms[id] ?? null)),
      }),
    );
    expect(await screen.findByText('Your turn')).toBeVisible();
    expect(screen.getByText('Waiting for Bob')).toBeVisible();
    expect(screen.getByText('Waiting for an opponent to join')).toBeVisible();
    const items = within(
      screen.getByRole('list', { name: 'Your online games' }),
    ).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Your turn');
    expect(
      within(items[0]).getByRole('link', { name: 'Open' }),
    ).toHaveAttribute('href', '/play/bbbbbbbbbbbbbbbbbbbb');
  });

  it('shows how finished and vanished games ended', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    writeSeat('bbbbbbbbbbbbbbbbbbbb', { side: 'white', token: token('b') });
    writeSeat('cccccccccccccccccccc', { side: 'white', token: token('c') });
    const rooms: Record<string, RoomSummary> = {
      aaaaaaaaaaaaaaaaaaaa: summary({
        status: 'finished',
        toMove: null,
        cancelledBy: 'black',
        names: { white: null, black: 'Bob' },
      }),
      bbbbbbbbbbbbbbbbbbbb: summary({
        status: 'finished',
        toMove: null,
        forfeitBy: 'white',
      }),
    };
    renderSetup(
      fakeApi({
        getRoom: vi.fn((id: string) => Promise.resolve(rooms[id] ?? null)),
      }),
    );
    expect(await screen.findByText('Bob cancelled the game')).toBeVisible();
    expect(screen.getByText('You ran out of time')).toBeVisible();
    expect(screen.getByText('This game has ended')).toBeVisible();
  });

  it('cancels a game after confirming, on the server and locally', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    const cancelRoom = vi.fn(() => Promise.resolve('cancelled' as const));
    renderSetup(
      fakeApi({
        getRoom: vi.fn(() => Promise.resolve(summary({}))),
        cancelRoom,
      }),
    );
    await screen.findByText('Your turn');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel game' }));
    expect(cancelRoom).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }));
    await waitFor(() =>
      expect(cancelRoom).toHaveBeenCalledWith(
        'aaaaaaaaaaaaaaaaaaaa',
        token('a'),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText('Your online games')).toBeNull(),
    );
    expect(readSeat('aaaaaaaaaaaaaaaaaaaa')).toBeNull();
  });

  it('keeps the game when the confirmation is declined', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    renderSetup(
      fakeApi({ getRoom: vi.fn(() => Promise.resolve(summary({}))) }),
    );
    await screen.findByText('Your turn');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.getByRole('button', { name: 'Cancel game' })).toBeVisible();
    expect(readSeat('aaaaaaaaaaaaaaaaaaaa')).not.toBeNull();
  });

  it('keeps the game and says so when the server cannot be reached', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    renderSetup(
      fakeApi({
        getRoom: vi.fn(() => Promise.resolve(summary({}))),
        cancelRoom: vi.fn(() => Promise.reject(new Error('offline'))),
      }),
    );
    await screen.findByText('Your turn');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't cancel the game. Check your connection and try again.",
    );
    expect(readSeat('aaaaaaaaaaaaaaaaaaaa')).not.toBeNull();
  });

  it('removes a game that already ended without asking the server', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    const cancelRoom = vi.fn(() => Promise.resolve('cancelled' as const));
    renderSetup(fakeApi({ cancelRoom }));
    await screen.findByText('This game has ended');
    expect(screen.queryByRole('button', { name: 'Cancel game' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(cancelRoom).not.toHaveBeenCalled();
    expect(readSeat('aaaaaaaaaaaaaaaaaaaa')).toBeNull();
  });

  it('still offers Open and Cancel when a game cannot be checked', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    renderSetup(
      fakeApi({ getRoom: vi.fn(() => Promise.reject(new Error('offline'))) }),
    );
    const row = rowFor(await screen.findByText("Couldn't check this game"));
    expect(within(row).getByRole('link', { name: 'Open' })).toBeVisible();
    expect(
      within(row).getByRole('button', { name: 'Cancel game' }),
    ).toBeVisible();
  });

  it('treats a cancel the server calls gone as done', async () => {
    writeSeat('aaaaaaaaaaaaaaaaaaaa', { side: 'white', token: token('a') });
    renderSetup(
      fakeApi({
        getRoom: vi.fn(() => Promise.resolve(summary({}))),
        cancelRoom: vi.fn(() => Promise.resolve('gone' as const)),
      }),
    );
    await screen.findByText('Your turn');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }));
    await waitFor(() => expect(readSeat('aaaaaaaaaaaaaaaaaaaa')).toBeNull());
  });
});

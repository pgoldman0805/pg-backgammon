/**
 * The Play page's remote names and move clock: the name and timer choices on
 * the setup card and join panel, names in the HUD, the countdown that shows
 * only on your own turn, and what each player sees when a clock runs out.
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
import {
  readMoveSeconds,
  readPlayerName,
  writePlayerName,
} from '../remote/playerPrefs';
import type { Side } from '../remote/protocol';
import { writeSeat } from '../remote/seats';
import { createRemoteSession } from '../remote/session';
import { createLoopback, type Loopback } from '../remote/testing/loopback';
import { createMemoryStorage } from '../storage';
import { scriptedDice } from '../test/dice';
import { Play } from './Play';
import { initialSetup } from './play/playFormat';

const ROOM = 'loop';

beforeEach(() => {
  localStorage.clear();
});

function fakeApi(overrides: Partial<RemoteApi> = {}): RemoteApi {
  return {
    createRoom: vi.fn(() => Promise.reject(new Error('unused'))),
    getRoom: vi.fn(() => Promise.resolve(null)),
    joinRoom: vi.fn(() => Promise.resolve(null)),
    ...overrides,
  };
}

async function settle(loop: Loopback): Promise<void> {
  await act(async () => {
    await loop.flush();
  });
}

/** The page seated at `side` in a room with `moveSeconds`, opponent named. */
async function renderSeated(
  side: Side,
  moveSeconds: number | undefined,
  opponentName?: string,
) {
  const clock = { now: 1_000_000 };
  const loop = createLoopback(
    { length: 3, moveSeconds },
    scriptedDice(6, 3, 5, 2),
    { now: () => clock.now },
  );
  if (side === 'black') {
    await loop.join();
  }
  writeSeat(ROOM, {
    side,
    token: side === 'white' ? loop.whiteToken : loop.blackToken,
  });
  render(
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
  await settle(loop);
  const other: Side = side === 'white' ? 'black' : 'white';
  if (other === 'black') {
    await loop.join();
  }
  const opponent = createRemoteSession({
    roomId: ROOM,
    seatToken: other === 'white' ? loop.whiteToken : loop.blackToken,
    side: other,
    transport: loop.transport(),
    pace: () => Promise.resolve(),
    name: opponentName,
  });
  await settle(loop);
  return { loop, clock, opponent };
}

describe('names in the HUD', () => {
  it('shows both players by name once seated', async () => {
    writePlayerName('Alice');
    await renderSeated('white', undefined, 'Bob');
    const chips = document.querySelectorAll('.chip-name');
    expect([...chips].map((chip) => chip.textContent)).toEqual([
      'Alice',
      'Bob',
    ]);
  });

  it('falls back to the colours when nobody set a name', async () => {
    await renderSeated('white', undefined);
    const chips = document.querySelectorAll('.chip-name');
    expect([...chips].map((chip) => chip.textContent)).toEqual([
      'White',
      'Black',
    ]);
  });
});

describe('move countdown', () => {
  it('shows the time left only on your own turn', async () => {
    await renderSeated('white', 30);
    expect(
      screen.getByRole('timer', { name: 'Time left for your move' }),
    ).toHaveTextContent('0:30');
  });

  it("is hidden while it is the opponent's turn", async () => {
    await renderSeated('black', 30);
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('is hidden when the game has no clock', async () => {
    await renderSeated('white', 0);
    expect(screen.queryByRole('timer')).toBeNull();
  });
});

describe('running out of time', () => {
  it('tells the player who timed out, and offers to leave', async () => {
    const { loop, clock } = await renderSeated('white', 15);
    clock.now += 15_000;
    await act(async () => {
      await loop.host.tick();
      await loop.flush();
    });
    expect(await screen.findByText('You ran out of time.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Leave game' })).toBeVisible();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('tells the other player they win, using the opponent name', async () => {
    const { loop, clock } = await renderSeated('black', 15, 'Alice');
    clock.now += 15_000;
    await act(async () => {
      await loop.host.tick();
      await loop.flush();
    });
    expect(
      await screen.findByText('Alice ran out of time. You win.'),
    ).toBeVisible();
  });
});

describe('the setup card', () => {
  function renderSetup(api: RemoteApi) {
    return render(
      <MemoryRouter>
        <Play
          defaultSetup={{ ...initialSetup(), length: 5 }}
          remote={{ api, origin: 'http://test' }}
          engine={createFakeEngine()}
          storage={createMemoryStorage()}
        />
      </MemoryRouter>,
    );
  }

  it('offers a move timer defaulting to 30 seconds', () => {
    renderSetup(fakeApi());
    const select = screen.getByRole('combobox', { name: 'Time per turn' });
    expect(select).toHaveValue('30');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'No timer',
      '15 seconds',
      '30 seconds',
      '1 minute',
      '2 minutes',
    ]);
  });

  it('creates the room with the chosen timer and remembers it', async () => {
    const createRoom = vi.fn(() =>
      Promise.resolve({
        roomId: 'abc',
        side: 'white' as const,
        seatToken: 'a'.repeat(32),
      }),
    );
    renderSetup(fakeApi({ createRoom }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Time per turn' }), {
      target: { value: '60' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Play a friend online' }),
    );
    await waitFor(() => expect(createRoom).toHaveBeenCalledWith(5, 60));
    expect(readMoveSeconds()).toBe(60);
  });

  it('can create an untimed game', async () => {
    const createRoom = vi.fn(() =>
      Promise.resolve({
        roomId: 'abc',
        side: 'white' as const,
        seatToken: 'a'.repeat(32),
      }),
    );
    renderSetup(fakeApi({ createRoom }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Time per turn' }), {
      target: { value: '0' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Play a friend online' }),
    );
    await waitFor(() => expect(createRoom).toHaveBeenCalledWith(5, 0));
  });

  it('remembers the name typed for online games', () => {
    renderSetup(fakeApi());
    const input = screen.getByRole('textbox', { name: 'Your name' });
    expect(input).toHaveAttribute('maxlength', '20');
    fireEvent.change(input, { target: { value: 'Alice' } });
    expect(readPlayerName()).toBe('Alice');
  });
});

describe('the join panel', () => {
  it('shows who invited you, the clock, and takes a name', async () => {
    const api = fakeApi({
      getRoom: vi.fn(() =>
        Promise.resolve({
          roomId: 'r',
          config: { length: 5, moveSeconds: 30 },
          status: 'waiting' as const,
          seats: { white: true, black: false },
          names: { white: 'Alice', black: null },
        }),
      ),
    });
    render(
      <MemoryRouter>
        <Play
          roomId="r"
          remote={{ api, origin: 'http://test' }}
          engine={createFakeEngine()}
          storage={createMemoryStorage()}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Alice invited you.')).toBeVisible();
    expect(
      screen.getByText('5-point match, 30 seconds per turn'),
    ).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), {
      target: { value: 'Bob' },
    });
    expect(readPlayerName()).toBe('Bob');
  });

  it('says there is no timer for an untimed game', async () => {
    const api = fakeApi({
      getRoom: vi.fn(() =>
        Promise.resolve({
          roomId: 'r',
          config: { length: 3 },
          status: 'waiting' as const,
          seats: { white: true, black: false },
          names: { white: null, black: null },
        }),
      ),
    });
    render(
      <MemoryRouter>
        <Play
          roomId="r"
          remote={{ api, origin: 'http://test' }}
          engine={createFakeEngine()}
          storage={createMemoryStorage()}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText('3-point match, no timer')).toBeVisible();
  });
});

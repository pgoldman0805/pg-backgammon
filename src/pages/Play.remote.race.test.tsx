/**
 * Finish race and the auto-roll toggle in a remote game: the controls a
 * player has over their own side only. The race autopilot plays the local
 * seat's turns through the room; it never touches the opponent's, and it lets
 * go when the connection drops.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createFakeEngine } from '../engine/fake';
import { AUTO_ROLL_KEY } from '../play/settings';
import type { RemoteApi } from '../remote/api';
import type { Side } from '../remote/protocol';
import type { RoomState } from '../remote/roomCore';
import { writeSeat } from '../remote/seats';
import type { TransportFactory } from '../remote/session';
import { createLoopback, type Loopback } from '../remote/testing/loopback';
import {
  createBoard,
  createGame,
  createMatch,
  type DiceRoll,
  type Player,
} from '../rules';
import { createMemoryStorage } from '../storage';
import { scriptedDice } from '../test/dice';
import { Play } from './Play';

const ROOM = 'loop';

beforeEach(() => {
  localStorage.clear();
});

function fakeApi(): RemoteApi {
  return {
    createRoom: vi.fn(() => Promise.reject(new Error('unused'))),
    getRoom: vi.fn(() => Promise.resolve(null)),
    joinRoom: vi.fn(() => Promise.resolve(null)),
    cancelRoom: vi.fn(() => Promise.resolve('cancelled' as const)),
  };
}

/** A pure no-contact race with `player` to move on `roll`. */
function raceRoom(
  base: RoomState,
  tokens: { white: string; black: string },
  player: Player,
  roll: DiceRoll,
): RoomState {
  return {
    ...base,
    seats: [
      { side: 'white', token: tokens.white },
      { side: 'black', token: tokens.black },
    ],
    status: 'playing',
    seq: 1,
    match: createMatch({
      length: 5,
      game: createGame({
        board: createBoard({
          white: { points: { 6: 5, 5: 5, 4: 5 } },
          black: { points: { 19: 5, 20: 5, 21: 5 } },
        }),
        player,
        roll,
      }),
    }),
  };
}

async function renderRace(side: Side, mover: Player) {
  const loop = createLoopback({ length: 5 }, scriptedDice(6, 3, 5, 2), {
    prepare: (room, tokens) => raceRoom(room, tokens, mover, [2, 1]),
  });
  writeSeat(ROOM, {
    side,
    token: side === 'white' ? loop.whiteToken : loop.blackToken,
  });
  let drop: () => void = () => {};
  const transport: TransportFactory = (url) => {
    const t = loop.transport()(url);
    let closed: (code: number) => void = () => {};
    const onClose = t.onClose.bind(t);
    t.onClose = (cb) => {
      closed = cb;
      onClose(cb);
    };
    drop = () => {
      t.close();
      closed(1006);
    };
    return t;
  };
  render(
    <MemoryRouter>
      <Play
        roomId={ROOM}
        remote={{ api: fakeApi(), transport, origin: 'http://test' }}
        engine={createFakeEngine()}
        storage={createMemoryStorage()}
        opponentStepMs={0}
      />
    </MemoryRouter>,
  );
  await settle(loop);
  return { loop, drop: () => drop() };
}

async function settle(loop: Loopback) {
  await act(async () => {
    await loop.flush();
  });
}

const finishRace = () => screen.queryByRole('button', { name: 'Finish race' });
const plays = (loop: Loopback) =>
  loop.host.room.match?.game.record.plays.length ?? 0;

describe('Finish race in a remote game', () => {
  it('is offered, unpressed, once the position is a race', async () => {
    await renderRace('white', 'white');
    expect(finishRace()).toHaveAttribute('aria-pressed', 'false');
  });

  it('is absent from a contact position', async () => {
    const loop = createLoopback({ length: 5 }, scriptedDice(6, 3, 5, 2));
    await loop.join();
    writeSeat(ROOM, { side: 'white', token: loop.whiteToken });
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
    expect(finishRace()).toBeNull();
  });

  it('plays my turn through the room when pressed', async () => {
    const { loop } = await renderRace('white', 'white');
    fireEvent.click(screen.getByRole('button', { name: 'Finish race' }));
    await waitFor(() => expect(plays(loop)).toBeGreaterThanOrEqual(1));
    await settle(loop);
    expect(loop.host.room.match?.game.record.plays[0].player).toBe('white');
  });

  it("never plays the opponent's turn", async () => {
    const { loop } = await renderRace('white', 'black');
    fireEvent.click(screen.getByRole('button', { name: 'Finish race' }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await settle(loop);
    expect(plays(loop)).toBe(0);
    expect(finishRace()).toHaveAttribute('aria-pressed', 'true');
  });

  it('lets go when the connection drops', async () => {
    const { loop, drop } = await renderRace('white', 'black');
    fireEvent.click(screen.getByRole('button', { name: 'Finish race' }));
    expect(finishRace()).toHaveAttribute('aria-pressed', 'true');
    await act(async () => {
      drop();
    });
    await settle(loop);
    await waitFor(() =>
      expect(finishRace()).toHaveAttribute('aria-pressed', 'false'),
    );
  });
});

describe('Auto-roll in a remote game', () => {
  it('shows the auto-roll choice but not Tutor mode', async () => {
    await renderRace('white', 'white');
    expect(
      screen.getByRole('radiogroup', { name: 'Auto-roll' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Tutor mode')).toBeNull();
  });

  it('remembers the choice', async () => {
    await renderRace('white', 'white');
    fireEvent.click(screen.getByRole('radio', { name: 'Always' }));
    expect(localStorage.getItem(AUTO_ROLL_KEY)).toBe('always');
  });
});

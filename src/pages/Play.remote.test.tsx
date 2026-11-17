/**
 * The Play page in remote mode: the page plays through a room session over
 * the in-memory loopback room, while a bare session plays the other seat.
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
import { BOARD } from '../play/geometry';
import { canCommit, destinationsFrom, movableOrigins } from '../play/selectors';
import { AUTO_FORCED_PLAYS_KEY, AUTO_ROLL_KEY } from '../play/settings';
import type { RemoteApi } from '../remote/api';
import type { Side } from '../remote/protocol';
import { writeSeat } from '../remote/seats';
import {
  createRemoteSession,
  type RemoteSession,
  type TransportFactory,
} from '../remote/session';
import { createLoopback, type Loopback } from '../remote/testing/loopback';
import { canDouble, type DiceSource } from '../rules';
import { createMemoryStorage } from '../storage';
import { scriptedDice } from '../test/dice';
import { Play } from './Play';

const ROOM = 'loop';
const pace = () => Promise.resolve();

beforeEach(() => {
  localStorage.clear();
});

function fakeApi(): RemoteApi {
  return {
    createRoom: vi.fn(() => Promise.reject(new Error('unused'))),
    getRoom: vi.fn(() => Promise.resolve(null)),
    joinRoom: vi.fn(() => Promise.resolve(null)),
  };
}

function bareSession(loop: Loopback, side: Side): RemoteSession {
  return createRemoteSession({
    roomId: ROOM,
    seatToken: side === 'white' ? loop.whiteToken : loop.blackToken,
    side,
    transport: loop.transport(),
    pace,
  });
}

async function settle(loop: Loopback): Promise<void> {
  await act(async () => {
    await loop.flush();
  });
}

/**
 * Render the page seated at `side` over a fresh loopback room. Black joins
 * first when the page is Black; a White page renders into the waiting room.
 * Every frame the page's own session sends is recorded in `sent`.
 */
async function renderSeated(side: Side, dice: DiceSource, length = 3) {
  const loop = createLoopback({ length }, dice);
  const sent: string[] = [];
  const transport: TransportFactory = (url) => {
    const t = loop.transport()(url);
    const send = t.send.bind(t);
    t.send = (data) => {
      sent.push(data);
      send(data);
    };
    return t;
  };
  if (side === 'black') {
    await loop.join();
  }
  writeSeat(ROOM, {
    side,
    token: side === 'white' ? loop.whiteToken : loop.blackToken,
  });
  const storage = createMemoryStorage();
  const view = render(
    <MemoryRouter>
      <Play
        roomId={ROOM}
        remote={{ api: fakeApi(), transport, origin: 'http://test' }}
        engine={createFakeEngine()}
        storage={storage}
        opponentStepMs={0}
      />
    </MemoryRouter>,
  );
  await settle(loop);
  return { loop, sent, storage, view };
}

/** Seat Black (when the page is White) and connect the bare opponent. */
async function startOpponent(loop: Loopback, side: Side) {
  if (side === 'black') {
    await loop.join();
  }
  const session = bareSession(loop, side);
  await settle(loop);
  return session;
}

/** Play the bare session's whole turn: first legal movements, then commit. */
async function playTurn(loop: Loopback, session: RemoteSession) {
  for (let i = 0; i < 8; i += 1) {
    const game = session.getState().match?.game;
    if (!game) {
      throw new Error('no match');
    }
    if (canCommit(game)) {
      session.dispatch({ type: 'commit' });
      await settle(loop);
      return;
    }
    const from = movableOrigins(game)[0];
    const movement = destinationsFrom(game, from)[0];
    session.dispatch({ type: 'movement', from, die: movement.die });
    await settle(loop);
  }
  throw new Error('turn did not finish');
}

const originButtons = () =>
  screen.queryAllByRole('button', { name: /^Move from (point \d+|the bar)$/ });

describe('Play in remote mode', () => {
  it('White waits with the invite link until Black joins', async () => {
    const { loop } = await renderSeated('white', scriptedDice(6, 3));
    const link = screen.getByRole('textbox', { name: 'Invite link' });
    expect((link as HTMLInputElement).value).toContain(`/play/${ROOM}`);
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible();
    expect(screen.getByText('Your private link')).toBeInTheDocument();
    expect(
      screen.getByText('Waiting for your opponent to join'),
    ).toBeInTheDocument();

    await startOpponent(loop, 'black');
    expect(screen.queryByRole('textbox', { name: 'Invite link' })).toBeNull();
    expect(screen.queryByText('Waiting for your opponent to join')).toBeNull();
    expect(screen.getByText('White to play 6 and 3.')).toBeInTheDocument();
  });

  it("the board is inert on the opponent's turn and live on mine", async () => {
    // Black opens (6 beats 3), then White rolls 5-2.
    const { loop } = await renderSeated('white', scriptedDice(3, 6, 5, 2));
    const black = await startOpponent(loop, 'black');
    expect(black.getState().match?.game.turn?.player).toBe('black');
    expect(originButtons()).toHaveLength(0);

    await playTurn(loop, black);
    // White's pre-roll carries a cube decision: Roll by hand.
    fireEvent.click(await screen.findByRole('button', { name: 'Roll' }));
    await settle(loop);
    await waitFor(() => expect(originButtons().length).toBeGreaterThan(0));
  });

  it('a local movement reaches the opponent session', async () => {
    const { loop } = await renderSeated('white', scriptedDice(6, 3));
    const black = await startOpponent(loop, 'black');
    expect(black.getState().match?.game.turn?.player).toBe('white');

    fireEvent.click(originButtons()[0]);
    const destinations = screen.getAllByRole('button', {
      name: /^Move to point \d+$|^Bear off$/,
    });
    fireEvent.click(destinations[0]);
    await settle(loop);
    expect(black.getState().match?.game.turn?.movements).toHaveLength(1);
  });

  it("auto-roll never fires for the remote opponent's pre-roll", async () => {
    localStorage.setItem(AUTO_ROLL_KEY, 'always');
    // Keep the page's own autoplay out of White's opening turn, which a
    // second White socket plays below.
    localStorage.setItem(AUTO_FORCED_PLAYS_KEY, 'false');
    const { loop, sent } = await renderSeated('white', scriptedDice(6, 3));
    await startOpponent(loop, 'black');
    const whiteHelper = bareSession(loop, 'white');
    await settle(loop);
    await playTurn(loop, whiteHelper);

    const match = whiteHelper.getState().match;
    expect(match?.phase).toBe('pre-roll');
    expect(match?.toRoll).toBe('black');
    expect(match && canDouble(match)).toBe(true);
    sent.length = 0;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await settle(loop);
    expect(sent.filter((frame) => frame.includes('"act"'))).toEqual([]);
    expect(loop.host.room.match?.phase).toBe('pre-roll');
  });

  it('Black sees the board from the black perspective', async () => {
    const { loop, view } = await renderSeated('black', scriptedDice(6, 3));
    await startOpponent(loop, 'white');
    const label = Array.from(
      view.container.querySelectorAll<SVGTextElement>('text.point-number'),
    ).find((text) => text.textContent === '19');
    expect(Number(label?.getAttribute('y'))).toBe(
      BOARD.height - BOARD.frame + 19,
    );
  });

  it('no tutor strip, hint, takeback or Finish race in remote mode', async () => {
    const { loop, view } = await renderSeated('white', scriptedDice(6, 3));
    await startOpponent(loop, 'black');
    expect(originButtons().length).toBeGreaterThan(0);
    expect(view.container.querySelector('.tutor-strip')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Take back' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Finish race/ })).toBeNull();
    expect(screen.queryByText('Tutor mode')).toBeNull();
    expect(screen.queryByText(/thinking|considering/)).toBeNull();
  });

  it('persists the match with mode remote, roomId and localSide', async () => {
    const { loop, storage } = await renderSeated('white', scriptedDice(6, 3));
    await startOpponent(loop, 'black');
    fireEvent.click(originButtons()[0]);
    fireEvent.click(
      screen.getAllByRole('button', { name: /^Move to point \d+$/ })[0],
    );
    await settle(loop);
    await waitFor(async () => {
      const rows = await storage.list();
      expect(rows).toHaveLength(1);
      expect(rows[0].config).toMatchObject({
        mode: 'remote',
        length: 3,
        roomId: ROOM,
        localSide: 'white',
      });
    });
  });

  it('the HUD shows Opponent disconnected when the other socket closes', async () => {
    const { loop } = await renderSeated('white', scriptedDice(6, 3));
    const black = await startOpponent(loop, 'black');
    expect(screen.queryByText('Opponent disconnected')).toBeNull();
    black.dispose();
    await settle(loop);
    expect(
      await screen.findByText('Opponent disconnected'),
    ).toBeInTheDocument();
  });
});

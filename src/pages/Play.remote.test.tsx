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
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { Engine } from '../engine';
import { createFakeEngine } from '../engine/fake';
import { BOARD } from '../play/geometry';
import { canCommit, destinationsFrom, movableOrigins } from '../play/selectors';
import { AUTO_FORCED_PLAYS_KEY, AUTO_ROLL_KEY } from '../play/settings';
import type { RemoteApi } from '../remote/api';
import type { Side } from '../remote/protocol';
import { readSeat, writeSeat } from '../remote/seats';
import {
  createRemoteSession,
  type RemoteSession,
  type TransportFactory,
} from '../remote/session';
import { createLoopback, type Loopback } from '../remote/testing/loopback';
import { canDouble, type DiceSource, startMatch } from '../rules';
import {
  createMemoryStorage,
  type MatchStorage,
  type StoredMatch,
  snapshotMatch,
} from '../storage';
import { scriptedDice } from '../test/dice';
import { Play } from './Play';
import { initialSetup } from './play/playFormat';

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
async function renderSeated(
  side: Side,
  dice: DiceSource,
  length = 3,
  engine: Engine = createFakeEngine(),
) {
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
        engine={engine}
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
    // The page builds its session internally, so its dispatch cannot be
    // spied on directly. Two observable proofs stand in: no act frame left
    // the page's socket (the transport tap), and the room's authoritative
    // match is still in Black's pre-roll, so neither the page-side
    // localSides gate nor the session's own guard let a roll through. The
    // gate alone cannot be isolated from the session guard from here.
    expect(sent.filter((frame) => frame.includes('"act"'))).toEqual([]);
    expect(loop.host.room.match?.phase).toBe('pre-roll');
    expect(loop.host.room.match?.toRoll).toBe('black');
    expect(whiteHelper.getState().match?.phase).toBe('pre-roll');
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

function PathProbe() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

describe('creating a room from the setup card', () => {
  function renderSetup(api: RemoteApi, gameType: 'match' | 'money' = 'match') {
    return render(
      <MemoryRouter>
        <PathProbe />
        <Play
          defaultSetup={{ ...initialSetup(), gameType, length: 5 }}
          remote={{ api, origin: 'http://test' }}
          engine={createFakeEngine()}
          storage={createMemoryStorage()}
        />
      </MemoryRouter>,
    );
  }

  const ONLINE = { name: 'Play a friend online' };

  it('Play a friend online creates a room, stores the White seat and navigates', async () => {
    const token = 'a'.repeat(32);
    const api = {
      ...fakeApi(),
      createRoom: vi.fn(() =>
        Promise.resolve({
          roomId: 'abc123',
          side: 'white' as const,
          seatToken: token,
        }),
      ),
    };
    renderSetup(api);
    fireEvent.click(screen.getByRole('button', ONLINE));
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/play/abc123'),
    );
    expect(api.createRoom).toHaveBeenCalledWith(5);
    expect(readSeat('abc123')).toEqual({ side: 'white', token });
  });

  it('the online button is disabled for a money session', () => {
    renderSetup(fakeApi(), 'money');
    expect(screen.getByRole('button', ONLINE)).toBeDisabled();
    expect(screen.getByText('Online play is match play only.')).toBeVisible();
  });

  it('a failed create shows the retry note and stays on the setup card', async () => {
    renderSetup(fakeApi());
    fireEvent.click(screen.getByRole('button', ONLINE));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't create the game. Check your connection and try again.",
    );
    expect(screen.getByTestId('path')).toHaveTextContent('/');
    expect(screen.getByRole('button', ONLINE)).toBeEnabled();
  });
});

describe('opening a room by URL', () => {
  it('a full room shows "already has two players"', async () => {
    const api: RemoteApi = {
      ...fakeApi(),
      getRoom: vi.fn(() =>
        Promise.resolve({
          roomId: 'fullroom',
          config: { length: 3 },
          status: 'playing' as const,
          seats: { white: true, black: true },
        }),
      ),
    };
    render(
      <MemoryRouter>
        <Play
          roomId="fullroom"
          remote={{ api, origin: 'http://test' }}
          engine={createFakeEngine()}
          storage={createMemoryStorage()}
        />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('This game already has two players.'),
    ).toBeInTheDocument();
  });
});

function remoteRow(roomId: string): StoredMatch {
  return snapshotMatch({
    id: `row-${roomId}`,
    config: { mode: 'remote', length: 1, roomId, localSide: 'white' },
    match: startMatch(1, scriptedDice(6, 3)),
    createdAt: 1_000,
    updatedAt: 2_000,
  });
}

function renderPage(
  storage: MatchStorage,
  props: { roomId?: string; api?: RemoteApi } = {},
) {
  return render(
    <MemoryRouter
      initialEntries={props.roomId ? [`/play/${props.roomId}`] : ['/']}
    >
      <PathProbe />
      <Play
        roomId={props.roomId}
        remote={{ api: props.api ?? fakeApi(), origin: 'http://test' }}
        engine={createFakeEngine()}
        storage={storage}
      />
    </MemoryRouter>,
  );
}

describe('resuming and expiry', () => {
  it('the resume prompt sends a remote row back to its room URL', async () => {
    const storage = createMemoryStorage();
    await storage.put(remoteRow('abc123'));
    renderPage(storage);
    expect(
      await screen.findByText(
        /An online match is waiting: 1-point match online/,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Return to online match' }),
    );
    expect(screen.getByTestId('path')).toHaveTextContent('/play/abc123');
    expect(screen.queryByRole('button', { name: 'Resume match' })).toBeNull();
  });

  it('an expired room offers Review and Discard', async () => {
    const storage = createMemoryStorage();
    await storage.put(remoteRow(ROOM));
    renderPage(storage, { roomId: ROOM });
    expect(await screen.findByText('This game has ended.')).toBeInTheDocument();
    const review = await screen.findByRole('link', {
      name: 'Review in Analyze',
    });
    expect(review).toHaveAttribute('href', '/analyze');
    expect(screen.getByRole('button', { name: 'Discard' })).toBeVisible();
  });

  it('Discard deletes the local row', async () => {
    const storage = createMemoryStorage();
    await storage.put(remoteRow(ROOM));
    renderPage(storage, { roomId: ROOM });
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(async () => expect(await storage.list()).toHaveLength(0));
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/),
    );
  });

  it('an expired room never writes status finished', async () => {
    const storage = createMemoryStorage();
    await storage.put(remoteRow(ROOM));
    const put = vi.spyOn(storage, 'put');
    renderPage(storage, { roomId: ROOM });
    await screen.findByRole('link', { name: 'Review in Analyze' });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(put).not.toHaveBeenCalled();
    expect((await storage.list())[0].status).toBe('in-progress');
  });
});

describe('remote chrome', () => {
  it('the engine note does not render in remote mode', async () => {
    // A failed engine would show its note on the opponent's turn.
    const engine = { ...createFakeEngine(), status: 'error' as const };
    const { loop } = await renderSeated('white', scriptedDice(3, 6), 3, engine);
    const black = await startOpponent(loop, 'black');
    expect(black.getState().match?.game.turn?.player).toBe('black');
    expect(screen.queryByText('The engine failed to load.')).toBeNull();
  });

  it('the remote match-over card offers Back to Play', async () => {
    const { loop } = await renderSeated('white', scriptedDice(6, 3), 1);
    const black = await startOpponent(loop, 'black');
    fireEvent.click(screen.getByRole('button', { name: 'Resign…' }));
    fireEvent.click(screen.getByRole('button', { name: /^Single/ }));
    await settle(loop);
    black.dispatch({ type: 'accept-resign' });
    await settle(loop);
    expect(
      await screen.findByRole('link', { name: 'Back to Play' }),
    ).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'New match' })).toBeNull();
  });
});

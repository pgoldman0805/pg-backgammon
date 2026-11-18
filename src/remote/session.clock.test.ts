/**
 * Tests for the client session's view of names and the move clock: what a
 * seat announces on hello, what it learns about the opponent, when its own
 * turn ends, and how a timeout forfeit reaches both browsers.
 */

import { scriptedDice } from '../test/dice';
import { createRemoteSession, type RemoteSession } from './session';
import { createLoopback, type Loopback } from './testing/loopback';

const pace = () => Promise.resolve();

function connect(
  lb: Loopback,
  side: 'white' | 'black',
  name?: string,
): RemoteSession {
  return createRemoteSession({
    roomId: 'loop',
    seatToken: side === 'white' ? lb.whiteToken : lb.blackToken,
    side,
    transport: lb.transport(),
    pace,
    name,
  });
}

async function pair(moveSeconds: number | undefined, clock: { now: number }) {
  const lb = createLoopback(
    { length: 1, moveSeconds },
    scriptedDice(6, 3, 5, 2, 4, 1),
    { now: () => clock.now },
  );
  const white = connect(lb, 'white', 'Alice');
  await lb.flush();
  await lb.join();
  const black = connect(lb, 'black', 'Bob');
  await lb.flush();
  return { lb, white, black };
}

describe('names', () => {
  it("announces its name and learns the opponent's", async () => {
    const { white, black } = await pair(undefined, { now: 1_000_000 });
    expect(white.getConnection().names).toEqual({
      white: 'Alice',
      black: 'Bob',
    });
    expect(black.getConnection().names).toEqual({
      white: 'Alice',
      black: 'Bob',
    });
  });

  it('shows no names for a seat that sent none', async () => {
    const lb = createLoopback({ length: 1 }, scriptedDice(6, 3));
    const white = connect(lb, 'white');
    await lb.flush();
    expect(white.getConnection().names).toEqual({ white: null, black: null });
  });
});

describe('move clock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has no turn end without a clock', async () => {
    const { white } = await pair(undefined, { now: 1_000_000 });
    expect(white.getConnection().turnEndsAt).toBeNull();
  });

  it('reports when the current turn ends, in local time', async () => {
    vi.setSystemTime(5_000_000);
    const clock = { now: 1_000_000 };
    const { white, black } = await pair(30, clock);
    expect(white.getConnection().turnEndsAt).toBe(5_030_000);
    expect(black.getConnection().turnEndsAt).toBe(5_030_000);
  });

  it('restarts the countdown when the turn passes', async () => {
    vi.setSystemTime(5_000_000);
    const clock = { now: 1_000_000 };
    const { lb, white, black } = await pair(30, clock);
    const mover =
      white.getState().match?.game.turn?.player === 'white' ? white : black;
    clock.now += 10_000;
    vi.setSystemTime(5_010_000);
    // Play the whole opening turn: movements until commit is allowed.
    for (let i = 0; i < 8; i += 1) {
      const game = mover.getState().match?.game;
      if (game?.turn?.player !== mover.side) {
        break;
      }
      const { canCommit, destinationsFrom, movableOrigins } = await import(
        '../play/selectors'
      );
      if (canCommit(game)) {
        mover.dispatch({ type: 'commit' });
      } else {
        const from = movableOrigins(game)[0];
        mover.dispatch({
          type: 'movement',
          from,
          die: destinationsFrom(game, from)[0].die,
        });
      }
      await lb.flush();
    }
    expect(white.getConnection().turnEndsAt).toBe(5_040_000);
    expect(black.getConnection().turnEndsAt).toBe(5_040_000);
  });

  it('shows both browsers the forfeit when the clock runs out', async () => {
    vi.setSystemTime(5_000_000);
    const clock = { now: 1_000_000 };
    const { lb, white, black } = await pair(15, clock);
    const mover = white.getState().match?.game.turn?.player;
    clock.now += 15_000;
    await lb.host.tick();
    await lb.flush();
    for (const session of [white, black]) {
      expect(session.getConnection()).toMatchObject({
        roomStatus: 'finished',
        forfeitBy: mover,
        turnEndsAt: null,
      });
    }
  });
});

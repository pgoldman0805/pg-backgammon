import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Engine } from '../engine';
import { createFakeEngine } from '../engine/fake';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
import {
  type CreateMatchOptions,
  createBoard,
  createGame,
  createMatch,
  createSeededDice,
  type GameState,
} from '../rules';
import {
  createMemoryStorage,
  type StoredMatch,
  snapshotMatch,
} from '../storage';
import { scriptedDice } from '../test/dice';
import {
  gatedEngine,
  manualLoadEngine,
  scriptedCubeEngine,
} from '../test/engine';
import { Play, type PlayProps } from './Play';

// The autoplay settings (ticket 15) persist in localStorage; tests that set
// them must not leak into their neighbours.
beforeEach(() => {
  localStorage.clear();
});

function renderPlay(options: PlayStoreOptions, props?: Partial<PlayProps>) {
  const store = createPlayStore(options);
  render(
    <Play
      store={store}
      engine={createFakeEngine()}
      opponentStepMs={0}
      {...props}
    />,
  );
  return store;
}

/** Render mid-game states as a hot-seat match (both sides human). */
function renderHotSeat(options: PlayStoreOptions) {
  return renderPlay(options, {
    defaultSetup: { mode: 'hotseat', difficulty: 'casual', length: 7 },
  });
}

/** A 7-point match around a given game, unless options say otherwise. */
function matchWith(game: GameState, options?: Partial<CreateMatchOptions>) {
  return createMatch({ length: 7, game, ...options });
}

describe('match setup', () => {
  it('shows the start position with both pip counts', () => {
    renderPlay({ dice: scriptedDice() });

    expect(screen.getByLabelText('White pip count')).toHaveTextContent('167');
    expect(screen.getByLabelText('Black pip count')).toHaveTextContent('167');
  });

  it('offers the five difficulties with Casual preselected', () => {
    renderPlay({ dice: scriptedDice() });

    for (const label of [
      'Beginner',
      'Casual',
      'Intermediate',
      'Expert',
      'World-class',
    ]) {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: 'Casual' })).toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Play as White' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Hot-seat match' }),
    ).toBeInTheDocument();
  });

  it('offers match lengths 1-25 with 7 preselected', async () => {
    const user = userEvent.setup();
    const store = renderPlay({ dice: scriptedDice(6, 3) });

    const picker = screen.getByRole('combobox', { name: 'Match length' });
    expect(picker).toHaveValue('7');
    expect(picker.querySelectorAll('option')).toHaveLength(25);

    await user.selectOptions(picker, '5');
    await user.click(screen.getByRole('button', { name: 'Play as White' }));
    expect(store.getState().match?.length).toBe(5);
    expect(screen.getByText('5-point match')).toBeInTheDocument();
  });

  it('remembers the picked difficulty', async () => {
    const user = userEvent.setup();
    renderPlay({ dice: scriptedDice() });

    await user.click(screen.getByRole('radio', { name: 'Expert' }));
    expect(screen.getByRole('radio', { name: 'Expert' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Casual' })).not.toBeChecked();
  });
});

describe('the standing on display', () => {
  it('shows both match scores, the length and the centered cube', () => {
    renderHotSeat({
      match: matchWith(
        createGame({
          board: createBoard({
            white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
            black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
          }),
          player: 'white',
          roll: [6, 3],
        }),
        { score: { white: 3, black: 5 } },
      ),
      dice: scriptedDice(),
    });

    expect(screen.getByLabelText('White match score')).toHaveTextContent('3');
    expect(screen.getByLabelText('Black match score')).toHaveTextContent('5');
    expect(screen.getByText('7-point match')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Doubling cube: centered at 1'),
    ).toBeInTheDocument();
  });

  it('shows an owned cube and its holder', () => {
    renderHotSeat({
      match: matchWith(
        createGame({
          board: createBoard({
            white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
            black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
          }),
          player: 'white',
          roll: [6, 3],
        }),
        { cube: { value: 2, owner: 'black' } },
      ),
      dice: scriptedDice(),
    });

    expect(
      screen.getByLabelText('Doubling cube: Black holds it at 2'),
    ).toBeInTheDocument();
  });

  it('marks the Crawford game and sets the cube out of play', () => {
    renderHotSeat({
      match: matchWith(
        createGame({
          board: createBoard({
            white: { points: { 24: 2, 13: 5, 8: 3, 6: 5 } },
            black: { points: { 1: 2, 12: 5, 17: 3, 19: 5 } },
          }),
          player: 'white',
          roll: [6, 3],
        }),
        { score: { white: 6, black: 2 }, crawford: true },
      ),
      dice: scriptedDice(),
    });

    expect(screen.getByText('Crawford — no doubling')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Doubling cube: out of play (Crawford game)'),
    ).toBeInTheDocument();
  });
});

describe('the cube in a hot-seat match', () => {
  /** White plays the opening 6-3; black reaches the pre-roll decision. */
  function reachBlackPreRoll(...laterRolls: Parameters<typeof scriptedDice>) {
    const store = renderHotSeat({
      dice: scriptedDice(6, 3, ...laterRolls),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move from point 24' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to point 18' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move from point 13' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to point 10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));
    return store;
  }

  it('offers Double and Roll at the pre-roll moment; Roll starts the turn', () => {
    reachBlackPreRoll(5, 2);

    expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
    expect(
      screen.getByRole('button', { name: 'Double to 2' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Black to play 5 and 2.',
    );
  });

  it('double and take: the cube moves doubled, play goes on', async () => {
    reachBlackPreRoll(5, 2);

    fireEvent.click(screen.getByRole('button', { name: 'Double to 2' }));
    expect(screen.getByText('Black doubles to 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    expect(
      screen.getByLabelText('Doubling cube: White holds it at 2'),
    ).toBeInTheDocument();
    // Black can no longer double, so their dice roll themselves.
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Black to play 5 and 2.',
      );
    });
  });

  it('double and pass: the doubler scores and the game ends', () => {
    reachBlackPreRoll();

    fireEvent.click(screen.getByRole('button', { name: 'Double to 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }));

    expect(
      screen.getAllByText(/White passes the double — Black wins 1 point/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText('Black match score')).toHaveTextContent('1');
    expect(
      screen.getByRole('button', { name: 'Next game' }),
    ).toBeInTheDocument();
  });
});

describe('playing the computer at the cube', () => {
  /** White commits the opening; the engine faces its pre-roll decision. */
  function reachEnginePreRoll(
    engine: Engine,
    ...laterRolls: Parameters<typeof scriptedDice>
  ) {
    const store = renderPlay(
      { dice: scriptedDice(6, 3, ...laterRolls) },
      { engine },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move from point 24' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to point 18' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move from point 13' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to point 10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));
    return store;
  }

  it('surfaces the engine double as a take-or-pass decision; take plays on', async () => {
    reachEnginePreRoll(scriptedCubeEngine('Double, take'), 5, 2);

    expect(await screen.findByText('Black doubles to 2')).toBeInTheDocument();
    expect(
      screen.getByText(/Take to play on for 2 points, or pass to concede/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Take' }));
    expect(
      screen.getByLabelText('Doubling cube: White holds it at 2'),
    ).toBeInTheDocument();
    // The engine rolls and plays on at the doubled stake.
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('White to roll.');
    });
  });

  it('passing the engine double concedes the game', async () => {
    reachEnginePreRoll(scriptedCubeEngine('Double, take'));

    fireEvent.click(await screen.findByRole('button', { name: 'Pass' }));

    expect(screen.getByLabelText('Black match score')).toHaveTextContent('1');
    expect(
      screen.getByRole('button', { name: 'Next game' }),
    ).toBeInTheDocument();
  });

  it("the engine answers the user's double and play continues doubled", async () => {
    // 'No double, take': the engine never doubles itself, and takes when the
    // user does.
    reachEnginePreRoll(scriptedCubeEngine('No double, take'), 5, 2, 4, 1);

    // The engine plays its turn and hands White the pre-roll decision.
    expect(await screen.findByText('White to roll.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Double to 2' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'White doubles to 2. Black is considering…',
    );

    // The engine takes; White's dice then roll themselves (no redouble).
    await waitFor(() => {
      expect(
        screen.getByLabelText('Doubling cube: Black holds it at 2'),
      ).toBeInTheDocument();
    });
    expect(
      await screen.findByText('White to play 4 and 1.'),
    ).toBeInTheDocument();
  });
});

describe('resignation against the computer', () => {
  it('an accepted resignation ends and scores the game', async () => {
    // The engine expects less than a point (equity −0.6 for white → +0.6).
    renderPlay(
      { dice: scriptedDice(6, 3) },
      { engine: scriptedCubeEngine('No double, take', { equity: -0.6 }) },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    fireEvent.click(screen.getByRole('button', { name: 'Resign…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Single — 1 point' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'White offers to resign a single game. Black is considering…',
    );

    expect(
      (await screen.findAllByText(/White resigns a single game — Black wins/))
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText('Black match score')).toHaveTextContent('1');
  });

  it('a declined resignation leaves a note and play continues', async () => {
    // The engine expects a gammon (white equity −1.4): a single is refused.
    renderPlay(
      { dice: scriptedDice(6, 3) },
      { engine: scriptedCubeEngine('No double, take', { equity: -1.4 }) },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    fireEvent.click(screen.getByRole('button', { name: 'Resign…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Single — 1 point' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Black declined — play on.',
      );
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 6 and 3.',
    );
    expect(screen.getByLabelText('Black match score')).toHaveTextContent('0');
  });

  it('an incoming resignation is an accept-or-decline decision (hot-seat)', () => {
    renderHotSeat({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    // White resigns; the decision passes to Black's seat.
    fireEvent.click(screen.getByRole('button', { name: 'Resign…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gammon — 2 points' }));
    expect(
      screen.getByText('White offers to resign a gammon'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(screen.getByLabelText('Black match score')).toHaveTextContent('2');
    expect(
      screen.getByRole('button', { name: 'Next game' }),
    ).toBeInTheDocument();
  });

  it('the resignation picker can be cancelled', () => {
    renderHotSeat({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    fireEvent.click(screen.getByRole('button', { name: 'Resign…' }));
    expect(
      screen.getByRole('button', { name: 'Gammon — 2 points' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.queryByRole('button', { name: 'Gammon — 2 points' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Commit play' }),
    ).toBeInTheDocument();
  });
});

describe('between games and at the match end', () => {
  function winWhiteGame(options?: Partial<CreateMatchOptions>) {
    const board = createBoard({
      white: { points: { 1: 1 }, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    const store = renderHotSeat({
      match: matchWith(
        createGame({ board, player: 'white', roll: [6, 5] }),
        options,
      ),
      dice: scriptedDice(4, 2, 3, 1),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Move from point 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bear off' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));
    return store;
  }

  it('announces the game result and continues into the next game', () => {
    winWhiteGame();

    expect(
      screen.getAllByText('White wins a single game — 1 point.').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('White 1 · Black 0 — first to 7'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next game' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 4 and 2.',
    );
    expect(screen.getByLabelText('White match score')).toHaveTextContent('1');
  });

  it('flags the upcoming Crawford game on the interstitial', () => {
    winWhiteGame({ score: { white: 5, black: 2 } });

    expect(
      screen.getByText('Next is the Crawford game — no doubling.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next game' }));
    expect(screen.getByText('Crawford — no doubling')).toBeInTheDocument();
  });

  it('summarises the match at its end and starts a new one', async () => {
    const store = winWhiteGame({
      score: { white: 6, black: 3 },
      crawford: true,
    });

    expect(
      screen.getAllByText('White wins the match 7–3').length,
    ).toBeGreaterThan(0);
    // The games list reports the deciding game.
    expect(screen.getByText(/White \+1 — single game/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next game' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New match' }));
    expect(store.getState().match?.score).toEqual({ white: 0, black: 0 });
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 4 and 2.',
    );
  });
});

describe('playing against the computer', () => {
  it('the computer answers a committed play with its own, visibly', async () => {
    // White opens 6-3; Black (the computer) rolls 5-2 after its cube check.
    const store = renderPlay({ dice: scriptedDice(6, 3, 5, 2) });

    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move from point 24' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to point 18' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move from point 13' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to point 10' }));
    fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));

    // The computer plays Black and hands the decision back to White.
    expect(await screen.findByText('White to roll.')).toBeInTheDocument();
    const plays = store.getState().match?.game.record.plays ?? [];
    expect(plays).toHaveLength(2);
    expect(plays[1].player).toBe('black');
    expect(plays[1].movements.length).toBeGreaterThan(0);
  });

  it('shows thinking and keeps the board inert on the engine turn', async () => {
    const user = userEvent.setup();
    const engine = gatedEngine();
    // Black wins the opening roll (6 beats 3), so the engine moves first.
    renderPlay({ dice: scriptedDice(3, 6, 5, 2) }, { engine });

    await user.click(screen.getByRole('button', { name: 'Play as White' }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Black is thinking…',
      );
    });
    // The UI stays responsive but offers White nothing to act on.
    expect(
      screen.queryAllByRole('button', { name: /^Move from/ }),
    ).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: 'Commit play' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Undo' }),
    ).not.toBeInTheDocument();

    act(() => engine.release());
    expect(await screen.findByText('White to roll.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(
      screen.getAllByRole('button', { name: /^Move from/ }).length,
    ).toBeGreaterThan(0);
  });

  it('labels Black with the chosen difficulty', async () => {
    const user = userEvent.setup();
    renderPlay({ dice: scriptedDice(6, 3, 5, 2) });

    await user.click(screen.getByRole('radio', { name: 'Expert' }));
    await user.click(screen.getByRole('button', { name: 'Play as White' }));
    expect(screen.getByText('Expert')).toBeInTheDocument();
  });

  it('surfaces the engine loading state until the load finishes', async () => {
    const engine = manualLoadEngine();
    renderPlay({ dice: scriptedDice(6, 3, 5, 2) }, { engine });

    expect(await screen.findByText('Engine loading…')).toBeInTheDocument();

    act(() => engine.finishLoading('ready'));
    await waitFor(() => {
      expect(screen.queryByText('Engine loading…')).not.toBeInTheDocument();
    });
  });

  it('surfaces an engine load failure with a working retry', async () => {
    const engine = manualLoadEngine();
    const user = userEvent.setup();
    renderPlay({ dice: scriptedDice(6, 3, 5, 2) }, { engine });

    act(() => engine.finishLoading('error'));
    expect(
      await screen.findByText('The engine failed to load.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Engine loading…')).toBeInTheDocument();

    act(() => engine.finishLoading('ready'));
    await waitFor(() => {
      expect(screen.queryByText('Engine loading…')).not.toBeInTheDocument();
    });
  });

  it('offers retry when the computer cannot move, and recovers', async () => {
    const user = userEvent.setup();
    const fake = createFakeEngine();
    let failures = 1;
    const engine: Engine = {
      ...fake,
      rankPlays(position, roll, options) {
        if (failures > 0) {
          failures--;
          return Promise.reject(new Error('worker crashed'));
        }
        return fake.rankPlays(position, roll, options);
      },
    };
    // Black wins the opening roll, so the failure hits immediately.
    renderPlay({ dice: scriptedDice(3, 6, 5, 2) }, { engine });

    await user.click(screen.getByRole('button', { name: 'Play as White' }));
    expect(
      await screen.findByText('The computer could not move.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('White to roll.')).toBeInTheDocument();
  });

  it('plays a complete 1-point match against the computer through the UI', async () => {
    renderPlay({ dice: createSeededDice(7) });
    fireEvent.click(screen.getByRole('combobox', { name: 'Match length' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Match length' }), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    for (let i = 0; i < 4000; i++) {
      if (screen.queryAllByText(/wins the match/).length > 0) {
        break;
      }
      const roll = screen.queryByRole('button', { name: 'Roll' });
      if (roll) {
        fireEvent.click(roll);
        continue;
      }
      const dance = screen.queryByRole('button', { name: 'Continue' });
      if (dance) {
        fireEvent.click(dance);
        continue;
      }
      const commit = screen.queryByRole('button', { name: 'Commit play' });
      if (commit && !commit.hasAttribute('disabled')) {
        fireEvent.click(commit);
        continue;
      }
      const forced = screen.queryByRole('button', {
        name: 'Play forced play',
      });
      if (forced) {
        fireEvent.click(forced);
        continue;
      }
      const [origin] = screen.queryAllByRole('button', { name: /^Move from/ });
      if (!origin) {
        // The computer is taking its turn; let it finish a step.
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
        continue;
      }
      fireEvent.click(origin);
      const [destination] = screen.getAllByRole('button', {
        name: /^(Move to|Bear off)/,
      });
      fireEvent.click(destination);
    }

    expect(screen.getAllByText(/wins the match/).length).toBeGreaterThan(0);
    // The finished match offers a new one.
    expect(
      screen.getByRole('button', { name: 'New match' }),
    ).toBeInTheDocument();
  }, 30_000);
});

describe('click-to-move (hot-seat)', () => {
  it('plays a full turn: select, highlight, move, commit', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3, 5, 2) });

    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 6 and 3.',
    );

    const commit = screen.getByRole('button', { name: 'Commit play' });
    expect(commit).toBeDisabled();

    // Selecting a checker highlights exactly its legal destinations.
    await user.click(
      screen.getByRole('button', { name: 'Move from point 24' }),
    );
    expect(
      screen.getByRole('button', { name: 'Move to point 18' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move to point 21' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move to point 18' }));
    expect(commit).toBeDisabled();
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('161');

    await user.click(
      screen.getByRole('button', { name: 'Move from point 13' }),
    );
    await user.click(screen.getByRole('button', { name: 'Move to point 10' }));
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('158');

    expect(commit).toBeEnabled();
    await user.click(commit);
    expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');

    await user.click(screen.getByRole('button', { name: 'Roll' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Black to play 5 and 2.',
    );
  });

  it('toggles the highlights off when the origin is clicked again', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    const origin = screen.getByRole('button', { name: 'Move from point 24' });
    await user.click(origin);
    expect(
      screen.getByRole('button', { name: 'Move to point 18' }),
    ).toBeInTheDocument();

    await user.click(origin);
    expect(
      screen.queryByRole('button', { name: 'Move to point 18' }),
    ).not.toBeInTheDocument();
  });

  it('undo restores the position within the turn', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: 'Move from point 24' }),
    );
    await user.click(screen.getByRole('button', { name: 'Move to point 18' }));
    expect(
      screen.getByRole('button', { name: 'Move from point 18' }),
    ).toBeInTheDocument();

    await user.click(undo);
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('167');
    expect(
      screen.queryByRole('button', { name: 'Move from point 18' }),
    ).not.toBeInTheDocument();
  });
});

describe('board interaction shortcuts (hot-seat)', () => {
  it('double-click applies the movement when exactly one destination exists', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    // From 6 only the 3 plays (6/3): exactly one legal destination.
    await user.dblClick(
      screen.getByRole('button', { name: 'Move from point 6' }),
    );

    expect(screen.getByLabelText('White pip count')).toHaveTextContent('164');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
  });

  it('double-click on a multi-destination checker only selects normally', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    // From 24 both dice play: two clicks toggle the selection on and off,
    // and no checker moves.
    await user.dblClick(
      screen.getByRole('button', { name: 'Move from point 24' }),
    );

    expect(screen.getByLabelText('White pip count')).toHaveTextContent('167');
    expect(
      screen.queryByRole('button', { name: 'Move to point 18' }),
    ).not.toBeInTheDocument();
  });

  it('highlights the two-movement destination and applies both movements', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    await user.click(
      screen.getByRole('button', { name: 'Move from point 24' }),
    );
    expect(
      screen.getByRole('button', { name: 'Move to point 18' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Move to point 15 in two movements' }),
    );

    // Both movements landed (24/18/15 = 9 pips) and the play is complete.
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('158');
    expect(screen.getByRole('button', { name: 'Commit play' })).toBeEnabled();

    // Undo keeps its per-movement granularity: one undo reverts only 18/15.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('161');
  });

  it('the two-movement destination answers the keyboard like any destination', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    await user.click(
      screen.getByRole('button', { name: 'Move from point 24' }),
    );
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Move to point 15 in two movements' }),
      { key: 'Enter' },
    );

    expect(screen.getByLabelText('White pip count')).toHaveTextContent('158');
  });
});

describe('dance and forced turns (hot-seat)', () => {
  function danceGame(): GameState {
    const board = createBoard({
      white: { points: { 13: 14 }, bar: 1 },
      black: { points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2, 17: 3 } },
    });
    return createGame({ board, player: 'white', roll: [6, 3] });
  }

  it('resolves a dance with a single continue action', async () => {
    const user = userEvent.setup();
    renderHotSeat({ match: matchWith(danceGame()), dice: scriptedDice(5, 2) });

    expect(screen.getByRole('status')).toHaveTextContent(
      'White rolled 6 and 3 — no legal plays.',
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
  });

  it('resolves a forced play with a single action (auto-play switched off)', async () => {
    // Auto-play of forced plays (ticket 15) is on by default; the manual
    // button is the path this test pins, so switch the setting off first.
    localStorage.setItem('pg-backgammon.auto-forced-plays', 'off');
    const user = userEvent.setup();
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    renderHotSeat({
      match: matchWith(createGame({ board, player: 'white', roll: [6, 3] })),
      dice: scriptedDice(5, 2),
    });

    expect(screen.getByRole('status')).toHaveTextContent('only one legal play');

    await user.click(screen.getByRole('button', { name: 'Play forced play' }));
    expect(screen.getByRole('status')).toHaveTextContent('Black to roll.');
  });
});

describe('a complete hot-seat match with clicks only', () => {
  it('plays a 1-point match from the opening roll to the summary', () => {
    renderPlay(
      { dice: createSeededDice(7) },
      { defaultSetup: { mode: 'hotseat', difficulty: 'casual', length: 1 } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    for (let i = 0; i < 5000; i++) {
      if (screen.queryAllByText(/wins the match/).length > 0) {
        break;
      }
      const roll = screen.queryByRole('button', { name: 'Roll' });
      if (roll) {
        fireEvent.click(roll);
        continue;
      }
      const dance = screen.queryByRole('button', { name: 'Continue' });
      if (dance) {
        fireEvent.click(dance);
        continue;
      }
      const commit = screen.getByRole('button', { name: 'Commit play' });
      if (!commit.hasAttribute('disabled')) {
        fireEvent.click(commit);
        continue;
      }
      const forced = screen.queryByRole('button', { name: 'Play forced play' });
      if (forced) {
        fireEvent.click(forced);
        continue;
      }
      const [origin] = screen.getAllByRole('button', { name: /^Move from/ });
      fireEvent.click(origin);
      const [destination] = screen.getAllByRole('button', {
        name: /^(Move to|Bear off)/,
      });
      fireEvent.click(destination);
    }

    expect(screen.getAllByText(/wins the match/).length).toBeGreaterThan(0);
  }, 30_000);
});

describe('persistence and resume', () => {
  /** A distinctive mid-match position: 5-point match at 2-1, cube on 2. */
  function storedMidMatch() {
    const match = createMatch({
      length: 5,
      game: createGame({
        board: createBoard({
          white: { points: { 6: 5, 5: 5, 4: 3, 2: 2 } },
          black: { points: { 19: 5, 20: 5, 21: 5 } },
        }),
        player: 'white',
        roll: [6, 3],
      }),
      score: { white: 2, black: 1 },
      cube: { value: 2, owner: 'white' },
    });
    return snapshotMatch({
      id: 'stored-match',
      config: { length: 5, mode: 'hotseat', difficulty: 'casual' },
      match,
      createdAt: 1_000,
      updatedAt: 2_000,
    });
  }

  it('persists a started match as in-progress', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage();
    renderPlay({ dice: scriptedDice(6, 3) }, { storage });

    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    await vi.waitFor(async () => {
      expect(await storage.list()).toHaveLength(1);
    });
    const [stored] = await storage.list();
    expect(stored.status).toBe('in-progress');
    expect(stored.config).toMatchObject({
      mode: 'hotseat',
      difficulty: 'casual',
      length: 7,
    });
    expect(stored.state?.game.turn?.roll).toEqual([6, 3]);
  });

  it('offers to resume and restores the exact position, cube, score and turn', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([storedMidMatch()]);
    renderPlay({ dice: scriptedDice() }, { storage });

    await user.click(
      await screen.findByRole('button', { name: 'Resume match' }),
    );

    expect(screen.getByLabelText('White match score')).toHaveTextContent('2');
    expect(screen.getByLabelText('Black match score')).toHaveTextContent('1');
    expect(screen.getByText('5-point match')).toBeInTheDocument();
    expect(screen.getByText('White to play 6 and 3.')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Doubling cube: White holds it at 2'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('71');
    expect(screen.getByLabelText('Black pip count')).toHaveTextContent('75');
  });

  it('keeps persisting a resumed match under its stored id', async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage([storedMidMatch()]);
    renderPlay({ dice: scriptedDice() }, { storage });

    await user.click(
      await screen.findByRole('button', { name: 'Resume match' }),
    );

    await vi.waitFor(async () => {
      const rows = await storage.list();
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('stored-match');
      expect(rows[0].updatedAt).not.toBe(2_000);
    });
  });

  it('auto-resumes the match named by resumeMatchId', async () => {
    const storage = createMemoryStorage([storedMidMatch()]);
    renderPlay(
      { dice: scriptedDice() },
      { storage, resumeMatchId: 'stored-match' },
    );

    await waitFor(() => {
      expect(screen.getByText('5-point match')).toBeInTheDocument();
    });
    expect(screen.getByText('White to play 6 and 3.')).toBeInTheDocument();
  });

  it('falls back to fresh setup when stored data is corrupt', async () => {
    const storage = createMemoryStorage([
      { id: 'broken' } as unknown as StoredMatch,
    ]);
    renderPlay({ dice: scriptedDice() }, { storage });

    expect(
      await screen.findByRole('button', { name: 'Play as White' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Resume match' }),
    ).not.toBeInTheDocument();
  });

  it('falls back to fresh setup when storage itself fails', async () => {
    const storage = createMemoryStorage();
    storage.list = () => Promise.reject(new Error('storage gone'));
    renderPlay({ dice: scriptedDice() }, { storage });

    expect(
      await screen.findByRole('button', { name: 'Play as White' }),
    ).toBeInTheDocument();
  });
});

describe('copy XGID from the HUD', () => {
  it('copies the current position, dice included, as an XGID', async () => {
    const user = userEvent.setup();
    renderPlay({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    await user.click(screen.getByRole('button', { name: 'Copy XGID' }));

    // White opened 6-3 from the start of a 7-point match.
    expect(await window.navigator.clipboard.readText()).toBe(
      'XGID=-b----E-C---eE---c-e----B-:0:0:1:63:0:0:0:7:10',
    );
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('is absent before a match starts', () => {
    renderPlay({ dice: scriptedDice() });

    expect(
      screen.queryByRole('button', { name: 'Copy XGID' }),
    ).not.toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeEngine, type Engine } from '../engine';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
import {
  createBoard,
  createGame,
  createSeededDice,
  type GameState,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { gatedEngine, manualLoadEngine } from '../test/engine';
import { Play, type PlayProps } from './Play';

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

/** Render mid-game states as a hot-seat game (both sides human). */
function renderHotSeat(options: PlayStoreOptions) {
  return renderPlay(options, {
    defaultSetup: { mode: 'hotseat', difficulty: 'casual' },
  });
}

describe('game setup', () => {
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
      screen.getByRole('button', { name: 'Hot-seat game' }),
    ).toBeInTheDocument();
  });

  it('remembers the picked difficulty', async () => {
    const user = userEvent.setup();
    renderPlay({ dice: scriptedDice() });

    await user.click(screen.getByRole('radio', { name: 'Expert' }));
    expect(screen.getByRole('radio', { name: 'Expert' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Casual' })).not.toBeChecked();
  });
});

describe('playing against the computer', () => {
  it('the computer answers a committed play with its own, visibly', async () => {
    const user = userEvent.setup();
    // White opens 6-3; Black (the computer) rolls 5-2; White rolls 4-1 next.
    const store = renderPlay({ dice: scriptedDice(6, 3, 5, 2, 4, 1) });

    await user.click(screen.getByRole('button', { name: 'Play as White' }));
    await user.click(
      screen.getByRole('button', { name: 'Move from point 24' }),
    );
    await user.click(screen.getByRole('button', { name: 'Move to point 18' }));
    await user.click(
      screen.getByRole('button', { name: 'Move from point 13' }),
    );
    await user.click(screen.getByRole('button', { name: 'Move to point 10' }));
    await user.click(screen.getByRole('button', { name: 'Commit play' }));

    // The computer plays Black and hands the turn back.
    expect(
      await screen.findByText('White to play 4 and 1.'),
    ).toBeInTheDocument();
    const plays = store.getState().game?.record.plays ?? [];
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
    expect(screen.queryAllByRole('button', { name: /^Move from/ })).toHaveLength(
      0,
    );
    expect(
      screen.queryByRole('button', { name: 'Commit play' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Undo' }),
    ).not.toBeInTheDocument();

    act(() => engine.release());
    expect(
      await screen.findByText('White to play 5 and 2.'),
    ).toBeInTheDocument();
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
    expect(
      await screen.findByText('White to play 5 and 2.'),
    ).toBeInTheDocument();
  });

  it('plays a complete game against the computer through the UI', async () => {
    renderPlay({ dice: createSeededDice(7) });
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    for (let i = 0; i < 4000; i++) {
      if (screen.queryAllByText(/wins a/).length > 0) {
        break;
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
        name: 'Play forced move',
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

    expect(screen.getAllByText(/wins a/).length).toBeGreaterThan(0);
    // The finished game offers the setup again.
    expect(
      screen.getByRole('button', { name: 'Play again' }),
    ).toBeInTheDocument();
  }, 30_000);
});

describe('click-to-move (hot-seat)', () => {
  it('plays a full turn: select, highlight, move, commit', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3, 5, 2) });

    await user.click(screen.getByRole('button', { name: 'Hot-seat game' }));
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
    expect(screen.getByRole('status')).toHaveTextContent(
      'Black to play 5 and 2.',
    );
  });

  it('toggles the highlights off when the origin is clicked again', async () => {
    const user = userEvent.setup();
    renderHotSeat({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Hot-seat game' }));

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
    await user.click(screen.getByRole('button', { name: 'Hot-seat game' }));

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
    renderHotSeat({ game: danceGame(), dice: scriptedDice(5, 2) });

    expect(screen.getByRole('status')).toHaveTextContent(
      'White rolled 6 and 3 — no legal plays.',
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Black to play 5 and 2.',
    );
  });

  it('resolves a forced play with a single action', async () => {
    const user = userEvent.setup();
    const board = createBoard({
      white: { points: { 24: 1 }, off: 14 },
      black: { points: { 15: 2, 1: 13 } },
    });
    renderHotSeat({
      game: createGame({ board, player: 'white', roll: [6, 3] }),
      dice: scriptedDice(5, 2),
    });

    expect(screen.getByRole('status')).toHaveTextContent('only one legal play');

    await user.click(screen.getByRole('button', { name: 'Play forced move' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Black to play 5 and 2.',
    );
  });
});

describe('game end (hot-seat)', () => {
  it('announces the winner and offers a new game', async () => {
    const user = userEvent.setup();
    const board = createBoard({
      white: { points: { 1: 1 }, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    renderHotSeat({
      game: createGame({ board, player: 'white', roll: [6, 5] }),
      dice: scriptedDice(4, 2),
    });

    await user.click(screen.getByRole('button', { name: 'Move from point 1' }));
    await user.click(screen.getByRole('button', { name: 'Bear off' }));
    await user.click(screen.getByRole('button', { name: 'Commit play' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'White wins a single game.',
    );

    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 4 and 2.',
    );
  });
});

describe('a complete hot-seat game with clicks only', () => {
  it('plays from the opening roll to a win through the UI', () => {
    renderHotSeat({ dice: createSeededDice(7) });
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat game' }));

    for (let i = 0; i < 5000; i++) {
      if (screen.queryAllByText(/wins a/).length > 0) {
        break;
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
      const forced = screen.queryByRole('button', { name: 'Play forced move' });
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

    expect(screen.getAllByText(/wins a/).length).toBeGreaterThan(0);
  }, 30_000);
});

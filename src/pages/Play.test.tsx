import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
import {
  createBoard,
  createGame,
  createSeededDice,
  type GameState,
} from '../rules';
import { scriptedDice } from '../test/dice';
import { Play } from './Play';

function renderPlay(options: PlayStoreOptions) {
  const store = createPlayStore(options);
  render(<Play store={store} />);
  return store;
}

describe('before the game starts', () => {
  it('shows the start position with both pip counts and a start action', () => {
    renderPlay({ dice: scriptedDice() });

    expect(screen.getByLabelText('White pip count')).toHaveTextContent('167');
    expect(screen.getByLabelText('Black pip count')).toHaveTextContent('167');
    expect(
      screen.getByRole('button', { name: 'Start game' }),
    ).toBeInTheDocument();
  });
});

describe('click-to-move', () => {
  it('plays a full turn: select, highlight, move, commit', async () => {
    const user = userEvent.setup();
    renderPlay({ dice: scriptedDice(6, 3, 5, 2) });

    await user.click(screen.getByRole('button', { name: 'Start game' }));
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
    renderPlay({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Start game' }));

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
    renderPlay({ dice: scriptedDice(6, 3) });
    await user.click(screen.getByRole('button', { name: 'Start game' }));

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

describe('dance and forced turns', () => {
  function danceGame(): GameState {
    const board = createBoard({
      white: { points: { 13: 14 }, bar: 1 },
      black: { points: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2, 17: 3 } },
    });
    return createGame({ board, player: 'white', roll: [6, 3] });
  }

  it('resolves a dance with a single continue action', async () => {
    const user = userEvent.setup();
    renderPlay({ game: danceGame(), dice: scriptedDice(5, 2) });

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
    renderPlay({
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

describe('game end', () => {
  it('announces the winner and offers a new game', async () => {
    const user = userEvent.setup();
    const board = createBoard({
      white: { points: { 1: 1 }, off: 14 },
      black: { points: { 24: 1 }, off: 14 },
    });
    renderPlay({
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

describe('a complete game with clicks only', () => {
  it('plays from the opening roll to a win through the UI', () => {
    renderPlay({ dice: createSeededDice(7) });
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

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

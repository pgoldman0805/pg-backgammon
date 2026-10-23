/**
 * Tutor mode through the Play page (GLOSSARY "Tutor mode"): one toggle, off
 * by default, that enables the hint, post-play feedback, the eval bar and
 * takebacks — and leaves zero tutor affordances in the DOM when off.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFakeEngine } from '../engine';
import { createPlayStore, type PlayStoreOptions } from '../play/store';
import { scriptedDice } from '../test/dice';
import { gatedEngine, openingFeedbackEngine } from '../test/engine';
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

function commitOpening(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Move from point 24' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move to point 18' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move from point 13' }));
  fireEvent.click(screen.getByRole('button', { name: 'Move to point 10' }));
  fireEvent.click(screen.getByRole('button', { name: 'Commit play' }));
}

const noTutorAffordances = () => {
  expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Hint' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Take back' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
};

describe('the Tutor toggle', () => {
  it('is off by default, with zero tutor affordances in the DOM', () => {
    const store = renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    const toggle = screen.getByRole('switch', { name: 'Tutor mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    noTutorAffordances();
    expect(store.getState().match?.tutorAssisted).toBe(false);
  });

  it('switches on mid-game: the eval bar appears and the game is flagged', async () => {
    const store = renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));

    expect(screen.getByRole('switch', { name: 'Tutor mode' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await waitFor(() => {
      expect(screen.getByRole('meter', { name: 'Evaluation' })).toHaveAttribute(
        'aria-valuenow',
        '50',
      );
    });
    expect(store.getState().match?.tutorAssisted).toBe(true);
  });

  it('switches off mid-game: the affordances vanish but the flag sticks', async () => {
    const store = renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));
    await waitFor(() => {
      expect(
        screen.getByRole('meter', { name: 'Evaluation' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));

    noTutorAffordances();
    expect(store.getState().match?.tutorAssisted).toBe(true);
  });

  it('does not exist in a hot-seat match', () => {
    renderPlay(
      { dice: scriptedDice(6, 3) },
      { defaultSetup: { mode: 'hotseat', difficulty: 'casual', length: 7 } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hot-seat match' }));

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    noTutorAffordances();
  });
});

describe('the eval bar', () => {
  it('follows the game as plays are committed', async () => {
    renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));
    await waitFor(() => {
      expect(screen.getByRole('meter', { name: 'Evaluation' })).toHaveAttribute(
        'aria-valuenow',
        '50',
      );
    });

    commitOpening();

    // White banked 9 pips; the fake engine now favors White.
    await waitFor(() => {
      const meter = screen.getByRole('meter', { name: 'Evaluation' });
      expect(Number(meter.getAttribute('aria-valuenow'))).toBeGreaterThan(50);
    });
  });
});

describe('the hint', () => {
  it("reveals the engine's best play for the current roll on demand", async () => {
    renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));

    // The fake engine is deterministic: an identical engine names the play.
    const store = createPlayStore({ dice: scriptedDice(6, 3) });
    store.dispatch({ type: 'start', length: 7 });
    const turn = store.getState().match?.game.turn;
    if (!turn) {
      throw new Error('expected a turn in progress');
    }
    const [best] = await createFakeEngine().rankPlays(
      { board: turn.startBoard, onRoll: 'white' },
      turn.roll,
    );
    const note = await screen.findByRole('note', { name: 'Hint' });
    expect(note).toHaveTextContent(`Best: ${best.moveText}`);
  });
});

describe('post-play feedback', () => {
  it('classifies the committed play and names the better play', async () => {
    // Every alternative is worth 0.5 and the opening 24/18 13/10 only 0.38:
    // an equity loss of 0.12, a blunder by the shared thresholds.
    const engine = openingFeedbackEngine(0.38, 0.5);
    renderPlay({ dice: scriptedDice(6, 3, 5, 2) }, { engine });
    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    commitOpening();

    const note = await screen.findByRole('note', { name: 'Play feedback' });
    expect(note).toHaveTextContent('Blunder');
    expect(note).toHaveTextContent('−0.12');
    expect(note).toHaveTextContent(`Best: ${engine.lastRanked?.[0]?.moveText}`);
  });
});

describe('takeback', () => {
  it('restores the position and dice, cancelling the thinking opponent', async () => {
    const engine = gatedEngine();
    const store = renderPlay(
      { dice: scriptedDice(6, 3, 5, 2, 4, 2) },
      { engine },
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));
    const before = store.getState().match;

    commitOpening();
    // The engine rolled 5-2 and is thinking (its rankPlays is gated).
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Black is thinking…',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Take back' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 6 and 3.',
    );
    expect(screen.getByLabelText('White pip count')).toHaveTextContent('167');
    expect(store.getState().match).toEqual(
      before ? { ...before, tutorAssisted: true } : before,
    );

    // The stale engine answer never lands.
    engine.release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole('status')).toHaveTextContent(
      'White to play 6 and 3.',
    );

    // Replaying the turn gets a fresh response: the engine plays 4-2.
    commitOpening();
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('White to roll.');
    });
    expect(store.getState().match?.game.record.plays).toHaveLength(2);
  });

  it('is absent while the player has nothing to take back', () => {
    renderPlay({ dice: scriptedDice(6, 3) });
    fireEvent.click(screen.getByRole('switch', { name: 'Tutor mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play as White' }));

    expect(
      screen.queryByRole('button', { name: 'Take back' }),
    ).not.toBeInTheDocument();
  });
});

/**
 * Checker travel on the Board (ticket 20): a programmatic reposition renders
 * a traveler gliding between coordinates when animation is on, and nothing
 * extra when it is off (the jsdom default, via prefers-reduced-motion).
 */

import { act, render } from '@testing-library/react';
import { applyMovement, type GameState, initialBoard } from '../rules';
import {
  ANIMATION_SPEED_KEY,
  readStoredAnimationSpeed,
  setAnimationSpeed,
} from './animation';
import { Board } from './Board';

function gameAt(board: GameState['board']): GameState {
  return {
    board,
    turn: null,
    record: {
      initialBoard: board,
      openingRolls: [],
      firstPlayer: 'white',
      plays: [],
    },
    result: null,
  };
}

const noop = () => {};

function renderBoard(game: GameState) {
  return render(
    <Board
      game={game}
      selected={null}
      onSelect={noop}
      onMove={noop}
      interactive={false}
    />,
  );
}

const start = initialBoard();
const moved = applyMovement(start, 'white', {
  from: 24,
  die: 6,
  to: 18,
  hit: false,
});

afterEach(() => {
  localStorage.removeItem(ANIMATION_SPEED_KEY);
  setAnimationSpeed(readStoredAnimationSpeed());
});

it('renders no traveler when animation is off (reduced-motion default)', () => {
  const { container, rerender } = renderBoard(gameAt(start));

  rerender(
    <Board
      game={gameAt(moved)}
      selected={null}
      onSelect={noop}
      onMove={noop}
      interactive={false}
    />,
  );

  expect(container.querySelector('.checker-travel')).toBeNull();
  expect(container.querySelector('.checker--arriving')).toBeNull();
});

it('glides a traveler with the selected speed when animation is on', () => {
  vi.useFakeTimers();
  try {
    setAnimationSpeed('fast');
    const { container, rerender } = renderBoard(gameAt(start));

    rerender(
      <Board
        game={gameAt(moved)}
        selected={null}
        onSelect={noop}
        onMove={noop}
        interactive={false}
      />,
    );

    const traveler = container.querySelector('.checker-travel');
    expect(traveler).not.toBeNull();
    expect((traveler as SVGGElement).style.transition).toContain('120ms');
    // The arrived checker hides under the traveler until it lands.
    expect(container.querySelector('.checker--arriving')).not.toBeNull();

    // Landing: the traveler retires and the real checker shows again.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector('.checker-travel')).toBeNull();
    expect(container.querySelector('.checker--arriving')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

it('snaps a whole-board change (a fresh game) without travelers', () => {
  vi.useFakeTimers();
  try {
    setAnimationSpeed('normal');
    const { container, rerender } = renderBoard(gameAt(moved));

    // A position many movements away: a diff beyond the travel cap snaps.
    const scramble = [
      ['white', { from: 24, die: 2, to: 22, hit: false }],
      ['white', { from: 24, die: 3, to: 21, hit: false }],
      ['white', { from: 13, die: 4, to: 9, hit: false }],
      ['white', { from: 13, die: 2, to: 11, hit: false }],
      ['black', { from: 1, die: 2, to: 3, hit: false }],
      ['black', { from: 1, die: 4, to: 5, hit: false }],
      ['black', { from: 12, die: 2, to: 14, hit: false }],
    ] as const;
    const scrambled = scramble.reduce(
      (board, [player, movement]) => applyMovement(board, player, movement),
      start,
    );

    rerender(
      <Board
        game={gameAt(scrambled)}
        selected={null}
        onSelect={noop}
        onMove={noop}
        interactive={false}
      />,
    );

    expect(container.querySelector('.checker-travel')).toBeNull();
    expect(container.querySelector('.checker--arriving')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

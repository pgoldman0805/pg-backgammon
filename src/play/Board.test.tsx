import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Board } from './Board';

afterEach(cleanup);

const noop = () => {};

/**
 * The doubling cube (ticket 41, review finding #22): a centered, never-turned
 * cube must not assert the traditional "64" face, which non-experts read as a
 * bug — especially in no-doubling (1-point / Crawford) and early states. It
 * shows the real current stake instead; an owned cube keeps its value.
 */
describe('Board doubling cube', () => {
  it('renders a centered, never-turned cube at the current stake, not "64"', () => {
    render(
      <Board
        game={null}
        selected={null}
        onSelect={noop}
        onMove={noop}
        cube={{ value: 1, owner: 'center' }}
      />,
    );
    const cube = screen.getByLabelText('Doubling cube: centered at 1');
    expect(cube).toHaveTextContent('1');
    expect(cube).not.toHaveTextContent('64');
  });

  it('renders an owned cube at its stake value', () => {
    render(
      <Board
        game={null}
        selected={null}
        onSelect={noop}
        onMove={noop}
        cube={{ value: 2, owner: 'white' }}
      />,
    );
    const cube = screen.getByLabelText('Doubling cube: White holds it at 2');
    expect(cube).toHaveTextContent('2');
  });
});

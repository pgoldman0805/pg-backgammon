import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Board } from './Board';
import { BOARD } from './geometry';

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

/**
 * Board perspective (remote play): the Black player at their own device sees
 * their home board (19-24) bottom right; the labels still name real points.
 */
describe('Board perspective', () => {
  function pointLabel(container: HTMLElement, point: number): SVGTextElement {
    const label = Array.from(
      container.querySelectorAll<SVGTextElement>('text.point-number'),
    ).find((text) => text.textContent === String(point));
    if (!label) {
      throw new Error(`no label for point ${point}`);
    }
    return label;
  }

  const bottomRowY = BOARD.height - BOARD.frame + 19;
  const topRowY = BOARD.frame - 5;

  it("renders Black's home points bottom right under the black perspective", () => {
    const { container } = render(
      <Board
        game={null}
        selected={null}
        onSelect={noop}
        onMove={noop}
        perspective="black"
      />,
    );
    const p19 = pointLabel(container, 19);
    const p24 = pointLabel(container, 24);
    const p6 = pointLabel(container, 6);
    expect(Number(p19.getAttribute('y'))).toBe(bottomRowY);
    expect(Number(p6.getAttribute('y'))).toBe(topRowY);
    // 24 is Black's 1-point: the rightmost bottom point, next to the tray.
    expect(Number(p24.getAttribute('x'))).toBeGreaterThan(
      Number(p19.getAttribute('x')),
    );
  });

  it("keeps White's home points bottom right by default", () => {
    const { container } = render(
      <Board game={null} selected={null} onSelect={noop} onMove={noop} />,
    );
    expect(Number(pointLabel(container, 6).getAttribute('y'))).toBe(bottomRowY);
    expect(Number(pointLabel(container, 19).getAttribute('y'))).toBe(topRowY);
  });
});

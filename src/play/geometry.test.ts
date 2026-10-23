import {
  BOARD,
  barCheckerCenter,
  checkerCenter,
  clientToBoard,
  pointAnchorX,
  targetAt,
} from './geometry';

describe('board layout', () => {
  it('mirrors the two rows: 1 under 24, 12 under 13', () => {
    expect(pointAnchorX(1)).toBe(pointAnchorX(24));
    expect(pointAnchorX(12)).toBe(pointAnchorX(13));
    // White's home (1-6) sits on the right; the outfield (7-12) on the left.
    expect(pointAnchorX(1)).toBeGreaterThan(pointAnchorX(12));
    expect(pointAnchorX(13)).toBeLessThan(pointAnchorX(24));
  });

  it('round-trips every point through hit-testing at its first checker', () => {
    for (let p = 1; p <= 24; p++) {
      const { x, y } = checkerCenter(p, 0, 1);
      expect(targetAt(x, y)).toBe(p);
    }
  });

  it('hit-tests the bar, the off trays, and the outside', () => {
    const whiteBar = barCheckerCenter('white', 0);
    const blackBar = barCheckerCenter('black', 0);
    expect(targetAt(whiteBar.x, whiteBar.y)).toBe('bar');
    expect(targetAt(blackBar.x, blackBar.y)).toBe('bar');

    expect(targetAt(BOARD.width - BOARD.trayWidth / 2, BOARD.height / 4)).toBe(
      'off',
    );
    expect(
      targetAt(BOARD.width - BOARD.trayWidth / 2, (BOARD.height * 3) / 4),
    ).toBe('off');

    expect(targetAt(-10, 10)).toBeNull();
    expect(targetAt(BOARD.width + 5, BOARD.height / 2)).toBeNull();
  });

  it('stacks checkers from the edge toward the middle', () => {
    const top0 = checkerCenter(13, 0, 3);
    const top1 = checkerCenter(13, 1, 3);
    expect(top1.y).toBeGreaterThan(top0.y);

    const bottom0 = checkerCenter(6, 0, 3);
    const bottom1 = checkerCenter(6, 1, 3);
    expect(bottom1.y).toBeLessThan(bottom0.y);
  });

  it('keeps a tall stack inside its point', () => {
    for (let i = 0; i < 9; i++) {
      const { y } = checkerCenter(6, i, 9);
      expect(y).toBeGreaterThan(BOARD.height / 2);
      expect(y).toBeLessThanOrEqual(BOARD.height);
    }
  });

  it('maps client coordinates into board coordinates', () => {
    // An element rendered at twice the viewBox scale, offset by (100, 50).
    const rect = {
      left: 100,
      top: 50,
      width: BOARD.width * 2,
      height: BOARD.height * 2,
    };
    const { x, y } = clientToBoard(rect, 100 + 30 * 2, 50 + 40 * 2);
    expect(x).toBeCloseTo(30);
    expect(y).toBeCloseTo(40);
  });

  it('centers the viewBox inside a letterboxed element', () => {
    // Twice as wide as the aspect ratio needs: content is centered.
    const rect = {
      left: 0,
      top: 0,
      width: BOARD.width * 2,
      height: BOARD.height,
    };
    const { x, y } = clientToBoard(rect, BOARD.width, BOARD.height / 2);
    expect(x).toBeCloseTo(BOARD.width / 2);
    expect(y).toBeCloseTo(BOARD.height / 2);
  });
});

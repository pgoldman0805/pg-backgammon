/**
 * Board geometry in SVG viewBox units: where points, checkers, the bar and
 * the bear-off trays sit, plus hit-testing for click and drag targets.
 * Pure math, shared by rendering and pointer handling.
 *
 * Orientation (fixed for hot-seat): white's home board (points 1-6) is the
 * bottom-right quadrant, black's home (19-24) top-right. The bottom row runs
 * 12..1 left to right; the top row 13..24. Both bear-off trays sit on the
 * right edge: black's on top, white's below.
 */

import type { Player, Point } from '../rules';

const frame = 24;
const pointWidth = 72;
const pointHeight = 280;
const barWidth = 72;
const trayWidth = 104;
const checkerRadius = 30;

const quadrantWidth = pointWidth * 6;
const innerWidth = quadrantWidth * 2 + barWidth;
const width = frame + innerWidth + frame + trayWidth;
const channel = 160; // open middle band where the dice sit
const height = frame + pointHeight * 2 + channel + frame;

export const BOARD = {
  width,
  height,
  frame,
  pointWidth,
  pointHeight,
  barWidth,
  trayWidth,
  checkerRadius,
  /** Left edge of the bar column. */
  barX: frame + quadrantWidth,
  /** Left edge of the bear-off tray column. */
  trayX: frame + innerWidth + frame,
} as const;

/** Anything a checker can be picked up from or dropped onto. */
export type BoardTarget = Point | 'bar' | 'off';

/** True for points rendered hanging from the top edge (13-24). */
export function isTopRow(point: Point): boolean {
  return point >= 13;
}

/** The x of the left edge of a point's column. */
export function pointAnchorX(point: Point): number {
  const column = isTopRow(point) ? point - 13 : 12 - point;
  return frame + column * pointWidth + (column >= 6 ? barWidth : 0);
}

/**
 * Center of the checker at stack position `index` (0 = at the board edge)
 * on a point holding `count` checkers. Tall stacks compress to stay inside
 * the point.
 */
export function checkerCenter(
  point: Point,
  index: number,
  count: number,
): { x: number; y: number } {
  const x = pointAnchorX(point) + pointWidth / 2;
  const span = pointHeight + channel / 2 - checkerRadius * 2;
  const spacing =
    count <= 1
      ? checkerRadius * 2
      : Math.min(checkerRadius * 2, span / (count - 1));
  const depth = checkerRadius + index * spacing;
  const y = isTopRow(point) ? frame + depth : height - frame - depth;
  return { x, y };
}

/**
 * Center of a bar checker. White re-enters into the top-right quadrant, so
 * white's bar checkers wait in the top half of the bar; black's in the bottom.
 */
export function barCheckerCenter(
  player: Player,
  index: number,
): { x: number; y: number } {
  const x = BOARD.barX + barWidth / 2;
  const offset = checkerRadius * 1.5 + index * checkerRadius * 1.25;
  const y = player === 'white' ? height / 2 - offset : height / 2 + offset;
  return { x, y };
}

/** The y of the top edge of a borne-off slab in the player's tray. */
export function traySlabY(player: Player, index: number): number {
  const slab = 18;
  const gap = 4;
  return player === 'black'
    ? frame + index * (slab + gap)
    : height - frame - slab - index * (slab + gap);
}

/**
 * What lies at a board coordinate: a point, the bar, a bear-off tray, or
 * nothing. Each point's target spans its full column down to the middle of
 * the board, so drops have generous landing zones.
 */
export function targetAt(x: number, y: number): BoardTarget | null {
  if (y < 0 || y > height || x < 0 || x > width) {
    return null;
  }
  if (x >= BOARD.trayX && x <= width) {
    return 'off';
  }
  if (x >= BOARD.barX && x < BOARD.barX + barWidth) {
    return 'bar';
  }
  if (x < frame || x >= frame + innerWidth || y < frame || y > height - frame) {
    return null;
  }
  const afterBar = x >= BOARD.barX + barWidth;
  const column =
    Math.floor((x - frame - (afterBar ? barWidth : 0)) / pointWidth) | 0;
  if (column < 0 || column > 11) {
    return null;
  }
  return y < height / 2 ? 13 + column : 12 - column;
}

/**
 * Map client (DOM) coordinates into board viewBox coordinates for an SVG
 * rendered with preserveAspectRatio "xMidYMid meet".
 */
export function clientToBoard(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const scale = Math.min(rect.width / width, rect.height / height);
  const offsetX = rect.left + (rect.width - width * scale) / 2;
  const offsetY = rect.top + (rect.height - height * scale) / 2;
  return {
    x: (clientX - offsetX) / scale,
    y: (clientY - offsetY) / scale,
  };
}

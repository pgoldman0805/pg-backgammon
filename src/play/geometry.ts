/**
 * Board geometry in SVG viewBox units: where points, checkers, the bar and
 * the bear-off trays sit, plus hit-testing for click and drag targets.
 * Pure math, shared by rendering and pointer handling.
 *
 * Orientation depends on the perspective. The white perspective (the
 * default: vs-computer and hot-seat) puts white's home board (points 1-6) in
 * the bottom-right quadrant, black's home (19-24) top-right. The bottom row
 * runs 12..1 left to right; the top row 13..24. Both bear-off trays sit on
 * the right edge: black's on top, white's below. The black perspective (the
 * Black player in a remote match) rotates the points 180 degrees through
 * `viewPoint`: point p sits in the slot white gives 25 - p, so black's home
 * is bottom right; the bar halves and the trays swap players. The frame
 * itself (bar in the middle, trays on the right) stays put.
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

/** Whose home board is drawn bottom right. */
export type Perspective = Player;

/**
 * The point drawn at `point`'s slot under the given perspective: identity
 * for white, 25 - point for black. It is its own inverse.
 */
export function viewPoint(point: Point, perspective: Perspective): Point {
  return perspective === 'white' ? point : 25 - point;
}

/** The player whose white-layout bar half and tray `player` takes. */
function viewPlayer(player: Player, perspective: Perspective): Player {
  if (perspective === 'white') {
    return player;
  }
  return player === 'white' ? 'black' : 'white';
}

/**
 * True for points rendered hanging from the top edge (13-24 under the white
 * perspective, 1-12 under black).
 */
export function isTopRow(
  point: Point,
  perspective: Perspective = 'white',
): boolean {
  return viewPoint(point, perspective) >= 13;
}

/** The x of the left edge of a point's column. */
export function pointAnchorX(
  point: Point,
  perspective: Perspective = 'white',
): number {
  const slot = viewPoint(point, perspective);
  const column = slot >= 13 ? slot - 13 : 12 - slot;
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
  perspective: Perspective = 'white',
): { x: number; y: number } {
  const x = pointAnchorX(point, perspective) + pointWidth / 2;
  const span = pointHeight + channel / 2 - checkerRadius * 2;
  const spacing =
    count <= 1
      ? checkerRadius * 2
      : Math.min(checkerRadius * 2, span / (count - 1));
  const depth = checkerRadius + index * spacing;
  const y = isTopRow(point, perspective)
    ? frame + depth
    : height - frame - depth;
  return { x, y };
}

/**
 * Center of a bar checker. White re-enters into the top-right quadrant, so
 * white's bar checkers wait in the top half of the bar; black's in the
 * bottom. The black perspective swaps the halves.
 */
export function barCheckerCenter(
  player: Player,
  index: number,
  perspective: Perspective = 'white',
): { x: number; y: number } {
  const x = BOARD.barX + barWidth / 2;
  const offset = checkerRadius * 1.5 + index * checkerRadius * 1.25;
  const y =
    viewPlayer(player, perspective) === 'white'
      ? height / 2 - offset
      : height / 2 + offset;
  return { x, y };
}

/**
 * True when the player's bear-off tray (and so their side of the board) is
 * the top one: black's under the white perspective, white's under black.
 */
export function trayOnTop(
  player: Player,
  perspective: Perspective = 'white',
): boolean {
  return viewPlayer(player, perspective) === 'black';
}

/**
 * The y of the top edge of a borne-off slab in the player's tray. The black
 * perspective swaps the trays.
 */
export function traySlabY(
  player: Player,
  index: number,
  perspective: Perspective = 'white',
): number {
  const slab = 18;
  const gap = 4;
  return trayOnTop(player, perspective)
    ? frame + index * (slab + gap)
    : height - frame - slab - index * (slab + gap);
}

/**
 * What lies at a board coordinate: a point, the bar, a bear-off tray, or
 * nothing. Each point's target spans its full column down to the middle of
 * the board, so drops have generous landing zones. Under the black
 * perspective the hit slot maps back to the real point.
 */
export function targetAt(
  x: number,
  y: number,
  perspective: Perspective = 'white',
): BoardTarget | null {
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
  const slot = y < height / 2 ? 13 + column : 12 - column;
  return viewPoint(slot, perspective);
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

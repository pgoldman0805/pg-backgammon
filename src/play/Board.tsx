/**
 * The 2D SVG backgammon board: renders a position straight from the rules
 * engine and supports both click-to-move (select an origin, click a
 * highlighted destination) and drag-and-drop (same legality, resolved through
 * the pure drag state machine and geometry hit-testing).
 */

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  type BoardState,
  type Die,
  type GameState,
  initialBoard,
  type Player,
  type Point,
} from '../rules';
import { playerName } from '../ui/format';
import {
  getAnimationSpeed,
  subscribeAnimationSpeed,
  travelMs,
} from './animation';
import { BoardStyleDefs } from './BoardStyleDefs';
import { getBoardStyle, subscribeBoardStyle } from './boardStyles';
import './boardStyles.css';
import { type CheckerPlace, checkersAt, diffBoards } from './checkerTravel';
import { type DragState, dragTransition, idleDrag } from './drag';
import {
  BOARD,
  barCheckerCenter,
  checkerCenter,
  clientToBoard,
  isTopRow,
  type Perspective,
  pointAnchorX,
  targetAt,
  trayOnTop,
  traySlabY,
} from './geometry';
import {
  destinationsFrom,
  movableOrigins,
  twoMovementDestinationsFrom,
} from './selectors';

/** The doubling cube as the board renders it. */
export interface BoardCube {
  readonly value: number;
  readonly owner: Player | 'center';
  /** True during the Crawford game: the cube is out of play. */
  readonly outOfPlay?: boolean;
}

export interface BoardProps {
  /** Null renders the static start position (before the first game). */
  readonly game: GameState | null;
  readonly selected: Point | 'bar' | null;
  readonly onSelect: (origin: Point | 'bar' | null) => void;
  readonly onMove: (from: Point | 'bar', die: Die) => void;
  /** The doubling cube to render; omit to render no cube (pre-match). */
  readonly cube?: BoardCube | null;
  /**
   * False renders the position inert (no pick-up or drop targets) — the
   * engine's turn in a vs-computer game. Defaults to true.
   */
  readonly interactive?: boolean;
  /**
   * Whose home board is drawn bottom right: 'black' rotates the board 180
   * degrees for the Black player in a remote match. Defaults to 'white'.
   */
  readonly perspective?: Perspective;
}

const PIP_OFFSETS: Record<Die, ReadonlyArray<readonly [number, number]>> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

function pointPath(point: Point, perspective: Perspective): string {
  const x = pointAnchorX(point, perspective);
  const w = BOARD.pointWidth;
  if (isTopRow(point, perspective)) {
    const y = BOARD.frame;
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w / 2} ${y + BOARD.pointHeight} Z`;
  }
  const y = BOARD.height - BOARD.frame;
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w / 2} ${y - BOARD.pointHeight} Z`;
}

function DieGlyph({
  value,
  used,
  player,
  x,
  y,
}: {
  value: Die;
  used: boolean;
  player: Player;
  x: number;
  y: number;
}) {
  const size = 56;
  return (
    <g className={`die die--${player} ${used ? 'die--used' : ''}`}>
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        rx={12}
        className="die-face"
      />
      {PIP_OFFSETS[value].map(([dx, dy]) => (
        <circle
          key={`${dx},${dy}`}
          cx={x + dx * 14}
          cy={y + dy * 14}
          r={5.5}
          className="die-pip"
        />
      ))}
    </g>
  );
}

function Checker({
  player,
  x,
  y,
  lifted,
  ringed,
  arriving,
  label,
}: {
  player: Player;
  x: number;
  y: number;
  lifted?: boolean;
  ringed?: boolean;
  /** True while this checker's traveler is still in flight toward it. */
  arriving?: boolean;
  label?: string;
}) {
  const r = BOARD.checkerRadius - 2;
  return (
    <g
      className={`checker checker--${player} ${lifted ? 'checker--lifted' : ''} ${
        arriving ? 'checker--arriving' : ''
      }`}
    >
      <circle cx={x} cy={y} r={r} className="checker-body" />
      <circle cx={x} cy={y} r={r - 9} className="checker-inner" />
      {ringed && <circle cx={x} cy={y} r={r + 5} className="checker-ring" />}
      {label && (
        <text x={x} y={y + 5.5} className="checker-count">
          {label}
        </text>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Checker travel (ticket 20)                                           */
/* ------------------------------------------------------------------ */

/**
 * One checker in flight between two board coordinates. Beyond this many
 * simultaneous moves the change is not a play but a reset (a new game, a
 * restored position): everything snaps.
 */
interface Travel {
  readonly key: number;
  readonly player: Player;
  readonly from: { x: number; y: number };
  readonly to: { x: number; y: number };
  readonly dest: CheckerPlace;
}

const MAX_TRAVELERS = 6;

/** Center of the top checker (or tray slab) at `place` on `board`. */
function placeCenter(
  board: BoardState,
  player: Player,
  place: CheckerPlace,
  perspective: Perspective,
): { x: number; y: number } {
  const count = Math.max(1, checkersAt(board, player, place));
  if (place === 'bar') {
    return barCheckerCenter(player, count - 1, perspective);
  }
  if (place === 'off') {
    const trayInnerX = BOARD.trayX;
    const trayInnerW = BOARD.width - BOARD.trayX - BOARD.frame;
    return {
      x: trayInnerX + trayInnerW / 2,
      y: traySlabY(player, count - 1, perspective) + 9,
    };
  }
  return checkerCenter(place, count - 1, count, perspective);
}

/**
 * A checker gliding from its origin to its destination: a CSS transform
 * transition on the traveler group, started one forced frame after mount so
 * the browser animates rather than teleports. The subtle lift is a scale
 * keyframe on the inner group, timed to the same duration. A timer (not
 * transitionend) retires the traveler, so jsdom and background tabs clean
 * up identically.
 */
function TravelingChecker({
  travel,
  duration,
  onDone,
}: {
  travel: Travel;
  duration: number;
  onDone: (key: number) => void;
}) {
  const ref = useRef<SVGGElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  // biome-ignore lint/correctness/useExhaustiveDependencies: a traveler is immutable; its journey runs exactly once
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.transform = `translate(${travel.from.x}px, ${travel.from.y}px)`;
      el.style.transition = 'none';
      // Flush the starting frame before handing the glide to the transition.
      void el.getBoundingClientRect();
      el.style.transition = `transform ${duration}ms cubic-bezier(0.33, 0.1, 0.25, 1)`;
      el.style.transform = `translate(${travel.to.x}px, ${travel.to.y}px)`;
    }
    const timer = setTimeout(() => done.current(travel.key), duration + 80);
    return () => clearTimeout(timer);
  }, []);
  return (
    <g
      ref={ref}
      className="checker-travel"
      style={{ transform: `translate(${travel.from.x}px, ${travel.from.y}px)` }}
    >
      <g
        className="checker-travel-lift"
        style={{ animationDuration: `${duration}ms` }}
      >
        <Checker player={travel.player} x={0} y={0} />
      </g>
    </g>
  );
}

/**
 * The doubling cube, in the left quadrant's open channel (the dice occupy the
 * right): mid-channel when centered, shifted toward the owner's side when
 * owned. A centered, never-turned cube is the stake at rest — it shows the
 * real current stake (1) and reads as quiet, not the traditional "64" face
 * that non-experts mistake for a bug in no-doubling or early states (#22).
 */
function CubeGlyph({
  cube,
  perspective,
}: {
  cube: BoardCube;
  perspective: Perspective;
}) {
  const size = 64;
  const x = BOARD.frame + (BOARD.pointWidth * 6) / 2;
  const atRest = cube.owner === 'center';
  const y = !atRest
    ? trayOnTop(cube.owner, perspective)
      ? BOARD.height / 2 - 48
      : BOARD.height / 2 + 48
    : BOARD.height / 2;
  const label = cube.outOfPlay
    ? 'Doubling cube: out of play (Crawford game)'
    : atRest
      ? `Doubling cube: centered at ${cube.value}`
      : `Doubling cube: ${playerName(cube.owner)} holds it at ${cube.value}`;
  const quiet = atRest && !cube.outOfPlay;
  return (
    // biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: an SVG <g> is not interactive; img is its true role
    <g
      className={`cube ${cube.outOfPlay ? 'cube--out-of-play' : ''} ${
        quiet ? 'cube--centered' : ''
      }`}
      role="img"
      aria-label={label}
    >
      <rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        rx={12}
        className="cube-face"
      />
      <text x={x} y={y + 9} className="cube-value">
        {cube.value}
      </text>
    </g>
  );
}

/** How many of each rolled die remain unused, for fading used dice. */
function usageFlags(
  roll: readonly Die[],
  remaining: readonly Die[],
): boolean[] {
  const left = [...remaining];
  return roll.map((die) => {
    const index = left.indexOf(die);
    if (index === -1) {
      return true;
    }
    left.splice(index, 1);
    return false;
  });
}

export function Board({
  game,
  selected,
  onSelect,
  onMove,
  cube,
  interactive = true,
  perspective = 'white',
}: BoardProps) {
  const board = game?.board ?? initialBoard();
  const turn = game?.turn ?? null;
  // The selected Board style's motif artwork; the default renders none, so
  // the default board's DOM is exactly the pre-styles DOM.
  const boardStyle = useSyncExternalStore(subscribeBoardStyle, getBoardStyle);
  const [drag, setDrag] = useState<DragState>(idleDrag);
  const svgRef = useRef<SVGSVGElement>(null);
  const suppressClick = useRef(false);

  // Checker travel (ticket 20): any programmatic reposition — the opponent's
  // paced movements, auto-played forced plays, click-to-move, undo — animates
  // as a traveler gliding between the old and new stack tops. A drag's own
  // drop stays direct manipulation (suppressTravel), and speed off means no
  // travelers at all.
  const animationSpeed = useSyncExternalStore(
    subscribeAnimationSpeed,
    getAnimationSpeed,
  );
  const duration = travelMs(animationSpeed);
  const [travels, setTravels] = useState<readonly Travel[]>([]);
  const prevBoardRef = useRef(board);
  const travelKey = useRef(0);
  const suppressTravel = useRef(false);

  useLayoutEffect(() => {
    const previous = prevBoardRef.current;
    prevBoardRef.current = board;
    if (previous === board) {
      return;
    }
    const suppressed = suppressTravel.current;
    suppressTravel.current = false;
    const moves =
      duration === 0 || suppressed ? [] : diffBoards(previous, board);
    if (moves.length === 0 || moves.length > MAX_TRAVELERS) {
      // A snap: no travelers, and none left hiding checkers they no longer own.
      setTravels((current) => (current.length === 0 ? current : []));
      return;
    }
    setTravels((current) => [
      ...current,
      ...moves.map((move) => ({
        key: travelKey.current++,
        player: move.player,
        from: placeCenter(previous, move.player, move.from, perspective),
        to: placeCenter(board, move.player, move.to, perspective),
        dest: move.to,
      })),
    ]);
  }, [board, duration, perspective]);

  function retireTravel(key: number): void {
    setTravels((current) => current.filter((travel) => travel.key !== key));
  }

  /** How many checkers bound for `place` are still in flight. */
  function arrivingCount(player: Player, place: CheckerPlace): number {
    let count = 0;
    for (const travel of travels) {
      if (travel.player === player && travel.dest === place) {
        count++;
      }
    }
    return count;
  }

  const origins = interactive ? movableOrigins(game) : [];
  const highlightOrigin =
    drag.kind === 'dragging'
      ? drag.from
      : (selected ?? (drag.kind === 'pressed' ? drag.from : null));
  const destinations =
    interactive && game && highlightOrigin !== null
      ? destinationsFrom(game, highlightOrigin)
      : [];
  const twoMovementDestinations =
    interactive && game && highlightOrigin !== null
      ? twoMovementDestinationsFrom(game, highlightOrigin)
      : [];

  function pointerPosition(event: React.PointerEvent): {
    x: number;
    y: number;
  } {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { x: -1, y: -1 };
    }
    return clientToBoard(rect, event.clientX, event.clientY);
  }

  function handleOriginDown(from: Point | 'bar') {
    return (event: React.PointerEvent<SVGGElement>) => {
      if (event.button !== 0) {
        return;
      }
      suppressClick.current = false;
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // jsdom and older browsers: capture is a progressive enhancement.
      }
      const { x, y } = pointerPosition(event);
      const at = event.timeStamp;
      setDrag(
        (state) =>
          dragTransition(state, { type: 'down', from, x, y, at }).state,
      );
    };
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.kind === 'idle') {
      return;
    }
    const { x, y } = pointerPosition(event);
    setDrag((state) => dragTransition(state, { type: 'move', x, y }).state);
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.kind === 'idle') {
      return;
    }
    const { x, y } = pointerPosition(event);
    const { state, command } = dragTransition(drag, { type: 'up', x, y });
    setDrag(state);
    if (command?.kind === 'drop') {
      // A real drag happened: swallow the click the browser fires next.
      suppressClick.current = true;
      const target = targetAt(command.x, command.y, perspective);
      const movement =
        game && target !== null && target !== 'bar'
          ? destinationsFrom(game, command.from).find((m) => m.to === target)
          : undefined;
      if (movement) {
        // Dragging is direct manipulation: the drop snaps, never glides.
        suppressTravel.current = true;
        onMove(command.from, movement.die);
      } else {
        onSelect(null); // illegal drop: the checker snaps back
      }
    } else if (command?.kind === 'dblclick') {
      // Story 45: a double-click moves the checker when exactly one movement
      // is on offer. With zero or several destinations the gesture stays two
      // ordinary clicks (the native click that follows toggles selection).
      const single = game ? destinationsFrom(game, command.from) : [];
      if (single.length === 1) {
        suppressClick.current = true;
        onMove(command.from, single[0].die);
      }
    }
  }

  function handlePointerCancel() {
    setDrag(idleDrag());
  }

  function handleOriginClick(from: Point | 'bar') {
    return () => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      onSelect(selected === from ? null : from);
    };
  }

  function originKeyDown(from: Point | 'bar') {
    return (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(selected === from ? null : from);
      }
    };
  }

  const liftedFrom = drag.kind === 'dragging' ? drag.from : null;

  // Dice: every die of the roll, used ones faded.
  const rollDice: Die[] = turn
    ? turn.roll[0] === turn.roll[1]
      ? [turn.roll[0], turn.roll[0], turn.roll[0], turn.roll[0]]
      : [...turn.roll]
    : [];
  const used = turn ? usageFlags(rollDice, turn.remainingDice) : [];
  const diceCenterX = BOARD.barX + BOARD.barWidth + (BOARD.pointWidth * 6) / 2;
  const diceSpread = 72;

  const trayInnerX = BOARD.trayX;
  const trayInnerW = BOARD.width - BOARD.trayX - BOARD.frame;

  return (
    <svg
      ref={svgRef}
      className="board"
      viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Backgammon board"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <title>Backgammon board</title>

      <BoardStyleDefs styleId={boardStyle} />

      {/* Frame and playing field */}
      <rect
        x={0}
        y={0}
        width={BOARD.width}
        height={BOARD.height}
        rx={14}
        className="board-frame"
      />
      {(
        [
          [BOARD.frame, BOARD.pointWidth * 6],
          [BOARD.barX + BOARD.barWidth, BOARD.pointWidth * 6],
        ] as const
      ).map(([x, w]) => (
        <rect
          key={x}
          x={x}
          y={BOARD.frame}
          width={w}
          height={BOARD.height - BOARD.frame * 2}
          className="board-felt"
        />
      ))}
      {/* Bear-off trays: black above, white below (swapped for black) */}
      <rect
        x={trayInnerX}
        y={BOARD.frame}
        width={trayInnerW}
        height={BOARD.height / 2 - BOARD.frame - 8}
        rx={8}
        className="board-tray"
      />
      <rect
        x={trayInnerX}
        y={BOARD.height / 2 + 8}
        width={trayInnerW}
        height={BOARD.height / 2 - BOARD.frame - 8}
        rx={8}
        className="board-tray"
      />

      {/* Points */}
      {Array.from({ length: 24 }, (_, i) => i + 1).map((p) => (
        <path
          key={p}
          d={pointPath(p, perspective)}
          className={p % 2 === 0 ? 'point point--cool' : 'point point--hot'}
        />
      ))}

      {/* Point numbers on the frame (baselines sized for the 19px type) */}
      {Array.from({ length: 24 }, (_, i) => i + 1).map((p) => (
        <text
          key={p}
          x={pointAnchorX(p, perspective) + BOARD.pointWidth / 2}
          y={
            isTopRow(p, perspective)
              ? BOARD.frame - 5
              : BOARD.height - BOARD.frame + 19
          }
          className="point-number"
        >
          {p}
        </text>
      ))}

      {/* The doubling cube */}
      {cube && <CubeGlyph cube={cube} perspective={perspective} />}

      {/* Dice */}
      {rollDice.map((die, i) => (
        <DieGlyph
          // biome-ignore lint/suspicious/noArrayIndexKey: dice are positional
          key={i}
          value={die}
          used={used[i]}
          player={turn?.player ?? 'white'}
          x={diceCenterX + (i - (rollDice.length - 1) / 2) * diceSpread}
          y={BOARD.height / 2}
        />
      ))}

      {/* Borne-off checkers */}
      {(['black', 'white'] as const).map((player) => {
        const hiddenSlabs = arrivingCount(player, 'off');
        return Array.from({ length: board.off[player] }, (_, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: borne-off slabs are identical positional slots
            key={`${player}-${i}`}
            x={trayInnerX + 12}
            y={traySlabY(player, i, perspective)}
            width={trayInnerW - 24}
            height={18}
            rx={5}
            className={`off-slab off-slab--${player} ${
              i >= board.off[player] - hiddenSlabs ? 'off-slab--arriving' : ''
            }`}
          />
        ));
      })}

      {/* Checkers on points */}
      {Array.from({ length: 24 }, (_, i) => i + 1).map((p) => {
        const count = board.points[p];
        if (count === 0) {
          return null;
        }
        const player: Player = count > 0 ? 'white' : 'black';
        const n = Math.abs(count);
        const movable = origins.includes(p);
        const hiddenTop = arrivingCount(player, p);
        const stack = Array.from({ length: n }, (_, index) => (
          <Checker
            // biome-ignore lint/suspicious/noArrayIndexKey: checkers in a stack are identical positional slots
            key={index}
            player={player}
            {...checkerCenter(p, index, n, perspective)}
            lifted={liftedFrom === p && index === n - 1}
            ringed={highlightOrigin === p && index === n - 1}
            arriving={index >= n - hiddenTop}
            label={n > 5 && index === n - 1 ? String(n) : undefined}
          />
        ));
        return movable ? (
          // biome-ignore lint/a11y/useSemanticElements: native buttons cannot exist inside SVG
          <g
            key={p}
            role="button"
            tabIndex={0}
            aria-label={`Move from point ${p}`}
            className="origin"
            onPointerDown={handleOriginDown(p)}
            onClick={handleOriginClick(p)}
            onKeyDown={originKeyDown(p)}
          >
            {stack}
          </g>
        ) : (
          <g key={p}>{stack}</g>
        );
      })}

      {/* Checkers on the bar */}
      {(['white', 'black'] as const).map((player) => {
        const n = board.bar[player];
        if (n === 0) {
          return null;
        }
        const movable = origins.includes('bar') && turn?.player === player;
        const hiddenTop = arrivingCount(player, 'bar');
        const stack = Array.from({ length: n }, (_, index) => (
          <Checker
            // biome-ignore lint/suspicious/noArrayIndexKey: checkers in a stack are identical positional slots
            key={index}
            player={player}
            {...barCheckerCenter(player, index, perspective)}
            lifted={liftedFrom === 'bar' && index === n - 1}
            ringed={movable && highlightOrigin === 'bar' && index === n - 1}
            arriving={index >= n - hiddenTop}
          />
        ));
        return movable ? (
          // biome-ignore lint/a11y/useSemanticElements: native buttons cannot exist inside SVG
          <g
            key={player}
            role="button"
            tabIndex={0}
            aria-label="Move from the bar"
            className="origin"
            onPointerDown={handleOriginDown('bar')}
            onClick={handleOriginClick('bar')}
            onKeyDown={originKeyDown('bar')}
          >
            {stack}
          </g>
        ) : (
          <g key={player}>{stack}</g>
        );
      })}

      {/* Legal destinations for the highlighted origin */}
      {highlightOrigin !== null &&
        destinations.map((movement) => {
          const commit = () => onMove(highlightOrigin, movement.die);
          const keyDown = (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              commit();
            }
          };
          if (movement.to === 'off') {
            const player = turn?.player ?? 'white';
            const y = trayOnTop(player, perspective)
              ? BOARD.frame
              : BOARD.height / 2 + 8;
            return (
              // biome-ignore lint/a11y/useSemanticElements: native buttons cannot exist inside SVG
              <g
                key="off"
                role="button"
                tabIndex={0}
                aria-label="Bear off"
                className="dest"
                onClick={commit}
                onKeyDown={keyDown}
              >
                <rect
                  x={trayInnerX}
                  y={y}
                  width={trayInnerW}
                  height={BOARD.height / 2 - BOARD.frame - 8}
                  rx={8}
                  className="dest-tray"
                />
              </g>
            );
          }
          const to = movement.to;
          const top = isTopRow(to, perspective);
          return (
            // biome-ignore lint/a11y/useSemanticElements: native buttons cannot exist inside SVG
            <g
              key={to}
              role="button"
              tabIndex={0}
              aria-label={`Move to point ${to}`}
              className="dest"
              onClick={commit}
              onKeyDown={keyDown}
            >
              <path d={pointPath(to, perspective)} className="dest-point" />
              <rect
                x={pointAnchorX(to, perspective)}
                y={top ? 0 : BOARD.height / 2}
                width={BOARD.pointWidth}
                height={BOARD.height / 2}
                className="dest-zone"
              />
            </g>
          );
        })}

      {/* Two-movement destinations (story 46): the final point one checker
          reaches with two of the remaining dice; clicking applies both
          movements in order. Rendered after the one-die destinations so tab
          order runs near targets first, then far ones. */}
      {highlightOrigin !== null &&
        twoMovementDestinations.map((destination) => {
          const commit = () => {
            for (const movement of destination.movements) {
              onMove(movement.from, movement.die);
            }
          };
          const keyDown = (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              commit();
            }
          };
          if (destination.to === 'off') {
            const player = turn?.player ?? 'white';
            const y = trayOnTop(player, perspective)
              ? BOARD.frame
              : BOARD.height / 2 + 8;
            return (
              // biome-ignore lint/a11y/useSemanticElements: native buttons cannot exist inside SVG
              <g
                key="two-off"
                role="button"
                tabIndex={0}
                aria-label="Bear off in two movements"
                className="dest dest--two"
                onClick={commit}
                onKeyDown={keyDown}
              >
                <rect
                  x={trayInnerX}
                  y={y}
                  width={trayInnerW}
                  height={BOARD.height / 2 - BOARD.frame - 8}
                  rx={8}
                  className="dest-tray dest-tray--two"
                />
              </g>
            );
          }
          const to = destination.to;
          const top = isTopRow(to, perspective);
          return (
            // biome-ignore lint/a11y/useSemanticElements: native buttons cannot exist inside SVG
            <g
              key={`two-${to}`}
              role="button"
              tabIndex={0}
              aria-label={`Move to point ${to} in two movements`}
              className="dest dest--two"
              onClick={commit}
              onKeyDown={keyDown}
            >
              <path
                d={pointPath(to, perspective)}
                className="dest-point dest-point--two"
              />
              <rect
                x={pointAnchorX(to, perspective)}
                y={top ? 0 : BOARD.height / 2}
                width={BOARD.pointWidth}
                height={BOARD.height / 2}
                className="dest-zone"
              />
            </g>
          );
        })}

      {/* Checkers in programmatic flight (ticket 20) */}
      {travels.map((travel) => (
        <TravelingChecker
          key={travel.key}
          travel={travel}
          duration={duration}
          onDone={retireTravel}
        />
      ))}

      {/* The checker in flight while dragging */}
      {drag.kind === 'dragging' && turn && (
        <g className="drag-ghost">
          <Checker player={turn.player} x={drag.x} y={drag.y} />
        </g>
      )}
    </svg>
  );
}

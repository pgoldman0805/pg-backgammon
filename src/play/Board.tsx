/**
 * The 2D SVG backgammon board: renders a position straight from the rules
 * engine and supports both click-to-move (select an origin, click a
 * highlighted destination) and drag-and-drop (same legality, resolved through
 * the pure drag state machine and geometry hit-testing).
 */

import { useRef, useState } from 'react';
import {
  type Die,
  type GameState,
  initialBoard,
  type Player,
  type Point,
} from '../rules';
import { type DragState, dragTransition, idleDrag } from './drag';
import {
  BOARD,
  barCheckerCenter,
  checkerCenter,
  clientToBoard,
  isTopRow,
  pointAnchorX,
  targetAt,
  traySlabY,
} from './geometry';
import { destinationsFrom, movableOrigins } from './selectors';

export interface BoardProps {
  /** Null renders the static start position (before the first game). */
  readonly game: GameState | null;
  readonly selected: Point | 'bar' | null;
  readonly onSelect: (origin: Point | 'bar' | null) => void;
  readonly onMove: (from: Point | 'bar', die: Die) => void;
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

function pointPath(point: Point): string {
  const x = pointAnchorX(point);
  const w = BOARD.pointWidth;
  if (isTopRow(point)) {
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
  label,
}: {
  player: Player;
  x: number;
  y: number;
  lifted?: boolean;
  ringed?: boolean;
  label?: string;
}) {
  const r = BOARD.checkerRadius - 2;
  return (
    <g
      className={`checker checker--${player} ${lifted ? 'checker--lifted' : ''}`}
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

export function Board({ game, selected, onSelect, onMove }: BoardProps) {
  const board = game?.board ?? initialBoard();
  const turn = game?.turn ?? null;
  const [drag, setDrag] = useState<DragState>(idleDrag);
  const svgRef = useRef<SVGSVGElement>(null);
  const suppressClick = useRef(false);

  const origins = movableOrigins(game);
  const highlightOrigin =
    drag.kind === 'dragging'
      ? drag.from
      : (selected ?? (drag.kind === 'pressed' ? drag.from : null));
  const destinations =
    game && highlightOrigin !== null
      ? destinationsFrom(game, highlightOrigin)
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
      setDrag(
        (state) => dragTransition(state, { type: 'down', from, x, y }).state,
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
      const target = targetAt(command.x, command.y);
      const movement =
        game && target !== null && target !== 'bar'
          ? destinationsFrom(game, command.from).find((m) => m.to === target)
          : undefined;
      if (movement) {
        onMove(command.from, movement.die);
      } else {
        onSelect(null); // illegal drop: the checker snaps back
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
      {/* Bear-off trays: black above, white below */}
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
          d={pointPath(p)}
          className={p % 2 === 0 ? 'point point--cool' : 'point point--hot'}
        />
      ))}

      {/* Point numbers on the frame */}
      {Array.from({ length: 24 }, (_, i) => i + 1).map((p) => (
        <text
          key={p}
          x={pointAnchorX(p) + BOARD.pointWidth / 2}
          y={isTopRow(p) ? BOARD.frame - 7 : BOARD.height - BOARD.frame + 17}
          className="point-number"
        >
          {p}
        </text>
      ))}

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
      {(['black', 'white'] as const).map((player) =>
        Array.from({ length: board.off[player] }, (_, i) => (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: borne-off slabs are identical positional slots
            key={`${player}-${i}`}
            x={trayInnerX + 12}
            y={traySlabY(player, i)}
            width={trayInnerW - 24}
            height={18}
            rx={5}
            className={`off-slab off-slab--${player}`}
          />
        )),
      )}

      {/* Checkers on points */}
      {Array.from({ length: 24 }, (_, i) => i + 1).map((p) => {
        const count = board.points[p];
        if (count === 0) {
          return null;
        }
        const player: Player = count > 0 ? 'white' : 'black';
        const n = Math.abs(count);
        const movable = origins.includes(p);
        const stack = Array.from({ length: n }, (_, index) => (
          <Checker
            // biome-ignore lint/suspicious/noArrayIndexKey: checkers in a stack are identical positional slots
            key={index}
            player={player}
            {...checkerCenter(p, index, n)}
            lifted={liftedFrom === p && index === n - 1}
            ringed={highlightOrigin === p && index === n - 1}
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
        const stack = Array.from({ length: n }, (_, index) => (
          <Checker
            // biome-ignore lint/suspicious/noArrayIndexKey: checkers in a stack are identical positional slots
            key={index}
            player={player}
            {...barCheckerCenter(player, index)}
            lifted={liftedFrom === 'bar' && index === n - 1}
            ringed={movable && highlightOrigin === 'bar' && index === n - 1}
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
            const y = player === 'black' ? BOARD.frame : BOARD.height / 2 + 8;
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
          const top = isTopRow(to);
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
              <path d={pointPath(to)} className="dest-point" />
              <rect
                x={pointAnchorX(to)}
                y={top ? 0 : BOARD.height / 2}
                width={BOARD.pointWidth}
                height={BOARD.height / 2}
                className="dest-zone"
              />
            </g>
          );
        })}

      {/* The checker in flight while dragging */}
      {drag.kind === 'dragging' && turn && (
        <g className="drag-ghost">
          <Checker player={turn.player} x={drag.x} y={drag.y} />
        </g>
      )}
    </svg>
  );
}

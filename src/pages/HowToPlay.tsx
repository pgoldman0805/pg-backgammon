/**
 * The how-to-play primer (ticket 30, review finding #6). A complete newcomer
 * can learn the game here without leaving the app: the goal, which way
 * checkers travel, hitting and the bar, bearing off, and the doubling cube —
 * in plain language, each with a small diagram drawn in the board's own
 * point-triangle vocabulary. Jargon links to the glossary below through the
 * same GlossaryTerm the rest of the app uses. It is pure and client-only: no
 * engine, no state, just reading.
 */

import type { ReactNode } from 'react';
import { GlossaryTerm } from '../ui/GlossaryTerm';
import './howToPlay.css';

/** One fundamental: a heading, the prose, and its supporting diagram. */
function Topic({
  id,
  heading,
  diagram,
  children,
}: {
  id: string;
  heading: string;
  diagram: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="htp-topic" id={id}>
      <h3 className="htp-topic-heading">{heading}</h3>
      <div className="htp-topic-body">
        <div className="htp-prose">{children}</div>
        <figure className="htp-figure">{diagram}</figure>
      </div>
    </section>
  );
}

/* ---- Diagram primitives, drawn in the board's point-triangle language ---- */

const QUAD_W = 240;
const QUAD_H = 120;
// Six evenly spaced points; centre x of point i and the triangle it draws.
const pointX = (i: number) => 24 + i * 36;
const upTriangle = (cx: number) =>
  `M${cx - 15} 112 L${cx + 15} 112 L${cx} 50 Z`;

function Points({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <path
          key={pointX(i)}
          className={i % 2 === 0 ? 'htp-point htp-point--a' : 'htp-point'}
          d={upTriangle(pointX(i))}
        />
      ))}
    </>
  );
}

function Checker({
  cx,
  cy,
  kind = 'you',
}: {
  cx: number;
  cy: number;
  kind?: 'you' | 'them' | 'hit';
}) {
  return (
    <circle
      className={`htp-checker htp-checker--${kind}`}
      cx={cx}
      cy={cy}
      r={11}
    />
  );
}

/** The whole board as a race: everything heads to the tinted home corner. */
function GoalDiagram() {
  return (
    <svg viewBox="0 0 240 150" className="htp-svg" aria-hidden="true">
      <rect className="htp-frame" x="8" y="8" width="224" height="134" rx="8" />
      {/* The bar down the middle and the home quarter, lit in the accent. */}
      <rect className="htp-bar" x="114" y="8" width="12" height="134" />
      <rect
        className="htp-home"
        x="126"
        y="75"
        width="106"
        height="67"
        rx="2"
      />
      {/* Travel sweeps around and into home. */}
      <path
        className="htp-arrow"
        d="M40 36 C 120 20, 210 28, 196 104"
        markerEnd="url(#htp-arrowhead)"
        fill="none"
      />
      <Checker cx={40} cy={40} kind="you" />
      <Checker cx={150} cy={108} kind="you" />
      <Checker cx={178} cy={108} kind="you" />
      <ArrowheadDef />
    </svg>
  );
}

/** A die of four sends a checker four points along; the ghost marks where. */
function MoveDiagram() {
  return (
    <svg
      viewBox={`0 0 ${QUAD_W} ${QUAD_H + 30}`}
      className="htp-svg"
      aria-hidden="true"
    >
      <Points />
      {/* Four steps along the board: point 5 to point 1. */}
      <path
        className="htp-arrow"
        d={`M${pointX(5)} 40 C ${pointX(4)} 8, ${pointX(2)} 8, ${pointX(1)} 40`}
        markerEnd="url(#htp-arrowhead)"
        fill="none"
      />
      <Checker cx={pointX(5)} cy={96} kind="you" />
      <circle className="htp-checker htp-ghost" cx={pointX(1)} cy={96} r={11} />
      <Die x={pointX(3) - 15} y={108} value={4} />
      <ArrowheadDef />
    </svg>
  );
}

/** Land on a lone enemy checker and it goes to the bar. */
function HitDiagram() {
  return (
    <svg viewBox="0 0 240 150" className="htp-svg" aria-hidden="true">
      {/* The bar: where a hit checker waits to come back in. */}
      <rect
        className="htp-barstrip"
        x="8"
        y="8"
        width="224"
        height="30"
        rx="4"
      />
      <Checker cx={120} cy={23} kind="hit" />
      <path
        d={upTriangle(90)}
        className="htp-point htp-point--a"
        transform="translate(0,22)"
      />
      <path
        d={upTriangle(150)}
        className="htp-point"
        transform="translate(0,22)"
      />
      {/* Your checker arrives on the blot; the blot flies up to the bar. */}
      <Checker cx={90} cy={118} kind="you" />
      <path
        className="htp-arrow htp-arrow--hit"
        d="M98 112 C 120 90, 122 60, 120 42"
        markerEnd="url(#htp-arrowhead-hit)"
        fill="none"
      />
      <ArrowheadDef hit />
    </svg>
  );
}

/** All home, so checkers come off the board into the tray. */
function BearOffDiagram() {
  return (
    <svg viewBox="0 0 240 150" className="htp-svg" aria-hidden="true">
      <Points count={5} />
      {/* The off-tray at the right edge. */}
      <rect className="htp-tray" x="206" y="46" width="26" height="80" rx="3" />
      <Checker cx={pointX(0)} cy={96} kind="you" />
      <Checker cx={pointX(1)} cy={96} kind="you" />
      <Checker cx={pointX(2)} cy={96} kind="you" />
      <Checker cx={pointX(3)} cy={96} kind="you" />
      {/* One checker lifting off. */}
      <path
        className="htp-arrow"
        d={`M${pointX(4)} 70 C ${pointX(4) + 20} 50, 210 52, 219 70`}
        markerEnd="url(#htp-arrowhead)"
        fill="none"
      />
      <Checker cx={219} cy={112} kind="you" />
      <ArrowheadDef />
    </svg>
  );
}

/** The doubling cube, showing the stakes raised to 2. */
function CubeDiagram() {
  return (
    <svg viewBox="0 0 160 150" className="htp-svg" aria-hidden="true">
      <rect className="htp-cube" x="46" y="36" width="68" height="68" rx="10" />
      <text
        className="htp-cube-face"
        x="80"
        y="80"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        2
      </text>
      <path
        className="htp-arrow"
        d="M118 70 C 140 66, 140 92, 120 96"
        markerEnd="url(#htp-arrowhead)"
        fill="none"
      />
      <ArrowheadDef />
    </svg>
  );
}

function Die({ x, y, value }: { x: number; y: number; value: number }) {
  // Pip layout for small faces (only 4 is used here, but kept general).
  const grid: Record<number, Array<[number, number]>> = {
    4: [
      [0.3, 0.3],
      [0.7, 0.3],
      [0.3, 0.7],
      [0.7, 0.7],
    ],
  };
  const size = 30;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="htp-die" width={size} height={size} rx={5} />
      {(grid[value] ?? []).map(([px, py]) => (
        <circle
          key={`${px},${py}`}
          className="htp-die-pip"
          cx={px * size}
          cy={py * size}
          r={2.6}
        />
      ))}
    </g>
  );
}

/** The arrowhead marker; a second rust variant marks the hit. */
function ArrowheadDef({ hit = false }: { hit?: boolean }) {
  const id = hit ? 'htp-arrowhead-hit' : 'htp-arrowhead';
  const cls = hit ? 'htp-arrowhead htp-arrowhead--hit' : 'htp-arrowhead';
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="7"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path className={cls} d="M0 0 L10 5 L0 10 Z" />
      </marker>
    </defs>
  );
}

export function HowToPlay() {
  return (
    <section className="primer" aria-label="How to play">
      <header className="primer-header">
        <svg
          className="primer-point"
          width="12"
          height="14"
          viewBox="0 0 12 14"
          aria-hidden="true"
        >
          <path d="M0 14h12L6 0z" />
        </svg>
        <h2>How to play</h2>
        <p className="primer-blurb">New to backgammon? Start here.</p>
      </header>

      <p className="primer-intro">
        Backgammon in a few minutes. By the end you will know enough to make
        your first move with confidence. Point at any{' '}
        <GlossaryTerm id="pips">underlined term</GlossaryTerm> for a quick
        definition — the full list is in the glossary below.
      </p>

      <Topic id="htp-goal" heading="The goal" diagram={<GoalDiagram />}>
        <p>
          Backgammon is a race between two players, each with fifteen checkers.
          You move your checkers around the board toward your home — the quarter
          nearest you — and once all fifteen are home you take them off the
          board.
        </p>
        <p>
          The first player to bear off all fifteen wins the game. Take every
          checker off before your opponent has borne off a single one and you
          win a <GlossaryTerm id="gammon">gammon</GlossaryTerm>, worth double.
        </p>
      </Topic>

      <Topic
        id="htp-move"
        heading="Moving your checkers"
        diagram={<MoveDiagram />}
      >
        <p>
          Roll two dice and move one checker for each die — or move the same
          checker twice, once for each number. A four moves a checker four
          points along; roll a double and you get four moves of that number.
        </p>
        <p>
          Your checkers always travel the same way: around the board and into
          your home board. You can land on any open point, or one your own
          checkers already hold — but never on a point where your opponent has
          two or more. The <GlossaryTerm id="pips">pip count</GlossaryTerm>{' '}
          totals how far you still have to go; the lower count leads the race.
        </p>
      </Topic>

      <Topic
        id="htp-hit"
        heading="Hitting and the bar"
        diagram={<HitDiagram />}
      >
        <p>
          A point held by just one enemy checker is a blot. Land on a blot and
          you hit it: the checker is sent to the bar, the raised strip down the
          middle of the board.
        </p>
        <p>
          A player with a checker on the bar must bring it back in first —
          re-entering in the opponent's home board on the next roll — before
          doing anything else. If every entry point is blocked, the turn is
          lost. Hitting is how ground is won and lost.
        </p>
      </Topic>

      <Topic
        id="htp-bearoff"
        heading="Bearing off"
        diagram={<BearOffDiagram />}
      >
        <p>
          Once all fifteen of your checkers are in your home board you can start
          the <GlossaryTerm id="bear-off">bear-off</GlossaryTerm> — taking them
          off the board entirely. Each die removes a checker from the point that
          matches its number.
        </p>
        <p>
          You win the moment your last checker comes off. When neither side can
          be hit any more, the game is a pure{' '}
          <GlossaryTerm id="race">race</GlossaryTerm> — simply whoever bears off
          first.
        </p>
      </Topic>

      <Topic
        id="htp-cube"
        heading="The doubling cube"
        diagram={<CubeDiagram />}
      >
        <p>
          The <GlossaryTerm id="doubling-cube">doubling cube</GlossaryTerm> is a
          six-sided die marked 2, 4, 8, 16, 32, 64 that tracks the stakes.
          Before rolling, if you think you are ahead, you can offer to double:
          your opponent either takes — playing on for twice the stakes — or
          passes and concedes the game then and there.
        </p>
        <p>
          It is where much of a match is won or lost, but you can leave it alone
          while you learn. The app prompts you when a cube decision is yours,
          and <GlossaryTerm id="tutor-mode">Tutor mode</GlossaryTerm> will coach
          the call.
        </p>
      </Topic>
    </section>
  );
}

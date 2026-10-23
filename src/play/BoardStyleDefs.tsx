/**
 * Per-style SVG artwork (issue 19): the patterns and gradients a Board style's
 * CSS points its surfaces at. Only the active style's defs render — the
 * default renders nothing at all, keeping the default board's DOM exactly as
 * it was before styles existed. Every color inside comes from the style's CSS
 * tokens (classes in boardStyles.css), so each motif follows the light/dark
 * theme automatically. Shared paint servers only — no per-checker filters.
 */

import type { BoardStyleId } from './boardStyles';

/* Gentle offshore swell: two long low sine lines, tiled across the felt. */
function AegeanDefs() {
  return (
    <defs>
      <pattern
        id="bs-aegean-waves"
        width={140}
        height={64}
        patternUnits="userSpaceOnUse"
      >
        <rect width={140} height={64} className="bs-pattern-bg--felt" />
        <path
          d="M 0 18 Q 17.5 10 35 18 T 70 18 T 105 18 T 140 18"
          className="bs-wave-line"
        />
        <path
          d="M 0 46 Q 17.5 54 35 46 T 70 46 T 105 46 T 140 46"
          className="bs-wave-line"
        />
      </pattern>
    </defs>
  );
}

/* Long walnut grain, drawn once and tiled over frame and trays. */
function woodGrain() {
  return (
    <>
      <path
        d="M 0 9 C 30 6 60 12 90 9 S 150 6 180 9"
        className="bs-grain--light"
        strokeWidth={1.3}
      />
      <path
        d="M 0 22 C 40 19 80 25 120 22 S 160 20 180 22"
        className="bs-grain--dark"
        strokeWidth={1.8}
      />
      <path
        d="M 0 36 C 25 33 55 39 95 36 S 140 33 180 36"
        className="bs-grain--dark"
        strokeWidth={1.1}
      />
      <path
        d="M 0 45 C 50 43 90 47 140 45 S 170 44 180 45"
        className="bs-grain--light"
        strokeWidth={0.9}
      />
    </>
  );
}

function BosphorusDefs() {
  return (
    <defs>
      <pattern
        id="bs-bosphorus-wood-frame"
        width={180}
        height={48}
        patternUnits="userSpaceOnUse"
      >
        <rect width={180} height={48} className="bs-pattern-bg--frame" />
        {woodGrain()}
      </pattern>
      <pattern
        id="bs-bosphorus-wood-tray"
        width={180}
        height={48}
        patternUnits="userSpaceOnUse"
      >
        <rect width={180} height={48} className="bs-pattern-bg--tray" />
        {woodGrain()}
      </pattern>
      {/* Mother-of-pearl: an off-center sheen drifting rose then sea-green. */}
      <radialGradient id="bs-bosphorus-pearl" cx={0.35} cy={0.3} r={0.9}>
        <stop offset="0" className="bs-pearl-stop-hi" />
        <stop offset="0.45" className="bs-pearl-stop-rose" />
        <stop offset="0.72" className="bs-pearl-stop-green" />
        <stop offset="1" className="bs-pearl-stop-base" />
      </radialGradient>
    </defs>
  );
}

/* An eight-point zellige star: an inset square crossed by its diamond. */
function MarrakechDefs() {
  return (
    <defs>
      <pattern
        id="bs-marrakech-zellige"
        width={36}
        height={36}
        patternUnits="userSpaceOnUse"
      >
        <rect width={36} height={36} className="bs-pattern-bg--frame" />
        <rect
          x={10.5}
          y={10.5}
          width={15}
          height={15}
          className="bs-star-line--deep"
        />
        <path d="M 18 3 L 33 18 L 18 33 L 3 18 Z" className="bs-star-line" />
        <circle cx={18} cy={18} r={1.8} className="bs-star-dot" />
      </pattern>
    </defs>
  );
}

/* Asanoha hint: a triangle lattice with centroid spokes, tiled two rows. */
function KyotoDefs() {
  const lattice = [
    'M 0 0 H 46',
    'M 0 39.8 H 46',
    'M 0 0 L 23 39.8 L 46 0',
    'M 23 13.3 L 0 0 M 23 13.3 L 46 0 M 23 13.3 L 23 39.8',
    'M 0 79.7 L 23 39.8 L 46 79.7',
    'M 46 53.1 L 23 39.8 M 46 53.1 L 46 79.7',
    'M 0 53.1 L 23 39.8 M 0 53.1 L 0 79.7',
  ].join(' ');
  return (
    <defs>
      <pattern
        id="bs-kyoto-asanoha"
        width={46}
        height={79.7}
        patternUnits="userSpaceOnUse"
      >
        <rect width={46} height={79.7} className="bs-pattern-bg--cool" />
        <path d={lattice} className="bs-asanoha-line" />
      </pattern>
      {/* Lacquer sheen on the black checkers. */}
      <radialGradient id="bs-kyoto-lacquer" cx={0.35} cy={0.3} r={0.8}>
        <stop offset="0" className="bs-lacquer-stop-hi" />
        <stop offset="1" className="bs-lacquer-stop-base" />
      </radialGradient>
    </defs>
  );
}

function ReykjavikDefs() {
  return (
    <defs>
      {/* Ice sheen: the felt cools toward the top of each half. */}
      <linearGradient id="bs-reykjavik-ice" x1={0} y1={0} x2={0} y2={1}>
        <stop offset="0" className="bs-ice-stop-hi" />
        <stop offset="0.6" className="bs-ice-stop-base" />
      </linearGradient>
      {/* Basalt columns: hairline striations down the frame. */}
      <pattern
        id="bs-reykjavik-basalt"
        width={14}
        height={40}
        patternUnits="userSpaceOnUse"
      >
        <rect width={14} height={40} className="bs-pattern-bg--frame" />
        <path d="M 3.5 0 V 40" className="bs-basalt-line" />
        <path d="M 10.5 0 V 40" className="bs-basalt-line" opacity={0.6} />
      </pattern>
    </defs>
  );
}

export function BoardStyleDefs({ styleId }: { styleId: BoardStyleId }) {
  switch (styleId) {
    case 'classic':
      return null;
    case 'aegean':
      return <AegeanDefs />;
    case 'bosphorus':
      return <BosphorusDefs />;
    case 'marrakech':
      return <MarrakechDefs />;
    case 'kyoto':
      return <KyotoDefs />;
    case 'reykjavik':
      return <ReykjavikDefs />;
  }
}

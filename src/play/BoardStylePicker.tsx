/**
 * The Board style picker (issue 19): six radio tiles, each previewing a style
 * as a mini-board painted from that style's own CSS tokens (the tile carries
 * its style's `data-board-style` attribute, so the scoped token blocks in
 * boardStyles.css color the preview without screenshots or duplicated hexes).
 * Selection persists like the theme and applies to every Board instantly.
 */

import { useId } from 'react';
import { BOARD_STYLES, useBoardStyle } from './boardStyles';
import './boardStyles.css';

/** Top-row triangle x positions in the 64x42 preview viewBox. */
const PREVIEW_POINTS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function previewTriangle(column: number, top: boolean): string {
  const x = 4 + column * 7;
  return top
    ? `M ${x} 4 L ${x + 7} 4 L ${x + 3.5} 17 Z`
    : `M ${x} 38 L ${x + 7} 38 L ${x + 3.5} 25 Z`;
}

/** A mini-board rendered purely from the surrounding style's tokens. */
function StylePreview() {
  return (
    <svg
      className="style-preview"
      viewBox="0 0 64 42"
      aria-hidden="true"
      focusable="false"
    >
      <rect x={0} y={0} width={64} height={42} rx={4} className="sp-frame" />
      <rect x={4} y={4} width={56} height={34} className="sp-felt" />
      {PREVIEW_POINTS.map((column) => (
        <path
          key={`top-${column}`}
          d={previewTriangle(column, true)}
          className={column % 2 === 0 ? 'sp-hot' : 'sp-cool'}
        />
      ))}
      {PREVIEW_POINTS.map((column) => (
        <path
          key={`bottom-${column}`}
          d={previewTriangle(column, false)}
          className={column % 2 === 0 ? 'sp-cool' : 'sp-hot'}
        />
      ))}
      <circle cx={18} cy={21} r={5} className="sp-white" />
      <circle cx={46} cy={21} r={5} className="sp-black" />
    </svg>
  );
}

export function BoardStylePicker() {
  const [style, setStyle] = useBoardStyle();
  // The picker can appear twice (setup card and HUD); each instance is its
  // own native radio group.
  const group = useId();
  const selected = BOARD_STYLES.find((s) => s.id === style) ?? BOARD_STYLES[0];
  return (
    <fieldset className="board-style-picker">
      <legend className="board-style-legend">Board style</legend>
      <div className="board-style-options">
        {BOARD_STYLES.map((option) => (
          <label
            key={option.id}
            className="board-style-tile"
            data-board-style={option.id}
            title={`${option.name} — ${option.mood}`}
          >
            <input
              type="radio"
              name={`board-style-${group}`}
              value={option.id}
              checked={style === option.id}
              onChange={() => setStyle(option.id)}
            />
            <StylePreview />
            <span className="board-style-name">{option.name}</span>
          </label>
        ))}
      </div>
      <p className="board-style-mood">
        {selected.name} — {selected.mood}
      </p>
    </fieldset>
  );
}

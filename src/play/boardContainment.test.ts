/**
 * Ticket 39 — dark-mode board containment. The board must read as a distinct,
 * contained object in dark mode on every Board style: a visible perimeter edge
 * and defined bear-off tray wells, so the board does not dissolve into the
 * page and borne-off checkers land in visible trays. Light mode must be
 * untouched.
 *
 * These are source-contract checks over the two stylesheets: the shape rules
 * must paint their edges from the containment tokens, light mode must leave
 * those tokens transparent, and every dark palette (the base plus the six
 * styles) must define a non-transparent edge for both the frame and the tray.
 */

/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';

const playDir = path.join(process.cwd(), 'src', 'play');
const boardCss = readFileSync(path.join(playDir, 'board.css'), 'utf8');
const stylesCss = readFileSync(path.join(playDir, 'boardStyles.css'), 'utf8');

/** The body of the first CSS block whose selector list contains `selector`. */
function blockBody(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) {
    throw new Error(`selector not found: ${selector}`);
  }
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

/** The value of `--token` within a block body, or null when unset. */
function tokenValue(body: string, token: string): string | null {
  const match = body.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

function isVisibleEdge(value: string | null): boolean {
  if (value === null) {
    return false;
  }
  const v = value.toLowerCase();
  if (v === 'transparent' || v === 'none') {
    return false;
  }
  // An rgba/hsla with a zero alpha is also invisible.
  const alpha = v.match(/[\d.]+\s*\)\s*$/);
  if (alpha && Number.parseFloat(alpha[0]) === 0) {
    return false;
  }
  return true;
}

describe('the board paints its containment edges from tokens', () => {
  it('strokes the frame from --board-edge', () => {
    const body = blockBody(boardCss, '.board-frame {');
    expect(body).toMatch(/stroke:\s*var\(--board-edge/);
  });

  it('strokes the bear-off trays from --board-tray-edge', () => {
    const body = blockBody(boardCss, '.board-tray {');
    expect(body).toMatch(/stroke:\s*var\(--board-tray-edge/);
  });
});

describe('light mode is unaffected (the edges stay transparent)', () => {
  it('leaves --board-edge and --board-tray-edge transparent in the light root', () => {
    const body = blockBody(boardCss, ':root {');
    expect(tokenValue(body, '--board-edge')).toBe('transparent');
    expect(tokenValue(body, '--board-tray-edge')).toBe('transparent');
  });

  it('keeps the light Classic style block transparent', () => {
    const body = blockBody(stylesCss, '[data-board-style="classic"] {');
    expect(isVisibleEdge(tokenValue(body, '--board-edge'))).toBe(false);
    expect(isVisibleEdge(tokenValue(body, '--board-tray-edge'))).toBe(false);
  });
});

describe('every dark palette defines a visible board boundary', () => {
  it('the base dark root lifts a visible frame and tray edge', () => {
    const body = blockBody(boardCss, ':root[data-theme="dark"] {');
    expect(isVisibleEdge(tokenValue(body, '--board-edge'))).toBe(true);
    expect(isVisibleEdge(tokenValue(body, '--board-tray-edge'))).toBe(true);
  });

  const DARK_STYLE_SELECTORS: ReadonlyArray<readonly [string, string]> = [
    ['classic', ':root[data-theme="dark"] [data-board-style="classic"] {'],
    ['aegean', ':root[data-theme="dark"][data-board-style="aegean"]'],
    ['bosphorus', ':root[data-theme="dark"][data-board-style="bosphorus"]'],
    ['marrakech', ':root[data-theme="dark"][data-board-style="marrakech"]'],
    ['kyoto', ':root[data-theme="dark"][data-board-style="kyoto"]'],
    ['reykjavik', ':root[data-theme="dark"][data-board-style="reykjavik"]'],
  ];

  for (const [id, selector] of DARK_STYLE_SELECTORS) {
    it(`gives ${id} a visible frame and tray edge in dark mode`, () => {
      const body = blockBody(stylesCss, selector);
      expect(isVisibleEdge(tokenValue(body, '--board-edge'))).toBe(true);
      expect(isVisibleEdge(tokenValue(body, '--board-tray-edge'))).toBe(true);
    });
  }
});

/**
 * Board styles (GLOSSARY "Board style"): selectable visual treatments of the
 * board and checkers, independent of the light/dark app theme. The registry
 * names the six styles; their palettes live in boardStyles.css as CSS custom
 * properties scoped to a `data-board-style` attribute on <html>, mirroring
 * the theme's `data-theme` mechanism, so every Board (Play, Puzzles, Analyze)
 * follows one style source. The default style removes the attribute entirely,
 * leaving the default rendering byte-identical to the unstyled board.
 *
 * Unlike the per-mount `useStoredSwitch` settings, the style is a shared
 * subscribable store: the picker and every mounted Board must agree the
 * instant it changes.
 */

import { useSyncExternalStore } from 'react';

export type BoardStyleId =
  | 'classic'
  | 'aegean'
  | 'bosphorus'
  | 'marrakech'
  | 'kyoto'
  | 'reykjavik';

export interface BoardStyle {
  readonly id: BoardStyleId;
  readonly name: string;
  /** One line of mood, shown with the picker. */
  readonly mood: string;
}

/** The six Board styles, the default first (issue 19). */
export const BOARD_STYLES: readonly BoardStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    mood: 'Paper, ink, and tournament green.',
  },
  {
    id: 'aegean',
    name: 'Aegean',
    mood: 'Whitewash and cobalt in bright coastal light.',
  },
  {
    id: 'bosphorus',
    name: 'Bosphorus',
    mood: 'Walnut, mother-of-pearl, and brass by coffee-light.',
  },
  {
    id: 'marrakech',
    name: 'Marrakech',
    mood: 'Terracotta, Majorelle blue, and saffron.',
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    mood: 'Charcoal lacquer and vermilion, in quiet precision.',
  },
  {
    id: 'reykjavik',
    name: 'Reykjavík',
    mood: 'Glacial blue, bone, and basalt stillness.',
  },
];

export const DEFAULT_BOARD_STYLE: BoardStyleId = 'classic';
export const BOARD_STYLE_KEY = 'pg-backgammon.board-style';

function isBoardStyleId(value: unknown): value is BoardStyleId {
  return BOARD_STYLES.some((style) => style.id === value);
}

/** The stored choice, or the default when unset or unrecognized. */
export function readStoredBoardStyle(): BoardStyleId {
  const stored = localStorage.getItem(BOARD_STYLE_KEY);
  return isBoardStyleId(stored) ? stored : DEFAULT_BOARD_STYLE;
}

/**
 * Stamp the choice on <html> for the scoped CSS token blocks. The default
 * style carries no attribute at all, so the default rendering stays exactly
 * the pre-styles rendering.
 */
function applyBoardStyle(id: BoardStyleId): void {
  if (id === DEFAULT_BOARD_STYLE) {
    document.documentElement.removeAttribute('data-board-style');
  } else {
    document.documentElement.setAttribute('data-board-style', id);
  }
}

let current: BoardStyleId = readStoredBoardStyle();
const listeners = new Set<() => void>();

// Apply the stored choice as soon as any board-rendering module loads, so a
// direct arrival on Puzzles or Analyze is styled before first paint.
applyBoardStyle(current);

export function getBoardStyle(): BoardStyleId {
  return current;
}

/** Persist and apply a style; every subscriber sees it instantly. */
export function setBoardStyle(id: BoardStyleId): void {
  localStorage.setItem(BOARD_STYLE_KEY, id);
  if (id === current) {
    return;
  }
  current = id;
  applyBoardStyle(id);
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeBoardStyle(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The selected Board style and its setter, persisted like the theme. */
export function useBoardStyle(): [BoardStyleId, (id: BoardStyleId) => void] {
  const style = useSyncExternalStore(subscribeBoardStyle, getBoardStyle);
  return [style, setBoardStyle];
}

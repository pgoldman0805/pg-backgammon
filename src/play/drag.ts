/**
 * Pointer interaction state machine for checkers: distinguishes a click
 * (select / toggle) from a drag (pick up and drop), and a rapid second click
 * on the same origin from a fresh click (the double-click shortcut), in board
 * coordinates. Pure so the whole click-vs-drag-vs-double-click policy is
 * unit-testable; the Board component feeds it pointer events and executes the
 * returned commands.
 */

import type { Point } from '../rules';

/** Pointer travel (board units) beyond which a press becomes a drag. */
export const DRAG_THRESHOLD = 8;

/** Press-to-press gap (ms) within which a repeat click is a double-click. */
export const DOUBLE_CLICK_MS = 400;

/** The trace a click leaves behind, so the next press can pair with it. */
interface ClickStamp {
  readonly from: Point | 'bar';
  /** When the click's press happened (event timestamp, ms). */
  readonly at: number;
}

export type DragState =
  | { readonly kind: 'idle'; readonly lastClick?: ClickStamp }
  | {
      readonly kind: 'pressed';
      readonly from: Point | 'bar';
      readonly startX: number;
      readonly startY: number;
      /** When the press happened (event timestamp, ms). */
      readonly at: number;
      /** True when this press pairs with the click just before it. */
      readonly second: boolean;
    }
  | {
      readonly kind: 'dragging';
      readonly from: Point | 'bar';
      readonly x: number;
      readonly y: number;
    };

export type DragEvent =
  | {
      readonly type: 'down';
      readonly from: Point | 'bar';
      x: number;
      y: number;
      /** Event timestamp (ms), for double-click pairing. */
      readonly at: number;
    }
  | { readonly type: 'move'; readonly x: number; readonly y: number }
  | { readonly type: 'up'; readonly x: number; readonly y: number }
  | { readonly type: 'cancel' };

/** What the UI should do after a transition. */
export type DragCommand =
  | { readonly kind: 'click'; readonly from: Point | 'bar' }
  | { readonly kind: 'dblclick'; readonly from: Point | 'bar' }
  | {
      readonly kind: 'drop';
      readonly from: Point | 'bar';
      readonly x: number;
      readonly y: number;
    };

export interface DragOutcome {
  readonly state: DragState;
  readonly command?: DragCommand;
}

const IDLE: DragState = { kind: 'idle' };

export function idleDrag(): DragState {
  return IDLE;
}

export function dragTransition(
  state: DragState,
  event: DragEvent,
): DragOutcome {
  switch (event.type) {
    case 'down': {
      const last = state.kind === 'idle' ? state.lastClick : undefined;
      return {
        state: {
          kind: 'pressed',
          from: event.from,
          startX: event.x,
          startY: event.y,
          at: event.at,
          second:
            last !== undefined &&
            last.from === event.from &&
            event.at - last.at <= DOUBLE_CLICK_MS,
        },
      };
    }
    case 'move':
      if (state.kind === 'pressed') {
        const travel = Math.hypot(
          event.x - state.startX,
          event.y - state.startY,
        );
        if (travel >= DRAG_THRESHOLD) {
          return {
            state: {
              kind: 'dragging',
              from: state.from,
              x: event.x,
              y: event.y,
            },
          };
        }
        return { state };
      }
      if (state.kind === 'dragging') {
        return { state: { ...state, x: event.x, y: event.y } };
      }
      return { state };
    case 'up':
      if (state.kind === 'pressed') {
        if (state.second) {
          // A double-click consumes its stamp: a third click starts over.
          return {
            state: IDLE,
            command: { kind: 'dblclick', from: state.from },
          };
        }
        return {
          state: {
            kind: 'idle',
            lastClick: { from: state.from, at: state.at },
          },
          command: { kind: 'click', from: state.from },
        };
      }
      if (state.kind === 'dragging') {
        return {
          state: IDLE,
          command: { kind: 'drop', from: state.from, x: event.x, y: event.y },
        };
      }
      return { state };
    case 'cancel':
      return { state: IDLE };
  }
}

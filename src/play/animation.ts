/**
 * The checker-animation speed setting (ticket 20): off / fast / normal /
 * slow, persisted like the theme. One choice drives two tempos so "fast"
 * feels fast end to end:
 *
 * - `travelMs`: how long a checker takes to glide between board coordinates
 *   (off 0 — repositions snap, the pre-ticket behavior).
 * - `stepMsFor`: the pause between the opponent's and autoplay's visible
 *   steps (normal keeps the historical 450ms; off keeps a minimal 160ms beat
 *   so a multi-movement play still reads as a sequence rather than a teleport).
 *
 * `prefers-reduced-motion` makes the *default* off; an explicit stored choice
 * always wins. Like the Board style, the value is a shared subscribable store:
 * the Settings page and every mounted Board agree the instant it changes.
 */

import { useSyncExternalStore } from 'react';

export type AnimationSpeed = 'off' | 'fast' | 'normal' | 'slow';

export const ANIMATION_SPEED_KEY = 'pg-backgammon.checker-speed';

export const ANIMATION_SPEEDS: readonly AnimationSpeed[] = [
  'off',
  'fast',
  'normal',
  'slow',
];

const TRAVEL_MS: Record<AnimationSpeed, number> = {
  off: 0,
  fast: 120,
  normal: 250,
  slow: 450,
};

const STEP_MS: Record<AnimationSpeed, number> = {
  off: 160,
  fast: 250,
  normal: 450,
  slow: 700,
};

/** How long one checker's travel between board coordinates takes. */
export function travelMs(speed: AnimationSpeed): number {
  return TRAVEL_MS[speed];
}

/** The opponent/autoplay pause between visible steps at this speed. */
export function stepMsFor(speed: AnimationSpeed): number {
  return STEP_MS[speed];
}

function isAnimationSpeed(value: unknown): value is AnimationSpeed {
  return ANIMATION_SPEEDS.some((speed) => speed === value);
}

/**
 * The stored choice; when unset, off under prefers-reduced-motion and normal
 * otherwise. Storing a value — any value — is an explicit choice and wins.
 */
export function readStoredAnimationSpeed(): AnimationSpeed {
  const stored = localStorage.getItem(ANIMATION_SPEED_KEY);
  if (isAnimationSpeed(stored)) {
    return stored;
  }
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduced ? 'off' : 'normal';
}

let current: AnimationSpeed = readStoredAnimationSpeed();
const listeners = new Set<() => void>();

export function getAnimationSpeed(): AnimationSpeed {
  return current;
}

/** Persist and apply a speed; every subscriber sees it instantly. */
export function setAnimationSpeed(speed: AnimationSpeed): void {
  localStorage.setItem(ANIMATION_SPEED_KEY, speed);
  if (speed === current) {
    return;
  }
  current = speed;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAnimationSpeed(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The selected speed and its setter, persisted like the theme. */
export function useAnimationSpeed(): [
  AnimationSpeed,
  (speed: AnimationSpeed) => void,
] {
  const speed = useSyncExternalStore(
    subscribeAnimationSpeed,
    getAnimationSpeed,
  );
  return [speed, setAnimationSpeed];
}

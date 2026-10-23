/**
 * The checker-animation speed setting (ticket 20): a persisted choice of
 * off / fast / normal / slow that drives both the checker travel duration
 * and the opponent/autoplay step pacing.
 */

import { act, renderHook } from '@testing-library/react';
import {
  ANIMATION_SPEED_KEY,
  getAnimationSpeed,
  readStoredAnimationSpeed,
  setAnimationSpeed,
  stepMsFor,
  travelMs,
  useAnimationSpeed,
} from './animation';

afterEach(() => {
  localStorage.removeItem(ANIMATION_SPEED_KEY);
  setAnimationSpeed(readStoredAnimationSpeed());
});

describe('speed → duration mapping', () => {
  it('maps each speed to its checker travel duration', () => {
    expect(travelMs('off')).toBe(0);
    expect(travelMs('fast')).toBe(120);
    expect(travelMs('normal')).toBe(250);
    expect(travelMs('slow')).toBe(450);
  });

  it('maps each speed to the opponent/autoplay step pacing', () => {
    // "normal" keeps the historical 450ms step; "off" keeps a minimal beat
    // so multi-movement plays still read as a sequence.
    expect(stepMsFor('off')).toBe(160);
    expect(stepMsFor('fast')).toBe(250);
    expect(stepMsFor('normal')).toBe(450);
    expect(stepMsFor('slow')).toBe(700);
  });

  it('paces steps no tighter than the travel they carry', () => {
    for (const speed of ['off', 'fast', 'normal', 'slow'] as const) {
      expect(stepMsFor(speed)).toBeGreaterThan(travelMs(speed));
    }
  });
});

describe('the stored choice', () => {
  it('defaults to off under prefers-reduced-motion (the jsdom default here)', () => {
    // src/test/setup.ts stamps reduced motion on every jsdom run, so tests
    // never animate unless they opt in — and this default is itself the
    // reduced-motion behavior under test.
    expect(readStoredAnimationSpeed()).toBe('off');
  });

  it('lets an explicit choice win over reduced motion', () => {
    localStorage.setItem(ANIMATION_SPEED_KEY, 'slow');
    expect(readStoredAnimationSpeed()).toBe('slow');
  });

  it('falls back to the default when the stored value is unrecognized', () => {
    localStorage.setItem(ANIMATION_SPEED_KEY, 'ludicrous');
    expect(readStoredAnimationSpeed()).toBe('off');
  });

  it('persists through setAnimationSpeed and reads back', () => {
    setAnimationSpeed('fast');
    expect(localStorage.getItem(ANIMATION_SPEED_KEY)).toBe('fast');
    expect(getAnimationSpeed()).toBe('fast');
    expect(readStoredAnimationSpeed()).toBe('fast');
  });
});

describe('useAnimationSpeed', () => {
  it('exposes the shared value and updates every subscriber on change', () => {
    const first = renderHook(() => useAnimationSpeed());
    const second = renderHook(() => useAnimationSpeed());
    expect(first.result.current[0]).toBe('off');

    act(() => {
      first.result.current[1]('normal');
    });

    expect(first.result.current[0]).toBe('normal');
    expect(second.result.current[0]).toBe('normal');
  });
});

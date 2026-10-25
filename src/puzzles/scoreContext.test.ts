import { describe, expect, it } from 'vitest';
import { scoreContextLabel } from './mining';

describe('scoreContextLabel', () => {
  it('labels a money position', () => {
    expect(
      scoreContextLabel({
        matchLength: 0,
        score: { white: 0, black: 0 },
        cube: { value: 1, owner: 'center' },
      }),
    ).toBe('Money play');
  });

  it('labels away-counts from the hero (White) perspective', () => {
    expect(
      scoreContextLabel({
        matchLength: 7,
        score: { white: 5, black: 5 },
        cube: { value: 1, owner: 'center' },
      }),
    ).toBe('2-away/2-away');
  });

  it('labels an uneven score', () => {
    expect(
      scoreContextLabel({
        matchLength: 7,
        score: { white: 5, black: 3 },
        cube: { value: 1, owner: 'center' },
      }),
    ).toBe('2-away/4-away');
  });

  it('labels double match point', () => {
    expect(
      scoreContextLabel({
        matchLength: 7,
        score: { white: 6, black: 6 },
        cube: { value: 1, owner: 'center' },
      }),
    ).toBe('double match point');
  });

  it('labels the Crawford game', () => {
    expect(
      scoreContextLabel({
        matchLength: 7,
        score: { white: 6, black: 3 },
        cube: { value: 1, owner: 'center' },
        crawford: true,
      }),
    ).toBe('Crawford game');
  });
});

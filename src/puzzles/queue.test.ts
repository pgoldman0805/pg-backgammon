/**
 * Progress and the retry queue (spec stories 36-37): a missed puzzle enters
 * a FIFO retry queue and resurfaces before new puzzles; per-theme
 * solved/missed/streak counters accumulate across answers.
 */

import { describe, expect, it } from 'vitest';
import {
  advanceRun,
  answerRun,
  drillOrder,
  emptyProgress,
  recordAnswer,
  startRun,
  themeProgress,
} from './queue';
import type { Puzzle, PuzzleTheme } from './types';

function puzzle(id: string, theme: PuzzleTheme = 'priming'): Puzzle {
  return {
    id,
    kind: 'cube',
    theme,
    source: 'curated',
    board: {
      points: [],
      bar: { white: 0, black: 0 },
      off: { white: 0, black: 0 },
    },
    hero: 'white',
    match: {
      matchLength: 0,
      score: { white: 0, black: 0 },
      cube: { value: 1, owner: 'center' },
    },
    decision: 'offer',
    choices: [{ action: 'double', equity: 1, equityLoss: 0 }],
    verdict: 'Double, take',
  };
}

describe('recordAnswer', () => {
  it('counts a solve: solved and streak rise, the id is remembered', () => {
    const p = puzzle('a');
    const progress = recordAnswer(emptyProgress(), p, true, 1000);
    expect(themeProgress(progress, 'priming')).toEqual({
      solved: 1,
      missed: 0,
      streak: 1,
    });
    expect(progress.solvedIds).toContain('a');
    expect(progress.updatedAt).toBe(1000);
  });

  it('counts a miss: missed rises, the streak resets, the id joins the retry queue', () => {
    let progress = recordAnswer(emptyProgress(), puzzle('a'), true, 1);
    progress = recordAnswer(progress, puzzle('b'), false, 2);
    expect(themeProgress(progress, 'priming')).toEqual({
      solved: 1,
      missed: 1,
      streak: 0,
    });
    expect(progress.retryQueue).toEqual(['b']);
  });

  it('keeps the retry queue FIFO without duplicates', () => {
    let progress = recordAnswer(emptyProgress(), puzzle('a'), false, 1);
    progress = recordAnswer(progress, puzzle('b'), false, 2);
    progress = recordAnswer(progress, puzzle('a'), false, 3);
    expect(progress.retryQueue).toEqual(['a', 'b']);
  });

  it('removes a puzzle from the retry queue once solved', () => {
    let progress = recordAnswer(emptyProgress(), puzzle('a'), false, 1);
    progress = recordAnswer(progress, puzzle('a'), true, 2);
    expect(progress.retryQueue).toEqual([]);
    expect(progress.solvedIds).toContain('a');
  });

  it('tracks themes independently', () => {
    let progress = recordAnswer(
      emptyProgress(),
      puzzle('a', 'priming'),
      true,
      1,
    );
    progress = recordAnswer(progress, puzzle('b', 'bear-off'), false, 2);
    expect(themeProgress(progress, 'priming').streak).toBe(1);
    expect(themeProgress(progress, 'bear-off')).toEqual({
      solved: 0,
      missed: 1,
      streak: 0,
    });
  });
});

describe('drillOrder', () => {
  const puzzles = [puzzle('a'), puzzle('b'), puzzle('c')];

  it('serves unseen puzzles in bundle order when nothing is queued', () => {
    expect(drillOrder(puzzles, emptyProgress()).map((p) => p.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('resurfaces retry-queue puzzles before new ones, oldest miss first', () => {
    let progress = recordAnswer(emptyProgress(), puzzle('b'), false, 1);
    progress = recordAnswer(progress, puzzle('c'), false, 2);
    expect(drillOrder(puzzles, progress).map((p) => p.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('places already-solved puzzles after unseen ones', () => {
    const progress = recordAnswer(emptyProgress(), puzzle('b'), true, 1);
    expect(drillOrder(puzzles, progress).map((p) => p.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('ignores retry-queue ids that are not in the given set', () => {
    const progress = recordAnswer(
      emptyProgress(),
      puzzle('z', 'bear-off'),
      false,
      1,
    );
    expect(drillOrder(puzzles, progress).map((p) => p.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('drill run (ticket 21: only the first attempt of a visit counts)', () => {
  const puzzles = [puzzle('a'), puzzle('b')];

  it('starts at the head of the drill order with nothing graded', () => {
    const run = startRun(puzzles, emptyProgress());
    expect(run.queue.map((p) => p.id)).toEqual(['a', 'b']);
    expect(run.index).toBe(0);
    expect(run.graded).toBe(false);
    expect(run.solved).toBe(0);
    expect(run.answered).toBe(0);
  });

  it('counts a correct first attempt and leaves the queue alone', () => {
    const run = answerRun(
      startRun(puzzles, emptyProgress()),
      puzzle('a'),
      true,
    );
    expect(run.graded).toBe(true);
    expect(run.solved).toBe(1);
    expect(run.answered).toBe(1);
    expect(run.queue.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('sends a missed first attempt to the end of this same run', () => {
    const run = answerRun(
      startRun(puzzles, emptyProgress()),
      puzzle('a'),
      false,
    );
    expect(run.solved).toBe(0);
    expect(run.answered).toBe(1);
    expect(run.queue.map((p) => p.id)).toEqual(['a', 'b', 'a']);
  });

  it('ignores retry attempts: once graded, the run no longer moves', () => {
    const first = answerRun(
      startRun(puzzles, emptyProgress()),
      puzzle('a'),
      false,
    );
    // Try again, then solve it: free practice — counters and queue hold.
    const retried = answerRun(first, puzzle('a'), true);
    expect(retried).toEqual(first);
  });

  it('advancing opens the next visit for grading again', () => {
    let run = answerRun(startRun(puzzles, emptyProgress()), puzzle('a'), true);
    run = advanceRun(run);
    expect(run.index).toBe(1);
    expect(run.graded).toBe(false);
    run = answerRun(run, puzzle('b'), false);
    expect(run.answered).toBe(2);
    expect(run.queue.map((p) => p.id)).toEqual(['a', 'b', 'b']);
  });
});

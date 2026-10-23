/**
 * Puzzle progress and the retry queue (spec stories 36-37). Pure reducers
 * over a plain serializable state: the storage layer persists exactly this
 * shape, and the backup carries it as-is.
 */

import type { Puzzle, PuzzleTheme } from './types';

export interface ThemeProgress {
  /** Correct answers given in this theme (attempts, not distinct puzzles). */
  readonly solved: number;
  /** Incorrect answers given in this theme. */
  readonly missed: number;
  /** Current run of consecutive correct answers in this theme. */
  readonly streak: number;
}

/** The whole persisted puzzle-progress state: one plain document. */
export interface PuzzleProgressState {
  readonly themes: Readonly<Partial<Record<PuzzleTheme, ThemeProgress>>>;
  /** Ids of puzzles answered correctly at least once. */
  readonly solvedIds: readonly string[];
  /** Ids of missed puzzles awaiting a correct retry, oldest miss first. */
  readonly retryQueue: readonly string[];
  /** Epoch milliseconds of the last answer. */
  readonly updatedAt: number;
}

const ZERO: ThemeProgress = { solved: 0, missed: 0, streak: 0 };

export function emptyProgress(): PuzzleProgressState {
  return { themes: {}, solvedIds: [], retryQueue: [], updatedAt: 0 };
}

/** A theme's counters, zeroed when the theme has never been drilled. */
export function themeProgress(
  progress: PuzzleProgressState,
  theme: PuzzleTheme,
): ThemeProgress {
  return progress.themes[theme] ?? ZERO;
}

/**
 * Fold one answer into the progress: counters move, a miss joins the retry
 * queue (once, FIFO), a solve leaves it.
 */
export function recordAnswer(
  progress: PuzzleProgressState,
  puzzle: Puzzle,
  correct: boolean,
  now: number,
): PuzzleProgressState {
  const current = themeProgress(progress, puzzle.theme);
  const theme: ThemeProgress = correct
    ? { ...current, solved: current.solved + 1, streak: current.streak + 1 }
    : { ...current, missed: current.missed + 1, streak: 0 };
  const retryQueue = correct
    ? progress.retryQueue.filter((id) => id !== puzzle.id)
    : progress.retryQueue.includes(puzzle.id)
      ? progress.retryQueue
      : [...progress.retryQueue, puzzle.id];
  const solvedIds =
    correct && !progress.solvedIds.includes(puzzle.id)
      ? [...progress.solvedIds, puzzle.id]
      : progress.solvedIds;
  return {
    themes: { ...progress.themes, [puzzle.theme]: theme },
    solvedIds,
    retryQueue,
    updatedAt: now,
  };
}

/**
 * The order a drill serves the given puzzles in: retry-queue members first
 * (oldest miss first), then unseen puzzles in bundle order, then
 * already-solved ones — so a drill never dead-ends.
 */
export function drillOrder(
  puzzles: readonly Puzzle[],
  progress: PuzzleProgressState,
): readonly Puzzle[] {
  const byId = new Map(puzzles.map((p) => [p.id, p]));
  const retry = progress.retryQueue
    .map((id) => byId.get(id))
    .filter((p): p is Puzzle => p !== undefined);
  const queued = new Set(progress.retryQueue);
  const solved = new Set(progress.solvedIds);
  const unseen = puzzles.filter((p) => !queued.has(p.id) && !solved.has(p.id));
  const done = puzzles.filter((p) => !queued.has(p.id) && solved.has(p.id));
  return [...retry, ...unseen, ...done];
}

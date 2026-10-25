/**
 * The Puzzles area (spec stories 30-37): browse themes, attempt a puzzle on
 * the board (plays) or with choice buttons (cube decisions), grade by the
 * stored equity data, reveal the full equity table, then move on — missed
 * puzzles resurface and per-theme progress persists.
 */

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, type Mock, vi } from 'vitest';
import type {
  GenerationStatus,
  PuzzleGenerationService,
} from '../puzzles/generationService';
import { boardKey } from '../puzzles/grade';
import { emptyProgress, recordAnswer } from '../puzzles/queue';
import type {
  CubePuzzle,
  PlayAnswer,
  PlayPuzzle,
  Puzzle,
} from '../puzzles/types';
import { applyMovement, createBoard, legalPlays } from '../rules';
import {
  createMemoryBlunderPuzzleStorage,
  createMemoryGeneratedPuzzleStorage,
  createMemoryPuzzleProgressStorage,
} from '../storage';
import { GLOSSARY } from '../ui/glossary';
import { Puzzles } from './Puzzles';

/** White bears off with 5-3: 5/off 3/off is best, 5/2 3/off a clear error. */
const bearOffBoard = createBoard({
  white: { points: { 5: 1, 3: 1 }, off: 13 },
  black: { points: { 24: 2 }, off: 13 },
});

/** Every legal play of the fixture position, graded by hand. */
function bearOffAnswers(): PlayAnswer[] {
  const plays = legalPlays(bearOffBoard, 'white', [5, 3]);
  const bestKey = boardKey(
    createBoard({
      white: { points: {}, off: 15 },
      black: { points: { 24: 2 }, off: 13 },
    }),
  );
  const seen = new Set<string>();
  const answers: PlayAnswer[] = [];
  for (const play of plays) {
    const final = play.movements.reduce(
      (b, m) => applyMovement(b, 'white', m),
      bearOffBoard,
    );
    const key = boardKey(final);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const best = key === bestKey;
    answers.push({
      rank: 0,
      moveText: best ? '5/off 3/off' : '5/2 3/off',
      movements: play.movements,
      finalKey: key,
      equity: best ? 1.92 : 1.78,
      equityLoss: best ? 0 : 0.14,
    });
  }
  answers.sort((a, b) => a.equityLoss - b.equityLoss);
  return answers.map((a, i) => ({ ...a, rank: i + 1 }));
}

const playPuzzle: PlayPuzzle = {
  id: 'play-1',
  kind: 'play',
  theme: 'bear-off',
  source: 'curated',
  board: bearOffBoard,
  hero: 'white',
  match: {
    matchLength: 0,
    score: { white: 0, black: 0 },
    cube: { value: 1, owner: 'center' },
  },
  roll: [5, 3],
  answers: bearOffAnswers(),
};

const cubePuzzle: CubePuzzle = {
  id: 'cube-1',
  kind: 'cube',
  theme: 'cube-handling',
  source: 'curated',
  board: bearOffBoard,
  hero: 'white',
  match: {
    matchLength: 0,
    score: { white: 0, black: 0 },
    cube: { value: 1, owner: 'center' },
  },
  decision: 'offer',
  choices: [
    { action: 'double', equity: 0.62, equityLoss: 0 },
    { action: 'no-double', equity: 0.55, equityLoss: 0.07 },
  ],
  verdict: 'Double, take',
};

const basePuzzles: Puzzle[] = [playPuzzle, cubePuzzle];

/** Mined blunder puzzles (ticket 12): same shapes, source 'blunder'. */
const blunderPlay: PlayPuzzle = {
  ...playPuzzle,
  id: 'blunder:m1:0:0',
  theme: 'priming',
  source: 'blunder',
  origin: { matchId: 'm1', game: 0, decision: 0 },
};

const blunderCube: CubePuzzle = {
  ...cubePuzzle,
  id: 'blunder:m1:0:1',
  source: 'blunder',
  origin: { matchId: 'm1', game: 0, decision: 1 },
};

async function makeBestPlay(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Move from point 5' }));
  await user.click(screen.getByRole('button', { name: 'Bear off' }));
  await user.click(screen.getByRole('button', { name: 'Move from point 3' }));
  await user.click(screen.getByRole('button', { name: 'Bear off' }));
  await user.click(screen.getByRole('button', { name: 'Submit play' }));
}

async function makeSecondBestPlay(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Move from point 5' }));
  await user.click(screen.getByRole('button', { name: 'Move to point 2' }));
  await user.click(screen.getByRole('button', { name: 'Move from point 3' }));
  await user.click(screen.getByRole('button', { name: 'Bear off' }));
  await user.click(screen.getByRole('button', { name: 'Submit play' }));
}

describe('browsing', () => {
  it('lists all five themes with their puzzle counts', async () => {
    render(<Puzzles puzzles={basePuzzles} />);
    expect(await screen.findByText('Priming')).toBeInTheDocument();
    expect(screen.getByText('Blitzing')).toBeInTheDocument();
    expect(screen.getByText('Holding game')).toBeInTheDocument();
    expect(screen.getByText('Bear-off')).toBeInTheDocument();
    expect(screen.getByText('Cube handling')).toBeInTheDocument();
    const bearOff = screen.getByText('Bear-off').closest('li');
    expect(bearOff).not.toBeNull();
    expect(
      within(bearOff as HTMLElement).getByText('1 puzzle'),
    ).toBeInTheDocument();
  });

  it('cannot drill a theme that has no puzzles yet', async () => {
    render(<Puzzles puzzles={basePuzzles} />);
    const priming = (await screen.findByText('Priming')).closest('li');
    expect(
      within(priming as HTMLElement).getByRole('button', { name: /drill/i }),
    ).toBeDisabled();
  });
});

describe('play puzzles', () => {
  it('grades the best play correct and reveals the equity table', async () => {
    const user = userEvent.setup();
    render(<Puzzles puzzles={basePuzzles} />);

    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    expect(screen.getByText(/white to play 5-3/i)).toBeInTheDocument();
    await makeBestPlay(user);

    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /equity/i });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + two candidates
    expect(within(rows[1]).getByText('5/off 3/off')).toBeInTheDocument();
    expect(within(rows[1]).getByText(/best/i)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/you/i)).toBeInTheDocument();
    expect(within(rows[2]).getByText('5/2 3/off')).toBeInTheDocument();
    expect(within(rows[2]).getByText('−0.140')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /next puzzle/i }),
    ).toBeInTheDocument();
  });

  it('explains the puzzle theme with an inline glossary tooltip (ticket 32)', async () => {
    const user = userEvent.setup();
    render(<Puzzles puzzles={basePuzzles} />);

    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    const caption = screen.getByText(/puzzle 1 of/i);
    const term = within(caption).getByRole('button', { name: 'Bear-off' });
    expect(term).toHaveAccessibleDescription(GLOSSARY['bear-off'].short);
  });

  it('supports undo while attempting', async () => {
    const user = userEvent.setup();
    render(<Puzzles puzzles={basePuzzles} />);
    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    await user.click(screen.getByRole('button', { name: 'Move from point 5' }));
    await user.click(screen.getByRole('button', { name: 'Move to point 2' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await makeBestPlay(user);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
  });

  it('grades a clear error as missed, marking the player row', async () => {
    const user = userEvent.setup();
    render(<Puzzles puzzles={basePuzzles} />);
    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    await makeSecondBestPlay(user);

    expect(screen.getByText(/missed/i)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /equity/i });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[2]).getByText(/you/i)).toBeInTheDocument();
  });

  it('serves a missed puzzle again before the drill ends', async () => {
    const user = userEvent.setup();
    render(<Puzzles puzzles={basePuzzles} />);
    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    await makeSecondBestPlay(user);
    await user.click(screen.getByRole('button', { name: /next puzzle/i }));

    // The only puzzle of the theme was missed, so it comes right back.
    expect(screen.getByText(/white to play 5-3/i)).toBeInTheDocument();
    await makeBestPlay(user);
    await user.click(screen.getByRole('button', { name: /next puzzle/i }));
    expect(screen.getByText(/drill complete/i)).toBeInTheDocument();
  });
});

describe('cube puzzles', () => {
  it('grades a cube decision from the choice buttons and reveals the table', async () => {
    const user = userEvent.setup();
    render(<Puzzles puzzles={basePuzzles} />);
    const cube = (await screen.findByText('Cube handling')).closest('li');
    await user.click(
      within(cube as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    expect(screen.getByText(/double, or roll/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /no double/i }));

    expect(screen.getByText(/missed/i)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /equity/i });
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Double')).toBeInTheDocument();
    expect(within(rows[1]).getByText(/best/i)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/you/i)).toBeInTheDocument();
    expect(screen.getByText(/double, take/i)).toBeInTheDocument();
  });
});

describe('blunder puzzles ("From your games", ticket 12)', () => {
  it('lists mined puzzles as their own collection, kept out of theme drills', async () => {
    const blunderStorage = createMemoryBlunderPuzzleStorage();
    await blunderStorage.putAll([blunderPlay, blunderCube]);
    render(
      <Puzzles
        puzzles={basePuzzles}
        blunderStorage={blunderStorage}
        mining={null}
      />,
    );

    const section = (await screen.findByText('From your games')).closest('li');
    expect(section).not.toBeNull();
    await within(section as HTMLElement).findByText('2 puzzles');
    // The mined priming play does not leak into the Priming theme drill.
    const priming = screen.getByText('Priming').closest('li');
    expect(
      within(priming as HTMLElement).getByRole('button', { name: /drill/i }),
    ).toBeDisabled();
  });

  it('drills the collection with a source badge and the usual grading', async () => {
    const user = userEvent.setup();
    const blunderStorage = createMemoryBlunderPuzzleStorage();
    await blunderStorage.putAll([blunderCube]);
    render(
      <Puzzles
        puzzles={basePuzzles}
        blunderStorage={blunderStorage}
        mining={null}
      />,
    );

    const section = (await screen.findByText('From your games')).closest('li');
    await within(section as HTMLElement).findByText('1 puzzle');
    await user.click(
      within(section as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    expect(screen.getByText(/double, or roll/i)).toBeInTheDocument();
    // The source badge marks the puzzle as mined from the player's games.
    expect(screen.getByText('From your games')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Double' }));
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /equity/i })).toBeInTheDocument();
  });

  it('shows the collection as empty-but-coming before anything is mined', async () => {
    render(
      <Puzzles
        puzzles={basePuzzles}
        blunderStorage={createMemoryBlunderPuzzleStorage()}
        mining={null}
      />,
    );
    const section = (await screen.findByText('From your games')).closest('li');
    expect(
      within(section as HTMLElement).getByRole('button', { name: /drill/i }),
    ).toBeDisabled();
  });

  it('refreshes the collection after the miner catches up', async () => {
    const blunderStorage = createMemoryBlunderPuzzleStorage();
    const mining = {
      catchUp: async () => {
        await blunderStorage.putAll([blunderCube]);
      },
    };
    render(
      <Puzzles
        puzzles={basePuzzles}
        blunderStorage={blunderStorage}
        mining={mining}
      />,
    );
    const section = (await screen.findByText('From your games')).closest('li');
    await within(section as HTMLElement).findByText('1 puzzle');
  });
});

/** A hand-driven stand-in for the shared generation service. */
function fakeGenerationService(): PuzzleGenerationService & {
  emit(next: Partial<GenerationStatus>): void;
  start: Mock<() => void>;
  cancel: Mock<() => void>;
} {
  let status: GenerationStatus = {
    running: false,
    cancelling: false,
    gamesPlayed: 0,
    keepersFound: 0,
    lastOutcome: null,
  };
  const listeners = new Set<() => void>();
  return {
    start: vi.fn<() => void>(),
    cancel: vi.fn<() => void>(),
    status: () => status,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    settled: () => Promise.resolve(),
    emit(next) {
      status = { ...status, ...next };
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

const readyEngine = {
  status: 'ready',
  onStatusChange: () => () => {},
} as const;

describe('generated puzzles ("Find new puzzles", ticket 18)', () => {
  const generatedPlay: PlayPuzzle = {
    ...playPuzzle,
    id: 'generated-42-1',
    theme: 'priming',
    source: 'generated',
  };

  it('counts generated puzzles inside their theme and drills them with a badge', async () => {
    const user = userEvent.setup();
    const generatedStorage = createMemoryGeneratedPuzzleStorage();
    await generatedStorage.putAll([generatedPlay]);
    render(
      <Puzzles
        puzzles={basePuzzles}
        generatedStorage={generatedStorage}
        generation={null}
        mining={null}
      />,
    );

    // Priming has no curated puzzle, but the generated one counts and drills.
    const priming = (await screen.findByText('Priming')).closest('li');
    await within(priming as HTMLElement).findByText('1 puzzle');
    await user.click(
      within(priming as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    expect(screen.getByText(/white to play 5-3/i)).toBeInTheDocument();
    expect(screen.getByText('Generated')).toBeInTheDocument();
    await makeBestPlay(user);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
  });

  it('starts a batch from the find-new-puzzles action and shows live progress', async () => {
    const user = userEvent.setup();
    const generation = fakeGenerationService();
    render(
      <Puzzles
        puzzles={basePuzzles}
        generatedStorage={createMemoryGeneratedPuzzleStorage()}
        generation={generation}
        engine={readyEngine}
        mining={null}
      />,
    );

    await user.click(
      await screen.findByRole('button', { name: /find new puzzles/i }),
    );
    expect(generation.start).toHaveBeenCalledTimes(1);

    act(() => {
      generation.emit({ running: true, gamesPlayed: 3, keepersFound: 2 });
    });
    expect(screen.getByText(/playing game 3/i)).toBeInTheDocument();
    expect(screen.getByText(/2 found/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /stop/i }));
    expect(generation.cancel).toHaveBeenCalledTimes(1);
  });

  it('refreshes the theme counts as a batch lands keepers', async () => {
    const generation = fakeGenerationService();
    const generatedStorage = createMemoryGeneratedPuzzleStorage();
    render(
      <Puzzles
        puzzles={basePuzzles}
        generatedStorage={generatedStorage}
        generation={generation}
        engine={readyEngine}
        mining={null}
      />,
    );
    const priming = (await screen.findByText('Priming')).closest('li');
    expect(
      within(priming as HTMLElement).getByText('0 puzzles'),
    ).toBeInTheDocument();

    await generatedStorage.putAll([generatedPlay]);
    act(() => {
      generation.emit({ running: true, gamesPlayed: 4, keepersFound: 1 });
    });

    await within(priming as HTMLElement).findByText('1 puzzle');
  });

  it('reports the finished batch', async () => {
    const generation = fakeGenerationService();
    render(
      <Puzzles
        puzzles={basePuzzles}
        generatedStorage={createMemoryGeneratedPuzzleStorage()}
        generation={generation}
        engine={readyEngine}
        mining={null}
      />,
    );
    await screen.findByRole('button', { name: /find new puzzles/i });

    act(() => {
      generation.emit({
        running: false,
        gamesPlayed: 12,
        keepersFound: 10,
        lastOutcome: { reason: 'target', keepers: 10, games: 12 },
      });
    });

    expect(screen.getByText(/found 10 new puzzles/i)).toBeInTheDocument();
  });

  it('notes the engine is still loading during a run', async () => {
    const generation = fakeGenerationService();
    render(
      <Puzzles
        puzzles={basePuzzles}
        generatedStorage={createMemoryGeneratedPuzzleStorage()}
        generation={generation}
        engine={{ status: 'loading', onStatusChange: () => () => {} }}
        mining={null}
      />,
    );
    await screen.findByRole('button', { name: /find new puzzles/i });

    act(() => {
      generation.emit({ running: true, gamesPlayed: 0, keepersFound: 0 });
    });

    expect(screen.getByText(/loading the engine/i)).toBeInTheDocument();
    expect(screen.queryByText(/playing game/i)).not.toBeInTheDocument();
  });
});

describe('try again (ticket 21: retries are free practice)', () => {
  it('resets a play puzzle after the reveal and re-reveals on resubmit', async () => {
    const user = userEvent.setup();
    render(<Puzzles puzzles={basePuzzles} />);
    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    await makeSecondBestPlay(user);
    expect(screen.getByText(/missed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    // The reveal is gone and the position is back to the start of the attempt.
    expect(
      screen.queryByRole('table', { name: /equity/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit play' })).toBeDisabled();
    expect(screen.getByText(/white to play 5-3/i)).toBeInTheDocument();

    // A retry attempt grades and reveals again.
    await makeBestPlay(user);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /equity/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it('never lets a retry touch progress, streaks, or the retry queue', async () => {
    const user = userEvent.setup();
    const storage = createMemoryPuzzleProgressStorage();
    render(<Puzzles puzzles={basePuzzles} storage={storage} />);
    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    // First attempt misses: the id joins the retry queue.
    await makeSecondBestPlay(user);
    expect((await storage.load())?.retryQueue).toEqual(['play-1']);

    // Try again and solve it: free practice — nothing persisted moves.
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await makeBestPlay(user);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    const persisted = await storage.load();
    expect(persisted?.retryQueue).toEqual(['play-1']);
    expect(persisted?.solvedIds).toEqual([]);
    expect(persisted?.themes['bear-off']).toEqual({
      solved: 0,
      missed: 1,
      streak: 0,
    });

    // The missed puzzle still returns at the end of this same drill, and
    // the run's score counts the first attempts only.
    await user.click(screen.getByRole('button', { name: /next puzzle/i }));
    expect(screen.getByText(/white to play 5-3/i)).toBeInTheDocument();
    await makeBestPlay(user);
    await user.click(screen.getByRole('button', { name: /next puzzle/i }));
    expect(screen.getByText(/drill complete/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 right this run/i)).toBeInTheDocument();
  });

  it('resets a cube puzzle: the choice buttons return and grade again', async () => {
    const user = userEvent.setup();
    const storage = createMemoryPuzzleProgressStorage();
    render(<Puzzles puzzles={basePuzzles} storage={storage} />);
    const cube = (await screen.findByText('Cube handling')).closest('li');
    await user.click(
      within(cube as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    await user.click(screen.getByRole('button', { name: 'Double' }));
    expect(screen.getByText(/correct/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(
      screen.queryByRole('table', { name: /equity/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /no double/i }));

    // The retry miss is revealed but the solve already counted stays intact.
    expect(screen.getByText(/missed/i)).toBeInTheDocument();
    const persisted = await storage.load();
    expect(persisted?.solvedIds).toEqual(['cube-1']);
    expect(persisted?.retryQueue).toEqual([]);
    expect(persisted?.themes['cube-handling']).toEqual({
      solved: 1,
      missed: 0,
      streak: 1,
    });
  });
});

describe('progress', () => {
  it('persists per-theme progress across a reload', async () => {
    const user = userEvent.setup();
    const storage = createMemoryPuzzleProgressStorage();
    const first = render(<Puzzles puzzles={basePuzzles} storage={storage} />);
    const cube = (await screen.findByText('Cube handling')).closest('li');
    await user.click(
      within(cube as HTMLElement).getByRole('button', { name: /drill/i }),
    );
    await user.click(screen.getByRole('button', { name: 'Double' }));
    expect(await screen.findByText(/correct/i)).toBeInTheDocument();
    first.unmount();

    render(<Puzzles puzzles={basePuzzles} storage={storage} />);
    const reloaded = (await screen.findByText('Cube handling')).closest('li');
    expect(
      within(reloaded as HTMLElement).getByText(/1 solved/i),
    ).toBeInTheDocument();
  });

  it('resurfaces retry-queue puzzles before new ones in a later session', async () => {
    const user = userEvent.setup();
    const storage = createMemoryPuzzleProgressStorage();
    const second: PlayPuzzle = { ...playPuzzle, id: 'play-2' };
    // A previous session missed play-2.
    await storage.save(recordAnswer(emptyProgress(), second, false, 1_000));

    render(
      <Puzzles puzzles={[playPuzzle, second, cubePuzzle]} storage={storage} />,
    );
    const bearOff = (await screen.findByText('Bear-off')).closest('li');
    await user.click(
      within(bearOff as HTMLElement).getByRole('button', { name: /drill/i }),
    );

    expect(screen.getByText(/retry/i)).toBeInTheDocument();
    await makeBestPlay(user);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect((await storage.load())?.retryQueue).toEqual([]);
  });
});

/**
 * The Puzzles area (spec stories 30-37): browse the curated set by theme,
 * attempt each puzzle on the board (plays) or with choice buttons (cube
 * decisions), get graded against the stored engine answers — within 0.02 of
 * best counts — and learn from the revealed equity table. Missed puzzles
 * join a retry queue that resurfaces before new ones; per-theme progress
 * persists in IndexedDB. Blunder puzzles mined from the player's own
 * analyzed games (ticket 12) appear as their own "From your games"
 * collection, badge-marked and drillable through the same player. No live
 * engine is needed anywhere on this page.
 */

import { useEffect, useMemo, useState } from 'react';
import type { EngineStatus } from '../engine';
import { Board } from '../play/Board';
import { getPlayEngine } from '../play/engineInstance';
import { canCommit, canUndo } from '../play/selectors';
import { BUNDLED_PUZZLES } from '../puzzles/bundledSet';
import { getPuzzleGenerationService } from '../puzzles/generationInstance';
import type {
  GenerationStatus,
  PuzzleGenerationService,
} from '../puzzles/generationService';
import {
  type CubeGrade,
  gradeCubeAttempt,
  gradePlayAttempt,
  type PlayGrade,
} from '../puzzles/grade';
import { getBlunderMiningService } from '../puzzles/miningInstance';
import {
  advanceRun,
  answerRun,
  type DrillRun,
  emptyProgress,
  type PuzzleProgressState,
  recordAnswer,
  startRun,
  themeProgress,
} from '../puzzles/queue';
import type {
  CubeAction,
  CubePuzzle,
  PlayPuzzle,
  Puzzle,
  PuzzleTheme,
} from '../puzzles/types';
import { PUZZLE_THEMES } from '../puzzles/types';
import {
  applyTurnMovement,
  createGame,
  type Die,
  type GameState,
  opponent,
  type Point,
  undoTurnMovement,
} from '../rules';
import {
  type BlunderPuzzleStorage,
  type GeneratedPuzzleStorage,
  getBlunderPuzzleStorage,
  getGeneratedPuzzleStorage,
  getPuzzleProgressStorage,
  type PuzzleProgressStorage,
} from '../storage';
import { lossText, playerName, signedEquityText } from '../ui/format';
import '../play/board.css';
import './puzzles.css';

const BLUNDER_COLLECTION_LABEL = 'From your games';

const THEME_TEXT: Record<PuzzleTheme, { label: string; blurb: string }> = {
  basics: {
    label: 'Basics',
    blurb: 'The fundamentals: make a point, hit and cover, run and bear off.',
  },
  priming: {
    label: 'Priming',
    blurb: 'Build a wall of points in front of enemy checkers.',
  },
  blitzing: {
    label: 'Blitzing',
    blurb: 'Attack an anchorless opponent while the bar holds them.',
  },
  'holding-game': {
    label: 'Holding game',
    blurb: 'Hold an anchor and play the waiting game from behind.',
  },
  'bear-off': {
    label: 'Bear-off',
    blurb: 'Bring them home and take them off without leaving a shot.',
  },
  'cube-handling': {
    label: 'Cube handling',
    blurb: 'Judge the double: offer, take, and pass at the right price.',
  },
};

const CUBE_LABEL: Record<CubeAction, string> = {
  double: 'Double',
  'no-double': 'No double — roll',
  take: 'Take',
  pass: 'Pass',
};

/** A static game shell so the Board renders an arbitrary position. */
function staticGame(puzzle: Puzzle): GameState {
  return {
    board: puzzle.board,
    turn: null,
    record: {
      initialBoard: puzzle.board,
      openingRolls: [],
      firstPlayer: puzzle.hero,
      plays: [],
    },
    result: null,
  };
}

function freshAttempt(puzzle: Puzzle): GameState {
  return puzzle.kind === 'play'
    ? createGame({
        board: puzzle.board,
        player: puzzle.hero,
        roll: puzzle.roll,
      })
    : staticGame(puzzle);
}

interface Outcome {
  readonly correct: boolean;
  /** The chosen and best rows, in presentation terms. */
  readonly chosenKey: string;
  readonly bestKey: string;
  readonly summary: string;
}

/** What a drill runs over: one theme's curated set, or the mined blunders. */
interface DrillCollection {
  readonly label: string;
  readonly puzzles: readonly Puzzle[];
}

/** One drill: a run through a collection's queue, as the UI names it. */
interface Drill {
  readonly collection: DrillCollection;
  /** Ids that were waiting in the retry queue when the drill began. */
  readonly retryIds: ReadonlySet<string>;
  /** The pure run state: queue, visit index, first-attempt counters. */
  readonly run: DrillRun;
}

function playSummary(grade: PlayGrade): string {
  if (!grade.correct) {
    return `Missed — the best was ${grade.best.moveText}. Your play gave up ${grade.chosen.equityLoss.toFixed(3)}.`;
  }
  return grade.chosen === grade.best
    ? `Correct — ${grade.best.moveText} is the best play.`
    : `Correct — ${grade.chosen.moveText} is within 0.02 of the best, ${grade.best.moveText}.`;
}

/** One line on how the last generation batch ended. */
function generationSummary(
  outcome: NonNullable<GenerationStatus['lastOutcome']>,
): string {
  const found = (n: number) => `${n} new puzzle${n === 1 ? '' : 's'}`;
  switch (outcome.reason) {
    case 'target':
    case 'games':
      return outcome.keepers === 0
        ? 'No new puzzles this run — nothing clear enough came up. Try again.'
        : `Found ${found(outcome.keepers)} in ${outcome.games} game${outcome.games === 1 ? '' : 's'}.`;
    case 'cancelled':
      return outcome.keepers > 0
        ? `Stopped — kept ${found(outcome.keepers)}.`
        : 'Stopped.';
    case 'error':
      return 'Generation failed — try again.';
  }
}

function cubeSummary(grade: CubeGrade): string {
  if (!grade.correct) {
    return `Missed — ${CUBE_LABEL[grade.best.action]} was right. Your choice gave up ${grade.chosen.equityLoss.toFixed(3)}.`;
  }
  return grade.chosen === grade.best
    ? `Correct — ${CUBE_LABEL[grade.best.action]} is right.`
    : `Correct — ${CUBE_LABEL[grade.chosen.action]} is within 0.02 of ${CUBE_LABEL[grade.best.action]}.`;
}

export interface PuzzlesProps {
  /** Injectable for tests; defaults to the full bundled set (Basics first). */
  puzzles?: readonly Puzzle[];
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: PuzzleProgressStorage;
  /** Injectable for tests; defaults to the shared blunder-puzzle storage. */
  blunderStorage?: BlunderPuzzleStorage;
  /** Injectable for tests; defaults to the shared generated-puzzle storage. */
  generatedStorage?: GeneratedPuzzleStorage;
  /** Injectable for tests; defaults to the shared miner. Null disables. */
  mining?: { catchUp(): Promise<void> } | null;
  /** Injectable for tests; defaults to the shared generator. Null disables. */
  generation?: PuzzleGenerationService | null;
  /** Injectable for tests; defaults to the shared play engine. Null hides. */
  engine?: {
    readonly status: EngineStatus;
    onStatusChange(listener: (status: EngineStatus) => void): () => void;
  } | null;
}

export function Puzzles({
  puzzles = BUNDLED_PUZZLES,
  storage: injectedStorage,
  blunderStorage: injectedBlunderStorage,
  generatedStorage: injectedGeneratedStorage,
  mining: injectedMining,
  generation: injectedGeneration,
  engine: injectedEngine,
}: PuzzlesProps = {}) {
  const [storage] = useState(
    () => injectedStorage ?? getPuzzleProgressStorage(),
  );
  const [blunderStorage] = useState(
    () => injectedBlunderStorage ?? getBlunderPuzzleStorage(),
  );
  const [generatedStorage] = useState(
    () => injectedGeneratedStorage ?? getGeneratedPuzzleStorage(),
  );
  const [mining] = useState(() =>
    injectedMining === undefined ? getBlunderMiningService() : injectedMining,
  );
  const [generation] = useState(() =>
    injectedGeneration === undefined
      ? getPuzzleGenerationService()
      : injectedGeneration,
  );
  const [engine] = useState(() =>
    injectedEngine === undefined ? getPlayEngine() : injectedEngine,
  );
  const [progress, setProgress] = useState<PuzzleProgressState | null>(null);
  const [blunderPuzzles, setBlunderPuzzles] = useState<readonly Puzzle[]>([]);
  const [generatedPuzzles, setGeneratedPuzzles] = useState<readonly Puzzle[]>(
    [],
  );
  const [genStatus, setGenStatus] = useState<GenerationStatus | null>(() =>
    generation ? generation.status() : null,
  );
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(
    () => engine?.status ?? 'idle',
  );
  const [drill, setDrill] = useState<Drill | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<Point | 'bar' | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let alive = true;
    storage
      .load()
      .then((loaded) => {
        if (alive) {
          setProgress(loaded ?? emptyProgress());
        }
      })
      .catch(() => {
        if (alive) {
          setProgress(emptyProgress());
        }
      });
    return () => {
      alive = false;
    };
  }, [storage]);

  // Mined blunder puzzles: show what is stored, then sweep for anything
  // analyzed-but-unmined (pre-existing history gains puzzles) and refresh.
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      blunderStorage
        .list()
        .then((list) => {
          if (alive) {
            setBlunderPuzzles((current) =>
              current.length === list.length &&
              current.every((puzzle, i) => puzzle.id === list[i].id)
                ? current
                : list,
            );
          }
        })
        .catch(() => {});
    void refresh();
    if (mining) {
      mining
        .catchUp()
        .then(refresh)
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [blunderStorage, mining]);

  // Generated puzzles: show what is stored, and track the shared generator's
  // status — refreshing the list as a running batch lands keepers, so theme
  // counts move while the engine mines in the background.
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      generatedStorage
        .list()
        .then((list) => {
          if (alive) {
            setGeneratedPuzzles((current) =>
              current.length === list.length &&
              current.every((puzzle, i) => puzzle.id === list[i].id)
                ? current
                : list,
            );
          }
        })
        .catch(() => {});
    void refresh();
    const unsubscribe = generation?.onChange(() => {
      if (alive) {
        setGenStatus(generation.status());
      }
      void refresh();
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [generatedStorage, generation]);

  // The engine's load state, so the generate action can say "loading" while
  // the WASM payload is still on its way.
  useEffect(() => {
    if (!engine) {
      return;
    }
    setEngineStatus(engine.status);
    return engine.onStatusChange(setEngineStatus);
  }, [engine]);

  const byTheme = useMemo(() => {
    const groups = new Map<PuzzleTheme, Puzzle[]>();
    for (const theme of PUZZLE_THEMES) {
      groups.set(theme, []);
    }
    for (const puzzle of puzzles) {
      groups.get(puzzle.theme)?.push(puzzle);
    }
    // Generated puzzles slot into their theme's drill beside the curated set.
    for (const puzzle of generatedPuzzles) {
      groups.get(puzzle.theme)?.push(puzzle);
    }
    return groups;
  }, [puzzles, generatedPuzzles]);

  const current: Puzzle | null = drill
    ? (drill.run.queue[drill.run.index] ?? null)
    : null;

  function startDrill(collection: DrillCollection): void {
    if (!progress) {
      return;
    }
    const run = startRun(collection.puzzles, progress);
    if (run.queue.length === 0) {
      return;
    }
    setDrill({
      collection,
      retryIds: new Set(progress.retryQueue),
      run,
    });
    setGame(freshAttempt(run.queue[0]));
    setSelected(null);
    setOutcome(null);
  }

  function themeCollection(theme: PuzzleTheme): DrillCollection {
    return {
      label: THEME_TEXT[theme].label,
      puzzles: byTheme.get(theme) ?? [],
    };
  }

  const blunderCollection: DrillCollection = {
    label: BLUNDER_COLLECTION_LABEL,
    puzzles: blunderPuzzles,
  };

  function leaveDrill(): void {
    setDrill(null);
    setGame(null);
    setOutcome(null);
    setSelected(null);
  }

  /**
   * Fold one answer into progress and the drill; failures never break play.
   * Only the visit's first attempt counts (ticket 21): retries after the
   * reveal grade and reveal again, but neither the persisted progress nor
   * the run moves.
   */
  function settle(
    puzzle: Puzzle,
    correct: boolean,
    outcomeNext: Outcome,
  ): void {
    if (!progress || !drill) {
      return;
    }
    if (!drill.run.graded) {
      const next = recordAnswer(progress, puzzle, correct, Date.now());
      setProgress(next);
      storage.save(next).catch(() => {});
    }
    setDrill({ ...drill, run: answerRun(drill.run, puzzle, correct) });
    setOutcome(outcomeNext);
  }

  function submitPlay(): void {
    if (current?.kind !== 'play' || !game) {
      return;
    }
    const grade = gradePlayAttempt(current, game.board);
    settle(current, grade.correct, {
      correct: grade.correct,
      chosenKey: grade.chosen.finalKey,
      bestKey: grade.best.finalKey,
      summary: playSummary(grade),
    });
  }

  function chooseCube(action: CubeAction): void {
    if (current?.kind !== 'cube') {
      return;
    }
    const grade = gradeCubeAttempt(current, action);
    settle(current, grade.correct, {
      correct: grade.correct,
      chosenKey: grade.chosen.action,
      bestKey: grade.best.action,
      summary: cubeSummary(grade),
    });
  }

  function nextPuzzle(): void {
    if (!drill) {
      return;
    }
    const run = advanceRun(drill.run);
    setDrill({ ...drill, run });
    const upcoming = run.queue[run.index] ?? null;
    setGame(upcoming ? freshAttempt(upcoming) : null);
    setSelected(null);
    setOutcome(null);
  }

  /** Another free attempt at the same puzzle (ticket 21): the position and
      question reset; the first attempt of this visit has already counted. */
  function tryAgain(): void {
    if (!current) {
      return;
    }
    setGame(freshAttempt(current));
    setSelected(null);
    setOutcome(null);
  }

  function onMove(from: Point | 'bar', die: Die): void {
    setGame((state) => (state ? applyTurnMovement(state, from, die) : state));
    setSelected(null);
  }

  function undo(): void {
    setGame((state) =>
      state && canUndo(state) ? undoTurnMovement(state) : state,
    );
    setSelected(null);
  }

  function reset(): void {
    if (current) {
      setGame(freshAttempt(current));
      setSelected(null);
    }
  }

  if (!progress) {
    return (
      <section className="puzzles-area">
        <h1>Puzzles</h1>
        <p className="puzzles-note">Loading puzzles…</p>
      </section>
    );
  }

  // ---- Browse view ----------------------------------------------------
  if (!drill) {
    const running = genStatus?.running ?? false;
    const generateStatus = !genStatus
      ? null
      : running && engineStatus !== 'ready'
        ? 'Loading the engine…'
        : running
          ? `Playing game ${genStatus.gamesPlayed}… ${genStatus.keepersFound} found` +
            (genStatus.cancelling ? ' · stopping' : '')
          : genStatus.lastOutcome
            ? generationSummary(genStatus.lastOutcome)
            : null;
    return (
      <section className="puzzles-area">
        <h1>Puzzles</h1>
        <p className="puzzles-note">
          One position, one question. Answer on the board; the full equity table
          appears after you commit, so every puzzle teaches.
        </p>
        <ul className="theme-ledger">
          {PUZZLE_THEMES.map((theme) => {
            const set = byTheme.get(theme) ?? [];
            const counters = themeProgress(progress, theme);
            const attempted = counters.solved + counters.missed > 0;
            return (
              <li key={theme} className="theme-row">
                <div className="theme-text">
                  <span className="theme-name">{THEME_TEXT[theme].label}</span>
                  <span className="theme-blurb">{THEME_TEXT[theme].blurb}</span>
                </div>
                <div className="theme-meta">
                  <span className="theme-count">
                    {set.length === 1 ? '1 puzzle' : `${set.length} puzzles`}
                  </span>
                  {attempted && (
                    <span className="theme-score">
                      {counters.solved} solved · {counters.missed} missed
                      {counters.streak > 1 && (
                        <span className="theme-streak">
                          streak {counters.streak}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="play-button play-button--primary"
                  aria-label={`Drill ${THEME_TEXT[theme].label}`}
                  disabled={set.length === 0}
                  onClick={() => startDrill(themeCollection(theme))}
                >
                  Drill
                </button>
              </li>
            );
          })}
        </ul>
        {generation && (
          <div className="generate-strip">
            <div className="theme-text">
              <span className="theme-name">Find new puzzles</span>
              <span className="theme-blurb">
                The engine plays itself in the background and keeps positions
                worth drilling. New puzzles join their themes above.
              </span>
            </div>
            {generateStatus && (
              <span className="generate-status" role="status">
                {generateStatus}
              </span>
            )}
            {running ? (
              <button
                type="button"
                className="play-button play-button--quiet"
                disabled={genStatus?.cancelling}
                onClick={() => generation.cancel()}
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="play-button play-button--primary"
                onClick={() => {
                  generation.start();
                  setGenStatus(generation.status());
                }}
              >
                Find new puzzles
              </button>
            )}
          </div>
        )}
        <ul className="theme-ledger">
          <li className="theme-row theme-row--blunder">
            <div className="theme-text">
              <span className="theme-name">{BLUNDER_COLLECTION_LABEL}</span>
              <span className="theme-blurb">
                {blunderPuzzles.length === 0
                  ? 'Blunders from your analyzed matches will appear here — finish a game and drill exactly what went wrong.'
                  : 'Positions you blundered in your own analyzed matches.'}
              </span>
            </div>
            <div className="theme-meta">
              <span className="theme-count">
                {blunderPuzzles.length === 1
                  ? '1 puzzle'
                  : `${blunderPuzzles.length} puzzles`}
              </span>
            </div>
            <button
              type="button"
              className="play-button play-button--primary"
              aria-label={`Drill ${BLUNDER_COLLECTION_LABEL}`}
              disabled={blunderPuzzles.length === 0}
              onClick={() => startDrill(blunderCollection)}
            >
              Drill
            </button>
          </li>
        </ul>
      </section>
    );
  }

  // ---- Drill complete -------------------------------------------------
  if (!current) {
    return (
      <section className="puzzles-area">
        <h1>Puzzles</h1>
        <div className="drill-complete">
          <p className="drill-complete-title">Drill complete</p>
          <p className="puzzles-note">
            {drill.collection.label}: {drill.run.solved} of {drill.run.answered}{' '}
            right this run.
          </p>
          <div className="puzzle-controls">
            <button
              type="button"
              className="play-button play-button--primary"
              onClick={() => startDrill(drill.collection)}
            >
              Go again
            </button>
            <button
              type="button"
              className="play-button play-button--quiet"
              onClick={leaveDrill}
            >
              All themes
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---- Attempt / reveal -----------------------------------------------
  const isPlay = current.kind === 'play';
  const prompt = isPlay
    ? `${playerName(current.hero)} to play ${(current as PlayPuzzle).roll[0]}-${(current as PlayPuzzle).roll[1]}.`
    : (current as CubePuzzle).decision === 'offer'
      ? `${playerName(current.hero)} on roll. Double, or roll?`
      : `${playerName(opponent(current.hero))} doubles to ${current.match.cube.value * 2}. Take or pass?`;
  const servedFromRetry = drill.retryIds.has(current.id);
  const answered = outcome !== null;

  // The post-answer reveal: a panel beside the board at desktop width
  // (ticket 21), below it at the narrow breakpoint. The verdict and the
  // controls stay in reach; the long equity tables scroll inside the panel.
  const reveal = answered && (
    <aside className="puzzle-reveal" aria-label="Answer reveal">
      <p
        className={`puzzle-verdict ${outcome.correct ? 'puzzle-verdict--correct' : 'puzzle-verdict--missed'}`}
        role="status"
      >
        {outcome.summary}
      </p>
      {!isPlay && (
        <p className="puzzles-note">
          Engine verdict: {(current as CubePuzzle).verdict}.
        </p>
      )}
      <div className="puzzle-controls">
        <button
          type="button"
          className="play-button play-button--primary"
          onClick={nextPuzzle}
        >
          Next puzzle
        </button>
        <button type="button" className="play-button" onClick={tryAgain}>
          Try again
        </button>
        <button
          type="button"
          className="play-button play-button--quiet"
          onClick={leaveDrill}
        >
          All themes
        </button>
        <span className="retry-free-note">
          Retries don't count toward progress.
        </span>
      </div>
      <div className="equity-scroll">
        <table className="equity-table" aria-label="Equity table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{isPlay ? 'Play' : 'Action'}</th>
              <th scope="col">Equity</th>
              <th scope="col">Loss</th>
              <th scope="col">
                <span className="visually-hidden">Markers</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isPlay
              ? (current as PlayPuzzle).answers.map((answer) => {
                  const you = answer.finalKey === outcome.chosenKey;
                  const bestRow = answer.finalKey === outcome.bestKey;
                  return (
                    <tr
                      key={answer.finalKey}
                      className={
                        you && !outcome.correct ? 'equity-row--missed' : ''
                      }
                    >
                      <td>{answer.rank}</td>
                      <td className="equity-move">{answer.moveText}</td>
                      <td className="equity-number">
                        {signedEquityText(answer.equity)}
                      </td>
                      <td className="equity-number">
                        {lossText(answer.equityLoss)}
                      </td>
                      <td className="equity-markers">
                        {bestRow && <span className="marker-best">Best</span>}
                        {you && <span className="marker-you">You</span>}
                      </td>
                    </tr>
                  );
                })
              : (current as CubePuzzle).choices.map((choice, index) => {
                  const you = choice.action === outcome.chosenKey;
                  const bestRow = choice.action === outcome.bestKey;
                  return (
                    <tr
                      key={choice.action}
                      className={
                        you && !outcome.correct ? 'equity-row--missed' : ''
                      }
                    >
                      <td>{index + 1}</td>
                      <td className="equity-move">
                        {CUBE_LABEL[choice.action]}
                      </td>
                      <td className="equity-number">
                        {signedEquityText(choice.equity)}
                      </td>
                      <td className="equity-number">
                        {lossText(choice.equityLoss)}
                      </td>
                      <td className="equity-markers">
                        {bestRow && <span className="marker-best">Best</span>}
                        {you && <span className="marker-you">You</span>}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </aside>
  );

  return (
    <section className="puzzles-area">
      <h1>Puzzles</h1>
      <div className="puzzle-drill">
        <div className="puzzle-hud">
          <p className="puzzle-prompt" role="status">
            {prompt}
            {current.source === 'blunder' && (
              <span className="source-badge">{BLUNDER_COLLECTION_LABEL}</span>
            )}
            {current.source === 'generated' && (
              <span className="source-badge">Generated</span>
            )}
            {servedFromRetry && <span className="retry-chip">Retry</span>}
          </p>
          <p className="puzzle-caption">
            {THEME_TEXT[current.theme].label} · puzzle {drill.run.index + 1} of{' '}
            {drill.run.queue.length}
          </p>
        </div>
        <div className="puzzle-layout">
          <div className="puzzle-main">
            <div className="puzzle-board">
              <Board
                game={game}
                selected={selected}
                onSelect={setSelected}
                onMove={onMove}
                cube={{
                  value: current.match.cube.value,
                  owner: current.match.cube.owner,
                }}
                interactive={isPlay && !answered}
              />
            </div>
            {!answered && isPlay && (
              <div className="puzzle-controls">
                <button
                  type="button"
                  className="play-button"
                  disabled={!canUndo(game)}
                  onClick={undo}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="play-button"
                  disabled={!canUndo(game)}
                  onClick={reset}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="play-button play-button--primary"
                  disabled={!canCommit(game)}
                  onClick={submitPlay}
                >
                  Submit play
                </button>
                <button
                  type="button"
                  className="play-button play-button--quiet"
                  onClick={leaveDrill}
                >
                  All themes
                </button>
              </div>
            )}
            {!answered && !isPlay && (
              <div className="puzzle-controls">
                {((current as CubePuzzle).decision === 'offer'
                  ? (['double', 'no-double'] as const)
                  : (['take', 'pass'] as const)
                ).map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="play-button play-button--primary"
                    onClick={() => chooseCube(action)}
                  >
                    {CUBE_LABEL[action]}
                  </button>
                ))}
                <button
                  type="button"
                  className="play-button play-button--quiet"
                  onClick={leaveDrill}
                >
                  All themes
                </button>
              </div>
            )}
          </div>
          {reveal}
        </div>
      </div>
    </section>
  );
}

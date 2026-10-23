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
import { Board } from '../play/Board';
import { canCommit, canUndo } from '../play/selectors';
import { CURATED_PUZZLES } from '../puzzles/curatedSet';
import {
  type CubeGrade,
  gradeCubeAttempt,
  gradePlayAttempt,
  type PlayGrade,
} from '../puzzles/grade';
import { getBlunderMiningService } from '../puzzles/miningInstance';
import {
  drillOrder,
  emptyProgress,
  type PuzzleProgressState,
  recordAnswer,
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
  type Player,
  type Point,
  undoTurnMovement,
} from '../rules';
import {
  type BlunderPuzzleStorage,
  getBlunderPuzzleStorage,
  getPuzzleProgressStorage,
  type PuzzleProgressStorage,
} from '../storage';
import '../play/board.css';
import './puzzles.css';

const BLUNDER_COLLECTION_LABEL = 'From your games';

const THEME_TEXT: Record<PuzzleTheme, { label: string; blurb: string }> = {
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

function name(player: Player): string {
  return player === 'white' ? 'White' : 'Black';
}

function signedEquity(equity: number): string {
  return `${equity < 0 ? '−' : '+'}${Math.abs(equity).toFixed(3)}`;
}

function lossText(loss: number): string {
  return loss === 0 ? '—' : `−${loss.toFixed(3)}`;
}

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

interface Session {
  readonly collection: DrillCollection;
  readonly queue: readonly Puzzle[];
  readonly index: number;
  /** Ids that were waiting in the retry queue when the drill began. */
  readonly retryIds: ReadonlySet<string>;
  readonly solvedThisRun: number;
  readonly answeredThisRun: number;
}

function playSummary(grade: PlayGrade): string {
  if (!grade.correct) {
    return `Missed — the best was ${grade.best.moveText}. Your play gave up ${grade.chosen.equityLoss.toFixed(3)}.`;
  }
  return grade.chosen === grade.best
    ? `Correct — ${grade.best.moveText} is the best play.`
    : `Correct — ${grade.chosen.moveText} is within 0.02 of the best, ${grade.best.moveText}.`;
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
  /** Injectable for tests; defaults to the bundled curated set. */
  puzzles?: readonly Puzzle[];
  /** Injectable for tests; defaults to the shared IndexedDB storage. */
  storage?: PuzzleProgressStorage;
  /** Injectable for tests; defaults to the shared blunder-puzzle storage. */
  blunderStorage?: BlunderPuzzleStorage;
  /** Injectable for tests; defaults to the shared miner. Null disables. */
  mining?: { catchUp(): Promise<void> } | null;
}

export function Puzzles({
  puzzles = CURATED_PUZZLES,
  storage: injectedStorage,
  blunderStorage: injectedBlunderStorage,
  mining: injectedMining,
}: PuzzlesProps = {}) {
  const [storage] = useState(
    () => injectedStorage ?? getPuzzleProgressStorage(),
  );
  const [blunderStorage] = useState(
    () => injectedBlunderStorage ?? getBlunderPuzzleStorage(),
  );
  const [mining] = useState(() =>
    injectedMining === undefined ? getBlunderMiningService() : injectedMining,
  );
  const [progress, setProgress] = useState<PuzzleProgressState | null>(null);
  const [blunderPuzzles, setBlunderPuzzles] = useState<readonly Puzzle[]>([]);
  const [session, setSession] = useState<Session | null>(null);
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

  const byTheme = useMemo(() => {
    const groups = new Map<PuzzleTheme, Puzzle[]>();
    for (const theme of PUZZLE_THEMES) {
      groups.set(theme, []);
    }
    for (const puzzle of puzzles) {
      groups.get(puzzle.theme)?.push(puzzle);
    }
    return groups;
  }, [puzzles]);

  const current: Puzzle | null = session
    ? (session.queue[session.index] ?? null)
    : null;

  function startDrill(collection: DrillCollection): void {
    if (!progress) {
      return;
    }
    const queue = drillOrder(collection.puzzles, progress);
    if (queue.length === 0) {
      return;
    }
    setSession({
      collection,
      queue,
      index: 0,
      retryIds: new Set(progress.retryQueue),
      solvedThisRun: 0,
      answeredThisRun: 0,
    });
    setGame(freshAttempt(queue[0]));
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
    setSession(null);
    setGame(null);
    setOutcome(null);
    setSelected(null);
  }

  /** Fold one answer into progress and the session; failures never break play. */
  function settle(
    puzzle: Puzzle,
    correct: boolean,
    outcomeNext: Outcome,
  ): void {
    if (!progress || !session) {
      return;
    }
    const next = recordAnswer(progress, puzzle, correct, Date.now());
    setProgress(next);
    storage.save(next).catch(() => {});
    setSession({
      ...session,
      // A miss returns at the end of this same drill.
      queue: correct ? session.queue : [...session.queue, puzzle],
      solvedThisRun: session.solvedThisRun + (correct ? 1 : 0),
      answeredThisRun: session.answeredThisRun + 1,
    });
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
    if (!session) {
      return;
    }
    const index = session.index + 1;
    setSession({ ...session, index });
    const upcoming = session.queue[index] ?? null;
    setGame(upcoming ? freshAttempt(upcoming) : null);
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
  if (!session) {
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
            {session.collection.label}: {session.solvedThisRun} of{' '}
            {session.answeredThisRun} right this run.
          </p>
          <div className="puzzle-controls">
            <button
              type="button"
              className="play-button play-button--primary"
              onClick={() => startDrill(session.collection)}
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
    ? `${name(current.hero)} to play ${(current as PlayPuzzle).roll[0]}-${(current as PlayPuzzle).roll[1]}.`
    : (current as CubePuzzle).decision === 'offer'
      ? `${name(current.hero)} on roll. Double, or roll?`
      : `${name(current.hero === 'white' ? 'black' : 'white')} doubles to ${current.match.cube.value * 2}. Take or pass?`;
  const servedFromRetry = session.retryIds.has(current.id);
  const answered = outcome !== null;

  const equityTable = answered && (
    <div className="equity-reveal">
      <p
        className={`puzzle-verdict ${outcome.correct ? 'puzzle-verdict--correct' : 'puzzle-verdict--missed'}`}
        role="status"
      >
        {outcome.summary}
      </p>
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
                      {signedEquity(answer.equity)}
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
                    <td className="equity-move">{CUBE_LABEL[choice.action]}</td>
                    <td className="equity-number">
                      {signedEquity(choice.equity)}
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
        <button
          type="button"
          className="play-button play-button--quiet"
          onClick={leaveDrill}
        >
          All themes
        </button>
      </div>
    </div>
  );

  return (
    <section className="puzzles-area">
      <h1>Puzzles</h1>
      <div className="puzzle-hud">
        <p className="puzzle-prompt" role="status">
          {prompt}
          {current.source === 'blunder' && (
            <span className="source-badge">{BLUNDER_COLLECTION_LABEL}</span>
          )}
          {servedFromRetry && <span className="retry-chip">Retry</span>}
        </p>
        <p className="puzzle-caption">
          {THEME_TEXT[current.theme].label} · puzzle {session.index + 1} of{' '}
          {session.queue.length}
        </p>
      </div>
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
      {equityTable}
    </section>
  );
}

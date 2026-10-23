/**
 * The Tutor controller (GLOSSARY "Tutor mode", "Live analysis"): watches the
 * same PlayStore the human plays through and supplies the live-analysis
 * surfaces — the eval bar, on-demand hints, and post-play feedback — while
 * stamping the game in progress as tutor-assisted. Every engine query runs at
 * full strength (no difficulty weakening), whatever the opponent plays at.
 *
 * Feedback classification is the analyzer's own code path
 * (src/engine/analysis.ts), never a reimplementation.
 */

import {
  classifyEquityLoss,
  type ErrorClassification,
  equityLoss,
} from '../engine';
import type { Engine } from '../engine/types';
import type { BoardState, MatchState, Play, Player } from '../rules';
import { applyMovement } from '../rules';
import { matchContext } from './opponent';
import { forcedPlay, isDance } from './selectors';
import type { PlayStore } from './store';

export interface TutorEvaluation {
  /** The tutored player's probability of winning the game, 0-1. */
  readonly winProbability: number;
  /** Cubeless EMG equity from the tutored player's perspective. */
  readonly equity: number;
}

/** The engine's best play for the current roll (GLOSSARY "Hint"). */
export interface TutorHint {
  readonly moveText: string;
  readonly play: Play;
}

/**
 * The score of the player's last committed play (GLOSSARY "Post-play
 * feedback"), classified through the analyzer's shared primitives.
 */
export interface TutorFeedback {
  /** EMG equity given up versus the engine's best play (>= 0). */
  readonly equityLoss: number;
  readonly classification: ErrorClassification;
  /** The engine's best play for the same position and roll. */
  readonly bestMoveText: string;
}

export interface TutorState {
  readonly evaluation: TutorEvaluation | null;
  readonly hint: TutorHint | null;
  /** True while a requested hint is being computed. */
  readonly hintPending: boolean;
  readonly feedback: TutorFeedback | null;
}

export interface TutorOptions {
  readonly store: PlayStore;
  readonly engine: Engine;
  /** The side being tutored (the human in a vs-computer match). */
  readonly player: Player;
}

export interface Tutor {
  getState(): TutorState;
  subscribe(listener: () => void): () => void;
  /**
   * Reveal the engine's best play for the current roll (GLOSSARY "Hint").
   * Ignored outside the tutored player's turn.
   */
  requestHint(): void;
  /** Stop watching the store and discard any in-flight analysis. */
  dispose(): void;
}

const LIVE_PHASES: ReadonlyArray<MatchState['phase']> = [
  'pre-roll',
  'turn',
  'cube-offered',
  'resign-offered',
];

/** The player whose roll (made or pending) the current phase belongs to. */
function onRoll(match: MatchState): Player | null {
  return match.phase === 'turn'
    ? (match.game.turn?.player ?? null)
    : match.toRoll;
}

/** Identity key for a position; serialization only, no rules knowledge. */
function boardKey(board: BoardState): string {
  return `${board.points.join(',')}|${board.bar.white},${board.bar.black}|${board.off.white},${board.off.black}`;
}

/** Which committed play a piece of feedback describes. */
interface FeedbackAnchor {
  /** The game, identified by its immutable initial board. */
  readonly game: BoardState;
  /** The number of plays on record once the described play was committed. */
  readonly plays: number;
}

export function createTutor(options: TutorOptions): Tutor {
  const { store, engine, player } = options;

  let state: TutorState = {
    evaluation: null,
    hint: null,
    hintPending: false,
    feedback: null,
  };
  const listeners = new Set<() => void>();
  let disposed = false;

  /** The plays record the last evaluation was computed for. */
  let evaluatedPlays: MatchState['game']['record']['plays'] | null = null;
  let evalInFlight = false;
  let evalQueued: MatchState | null = null;
  /** The turn the current hint (or hint request) belongs to, by start board. */
  let hintAnchor: MatchState['game']['board'] | null = null;
  /** The previous store state, for spotting freshly committed plays. */
  let lastMatch: MatchState | null = store.getState().match;
  /** The play the current (or in-flight) feedback describes. */
  let feedbackAnchor: FeedbackAnchor | null = null;

  function setState(next: TutorState): void {
    if (disposed) {
      return;
    }
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  /**
   * Evaluate the committed position for the eval bar, normalized to the
   * tutored player. Single-flight: updates arriving mid-evaluation coalesce
   * into one trailing evaluation of the latest position.
   */
  function evaluate(match: MatchState): void {
    if (evalInFlight) {
      evalQueued = match;
      return;
    }
    const viewpoint = onRoll(match);
    if (!viewpoint) {
      return;
    }
    evalInFlight = true;
    engine
      .evaluate({
        board: match.game.board,
        onRoll: viewpoint,
        match: matchContext(match),
      })
      .then((evaluation) => {
        if (disposed) {
          return;
        }
        const ours = viewpoint === player;
        setState({
          ...state,
          evaluation: {
            winProbability: ours
              ? evaluation.chances.win
              : evaluation.chances.lose,
            equity: ours ? evaluation.equity : -evaluation.equity,
          },
        });
      })
      .catch(() => {})
      .finally(() => {
        evalInFlight = false;
        const queued = evalQueued;
        evalQueued = null;
        if (queued && !disposed) {
          evaluate(queued);
        }
      });
  }

  /**
   * Score the play the tutored player just committed against the engine's
   * best for the same position and roll (GLOSSARY "Post-play feedback").
   * `before` is the state the play was made from.
   */
  function analyzePlay(
    before: MatchState,
    play: Play,
    anchor: FeedbackAnchor,
  ): void {
    const turn = before.game.turn;
    if (!turn) {
      return;
    }
    const finalOf = (movements: Play['movements']): string =>
      boardKey(
        movements.reduce(
          (board, movement) => applyMovement(board, player, movement),
          turn.startBoard,
        ),
      );
    engine
      // Full strength: no difficulty, ever (GLOSSARY "Live analysis").
      .rankPlays(
        {
          board: turn.startBoard,
          onRoll: player,
          match: matchContext(before),
        },
        turn.roll,
      )
      .then((ranked) => {
        if (disposed || feedbackAnchor !== anchor || ranked.length === 0) {
          return;
        }
        const finalKey = finalOf(play.movements);
        const chosen = ranked.find(
          (entry) => finalOf(entry.play.movements) === finalKey,
        );
        if (!chosen) {
          return;
        }
        // The analyzer's own primitives do the scoring — same numbers, same
        // thresholds as the post-game review.
        const loss = equityLoss(ranked[0].equity, chosen.equity);
        setState({
          ...state,
          feedback: {
            equityLoss: loss,
            classification: classifyEquityLoss(loss),
            bestMoveText: ranked[0].moveText,
          },
        });
      })
      .catch(() => {});
  }

  function onChange(): void {
    if (disposed) {
      return;
    }
    const match = store.getState().match;
    const prev = lastMatch;
    lastMatch = match;
    if (!match) {
      return;
    }
    // Stamp the game in progress; the dispatch re-enters this listener with
    // the marked state, which does the rest of the work.
    if (!match.tutorAssisted && LIVE_PHASES.includes(match.phase)) {
      store.dispatch({ type: 'tutor-assisted' });
      return;
    }
    // A hint belongs to one turn: it clears when that turn is gone.
    if (hintAnchor !== null && match.game.turn?.startBoard !== hintAnchor) {
      hintAnchor = null;
      setState({ ...state, hint: null, hintPending: false });
    }
    // Feedback describes one committed play: it clears when a takeback or a
    // new game removes that play from the record.
    if (
      feedbackAnchor !== null &&
      (match.game.record.initialBoard !== feedbackAnchor.game ||
        match.game.record.plays.length < feedbackAnchor.plays)
    ) {
      feedbackAnchor = null;
      setState({ ...state, feedback: null });
    }
    // The tutored player committed a play: score it — unless the play was
    // forced (GLOSSARY "Error": forced plays are excluded).
    const plays = match.game.record.plays;
    if (
      prev?.phase === 'turn' &&
      prev.game.turn?.player === player &&
      prev.game.record.initialBoard === match.game.record.initialBoard &&
      plays.length === prev.game.record.plays.length + 1
    ) {
      if (isDance(prev.game) || forcedPlay(prev.game)) {
        feedbackAnchor = null;
        if (state.feedback) {
          setState({ ...state, feedback: null });
        }
      } else {
        const anchor: FeedbackAnchor = {
          game: match.game.record.initialBoard,
          plays: plays.length,
        };
        feedbackAnchor = anchor;
        analyzePlay(prev, plays[plays.length - 1], anchor);
      }
    }
    // The eval bar follows committed plays: a new plays record (a commit, a
    // takeback, a new game) re-evaluates the position.
    if (plays !== evaluatedPlays) {
      evaluatedPlays = plays;
      evaluate(match);
    }
  }

  const unsubscribe = store.subscribe(onChange);
  onChange();

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    requestHint() {
      if (disposed) {
        return;
      }
      const match = store.getState().match;
      const turn = match?.game.turn;
      if (
        !match ||
        !turn ||
        match.phase !== 'turn' ||
        turn.player !== player ||
        hintAnchor === turn.startBoard
      ) {
        return;
      }
      const anchor = turn.startBoard;
      hintAnchor = anchor;
      setState({ ...state, hint: null, hintPending: true });
      engine
        // Full strength: no difficulty, ever (GLOSSARY "Live analysis").
        .rankPlays(
          { board: anchor, onRoll: player, match: matchContext(match) },
          turn.roll,
        )
        .then((ranked) => {
          if (disposed || hintAnchor !== anchor) {
            return;
          }
          const best = ranked[0] ?? null;
          setState({
            ...state,
            hint: best ? { moveText: best.moveText, play: best.play } : null,
            hintPending: false,
          });
        })
        .catch(() => {
          if (disposed || hintAnchor !== anchor) {
            return;
          }
          // A failed request leaves the button armed for another try.
          hintAnchor = null;
          setState({ ...state, hint: null, hintPending: false });
        });
    },
    dispose() {
      disposed = true;
      unsubscribe();
      listeners.clear();
    },
  };
}

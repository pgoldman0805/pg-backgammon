/**
 * The pure, synchronous backgammon rules engine (ADR-0002).
 *
 * No React, worker, or storage imports: everything here is plain TypeScript
 * operating on immutable values, verifiable entirely through tests.
 */

export {
  applyMovement,
  type BoardSpec,
  createBoard,
  initialBoard,
  isRace,
  type PlayerPlacement,
  pipCount,
  undoMovement,
} from './board';
export { createCryptoDice, createSeededDice, type DiceSource } from './dice';
export {
  applyTurnMovement,
  type CreateGameOptions,
  commitPlay,
  commitPlayOnly,
  createGame,
  type GameState,
  gameResult,
  rewindToTurn,
  startGame,
  startNextTurn,
  type TurnState,
  undoTurnMovement,
} from './game';
export {
  acceptResignation,
  type CreateMatchOptions,
  type CubeState,
  canDouble,
  canTakeback,
  commitMatchPlay,
  createMatch,
  declineResignation,
  type MatchGameEnd,
  type MatchGameRecord,
  type MatchGameReplay,
  type MatchGameResult,
  type MatchPhase,
  type MatchRecord,
  type MatchReplay,
  type MatchScore,
  type MatchState,
  markTutorAssisted,
  matchMovement,
  nextGame,
  offerDouble,
  offerResignation,
  passDouble,
  type RecordedDecision,
  replayMatch,
  replayMatchGame,
  rollTurn,
  startMatch,
  startMoneyGame,
  takebackPlay,
  takeDouble,
  undoMatchMovement,
} from './match';
export { computeMovement, legalMovements, legalPlays } from './plays';
export { type ReplayOutcome, replayGame } from './replay';
export type {
  BoardState,
  CheckerMovement,
  DiceRoll,
  Die,
  GameEndKind,
  GameRecord,
  GameResult,
  Play,
  Player,
  Point,
} from './types';
export { opponent } from './types';

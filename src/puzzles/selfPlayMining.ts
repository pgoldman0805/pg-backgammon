/**
 * The self-play puzzle mining core (tickets 11 and 18): the engine self-plays
 * money games at a cheap screening strength, every decision point is screened
 * for a clear-but-tempting margin, promising positions are confirmed at full
 * strength, and keepers are theme-tagged by the heuristics in ./mining. The
 * offline curated miner (scripts/minePuzzles.ts) and the in-app "Find new
 * puzzles" generator both drive exactly this pipeline — the only differences
 * are the engine adapter (sync WASM session vs the analyzer's background-
 * priority gate), the stop target (per-theme set vs a keeper batch) and the
 * knobs the caller passes. Positions come only from self-play — nothing is
 * copied from books or other published sources.
 *
 * Engine-interface-driven and dependency-free: no node APIs, no DOM, so the
 * same module runs in the browser, the node script, and plain unit tests.
 */

import type { CubeAnalysis, EnginePosition, RankedPlay } from '../engine/types';
import type { BoardState, DiceRoll, GameState, Player } from '../rules';
import {
  applyMovement,
  applyTurnMovement,
  commitPlayOnly,
  createSeededDice,
  pipCount,
  startGame,
  startNextTurn,
} from '../rules';
import { cubeContentKey, playContentKey, puzzleContentKey } from './contentKey';
import { boardKey } from './grade';
import {
  classifyPlayTheme,
  deriveCubeChoices,
  mirrorBoard,
  mirrorMovement,
} from './mining';
import type {
  CubePuzzle,
  PlayAnswer,
  PlayPuzzle,
  Puzzle,
  PuzzleMatchContext,
  PuzzleSource,
  PuzzleTheme,
} from './types';
import { MINEABLE_THEMES } from './types';

/**
 * The engine seam the miner drives. The node script adapts the synchronous
 * gnubg session; the in-app generator adapts the shared analyzer so every
 * call passes the priority gate at background priority.
 */
export interface SelfPlayMiningEngine {
  /** Cheap self-play/screening ranking (clean 0-ply via difficulty expert). */
  screenPlays(
    position: EnginePosition,
    roll: DiceRoll,
  ): Promise<readonly RankedPlay[]>;
  /** Full-strength (2-ply) ranking the stored answers are built from. */
  rankPlays(
    position: EnginePosition,
    roll: DiceRoll,
  ): Promise<readonly RankedPlay[]>;
  /**
   * Deeper (3-ply, bounded — no rollouts) ranking used only as an agreement
   * gate: a kept play puzzle's 2-ply best must still be best at 3-ply, so the
   * stored answer cannot be a 2-ply artifact that flips at greater depth.
   */
  deepRankPlays(
    position: EnginePosition,
    roll: DiceRoll,
  ): Promise<readonly RankedPlay[]>;
  /** Full cube analysis for the on-roll player. */
  cubeInfo(position: EnginePosition): Promise<CubeAnalysis>;
}

/**
 * The quality bars a keeper must clear. The defaults are the values the
 * curated set was mined with; scripts/minePuzzles.ts passes its own knobs
 * explicitly so retuning the script never silently drifts the app.
 */
export interface SelfPlayQuality {
  /** Screening window for the second-best play's loss at screen strength. */
  readonly screenMin: number;
  readonly screenMax: number;
  /** Full-strength window: a clear best with tempting alternatives. */
  readonly marginMin: number;
  readonly marginMax: number;
  /** Minimum distinct candidate plays for a play puzzle. */
  readonly minCandidates: number;
  /** Cube decisions: both sides' errors must be real but not absurd. */
  readonly cubeMarginMin: number;
  readonly cubeMarginMax: number;
}

export const SELF_PLAY_QUALITY: SelfPlayQuality = {
  screenMin: 0.02,
  screenMax: 0.6,
  marginMin: 0.05,
  marginMax: 0.3,
  minCandidates: 4,
  cubeMarginMin: 0.05,
  cubeMarginMax: 0.45,
};

/** Diversity caps within one mining run. */
export interface SelfPlayDiversity {
  /** Per game, at most this many puzzles of one theme. */
  readonly perGameThemeCap: number;
  /** At most this many cube puzzles of one flavor (verdict class). */
  readonly cubeBucketCap: number;
}

export const SELF_PLAY_DIVERSITY: SelfPlayDiversity = {
  perGameThemeCap: 1,
  cubeBucketCap: 2,
};

/**
 * When to stop: a per-theme set size (the curated miner fills every theme) or
 * a total keeper count (the in-app batch). Exactly one must be given.
 */
export type SelfPlayMiningTarget =
  | { readonly perTheme: number; readonly keepers?: undefined }
  | { readonly keepers: number; readonly perTheme?: undefined };

export interface SelfPlayMiningProgress {
  /** Games started so far (1-based while a game is running). */
  readonly games: number;
  /** Keepers accepted so far. */
  readonly keepers: number;
}

export interface SelfPlayMiningStats {
  readonly games: number;
  readonly playScreened: number;
  readonly playConfirmed: number;
  /** Play candidates dropped because their 2-ply best flipped at 3-ply. */
  readonly playDeepRejected: number;
  readonly cubeEvaluated: number;
  readonly cubeAccepted: number;
}

export interface SelfPlayMiningOptions {
  readonly engine: SelfPlayMiningEngine;
  /** Stamped on every keeper ('curated' offline, 'generated' in-app). */
  readonly source: PuzzleSource;
  /** Seeds the self-play dice: same seed + same engine = same run. */
  readonly seed: number;
  readonly target: SelfPlayMiningTarget;
  /** Self-play budget: the run always stops after this many games. */
  readonly maxGames: number;
  readonly maxTurnsPerGame?: number;
  readonly quality?: Partial<SelfPlayQuality>;
  readonly diversity?: Partial<SelfPlayDiversity>;
  /**
   * Content keys (./contentKey) of every already-stored puzzle; positions
   * that would duplicate one are skipped before the expensive confirmation.
   */
  readonly existingContentKeys?: Iterable<string>;
  /** Observed after every game starts and every keeper lands. */
  readonly onProgress?: (progress: SelfPlayMiningProgress) => void;
  /** Each accepted keeper, in discovery order (ids are left 'pending'). */
  readonly onPuzzle?: (puzzle: Puzzle) => void;
  /** Checked between engine calls; true stops the run with what it has. */
  readonly shouldStop?: () => boolean;
}

export interface SelfPlayMiningResult {
  /** Keepers in discovery order, ids 'pending' — the caller names them. */
  readonly puzzles: readonly Puzzle[];
  readonly stats: SelfPlayMiningStats;
}

const DEFAULT_MAX_TURNS = 180;

/** Every mined position is a money-play question (ticket 11's model). */
const MONEY: PuzzleMatchContext = {
  matchLength: 0,
  score: { white: 0, black: 0 },
  cube: { value: 1, owner: 'center' },
};

const other = (player: Player): Player =>
  player === 'white' ? 'black' : 'white';

/** Orient a position so the hero (the decision maker) is White. */
function asWhite(board: BoardState, hero: Player): BoardState {
  return hero === 'white' ? board : mirrorBoard(board);
}

/** Content key of a ranked play's resulting board, in the given orientation. */
function playFinalKey(
  board: BoardState,
  player: Player,
  ranked: RankedPlay,
): string {
  return boardKey(
    ranked.play.movements.reduce((b, m) => applyMovement(b, player, m), board),
  );
}

/** Build a play puzzle from a full-strength ranking, mirrored to White. */
function buildPlayPuzzle(
  board: BoardState,
  hero: Player,
  roll: DiceRoll,
  theme: PuzzleTheme,
  ranked: readonly RankedPlay[],
  source: PuzzleSource,
): PlayPuzzle {
  const whiteBoard = asWhite(board, hero);
  const answers: PlayAnswer[] = ranked.map((entry) => {
    const movements =
      hero === 'white'
        ? [...entry.play.movements]
        : entry.play.movements.map(mirrorMovement);
    const final = movements.reduce(
      (b, m) => applyMovement(b, 'white', m),
      whiteBoard,
    );
    return {
      rank: entry.rank,
      moveText: entry.moveText,
      movements,
      finalKey: boardKey(final),
      equity: entry.equity,
      equityLoss: entry.equityLoss,
    };
  });
  return {
    id: 'pending',
    kind: 'play',
    theme,
    source,
    board: whiteBoard,
    hero: 'white',
    match: MONEY,
    roll,
    answers,
  };
}

/** The mutable state of one mining run. */
interface Run {
  readonly options: SelfPlayMiningOptions;
  readonly quality: SelfPlayQuality;
  readonly diversity: SelfPlayDiversity;
  readonly byTheme: Map<PuzzleTheme, number>;
  readonly cubeBuckets: Map<string, number>;
  readonly puzzles: Puzzle[];
  /** Screen-time dedupe of positions already considered this run. */
  readonly seenPlays: Set<string>;
  readonly seenCubes: Set<string>;
  /** Content keys of stored puzzles plus this run's keepers. */
  readonly seenContent: Set<string>;
  readonly stats: {
    games: number;
    playScreened: number;
    playConfirmed: number;
    playDeepRejected: number;
    cubeEvaluated: number;
    cubeAccepted: number;
  };
}

function wants(run: Run, theme: PuzzleTheme): boolean {
  const { target } = run.options;
  if (target.perTheme !== undefined) {
    return (run.byTheme.get(theme) ?? 0) < target.perTheme;
  }
  return run.puzzles.length < target.keepers;
}

function done(run: Run): boolean {
  const { target } = run.options;
  if (target.perTheme !== undefined) {
    return MINEABLE_THEMES.every((theme) => !wants(run, theme));
  }
  return run.puzzles.length >= target.keepers;
}

function stopped(run: Run): boolean {
  return run.options.shouldStop?.() ?? false;
}

/** Per-game diversity: at most `perGameThemeCap` keepers of one theme. */
function takeFromGame(
  run: Run,
  quota: Map<PuzzleTheme, number>,
  theme: PuzzleTheme,
): boolean {
  const used = quota.get(theme) ?? 0;
  if (used >= run.diversity.perGameThemeCap) {
    return false;
  }
  quota.set(theme, used + 1);
  return true;
}

function accept(run: Run, puzzle: Puzzle, bucket?: string): void {
  run.byTheme.set(puzzle.theme, (run.byTheme.get(puzzle.theme) ?? 0) + 1);
  if (bucket) {
    run.cubeBuckets.set(bucket, (run.cubeBuckets.get(bucket) ?? 0) + 1);
  }
  run.seenContent.add(puzzleContentKey(puzzle));
  run.puzzles.push(puzzle);
  run.options.onPuzzle?.(puzzle);
  run.options.onProgress?.({
    games: run.stats.games,
    keepers: run.puzzles.length,
  });
}

/** One decision point considered during self-play. */
async function considerPlay(
  run: Run,
  quota: Map<PuzzleTheme, number>,
  board: BoardState,
  player: Player,
  roll: DiceRoll,
  screened: readonly RankedPlay[],
): Promise<void> {
  const { quality } = run;
  if (screened.length < quality.minCandidates) {
    return;
  }
  const screenMargin = screened[1]?.equityLoss ?? 0;
  if (screenMargin < quality.screenMin || screenMargin > quality.screenMax) {
    return;
  }
  const whiteBoard = asWhite(board, player);
  const theme = classifyPlayTheme(whiteBoard);
  if (!theme || !wants(run, theme)) {
    return;
  }
  if ((quota.get(theme) ?? 0) >= run.diversity.perGameThemeCap) {
    return;
  }
  const key = `${boardKey(whiteBoard)}#${[...roll].sort().join('')}`;
  if (run.seenPlays.has(key)) {
    return;
  }
  run.seenPlays.add(key);
  // An already-stored puzzle poses this exact question: skip before paying
  // for the full-strength confirmation.
  if (
    run.seenContent.has(
      playContentKey(whiteBoard, 'white', MONEY.cube.value, roll),
    )
  ) {
    return;
  }

  run.stats.playScreened++;
  // Confirm at full strength: the stored answers are always 2-ply truth.
  const full = await run.options.engine.rankPlays(
    { board, onRoll: player },
    roll,
  );
  if (full.length < quality.minCandidates) {
    return;
  }
  const margin = full[1].equityLoss;
  if (margin < quality.marginMin || margin > quality.marginMax) {
    return;
  }
  // Agreement gate: the 2-ply best must still be best at a deeper (3-ply)
  // check, so a kept puzzle's top play cannot flip at greater depth (2-ply is
  // an evaluation, not a rollout).
  const deep = await run.options.engine.deepRankPlays(
    { board, onRoll: player },
    roll,
  );
  if (deep.length === 0) {
    return;
  }
  const topKey = playFinalKey(board, player, full[0]);
  const deepTopKey = playFinalKey(board, player, deep[0]);
  if (topKey !== deepTopKey) {
    run.stats.playDeepRejected++;
    return;
  }
  if (!takeFromGame(run, quota, theme)) {
    return;
  }
  run.stats.playConfirmed++;
  accept(
    run,
    buildPlayPuzzle(board, player, roll, theme, full, run.options.source),
  );
}

/** A pre-roll moment: maybe a cube question for either side. */
async function considerCube(
  run: Run,
  quota: Map<PuzzleTheme, number>,
  board: BoardState,
  toRoll: Player,
  turnIndex: number,
): Promise<void> {
  const { quality } = run;
  if (!wants(run, 'cube-handling') || turnIndex < 6) {
    return;
  }
  if ((quota.get('cube-handling') ?? 0) >= run.diversity.perGameThemeCap) {
    return;
  }
  // Cheap screen: cube questions get interesting once the roller leads.
  const lead = pipCount(board, other(toRoll)) - pipCount(board, toRoll);
  if (lead < 8) {
    return;
  }
  const key = `${boardKey(asWhite(board, toRoll))}#cube`;
  if (run.seenCubes.has(key)) {
    return;
  }
  run.seenCubes.add(key);
  // Both flavors this moment could pose already exist? Skip the engine call.
  const offerKey = cubeContentKey(
    'offer',
    asWhite(board, toRoll),
    'white',
    MONEY.cube.value,
  );
  const responseKey = cubeContentKey(
    'response',
    asWhite(board, other(toRoll)),
    'white',
    MONEY.cube.value,
  );
  if (run.seenContent.has(offerKey) && run.seenContent.has(responseKey)) {
    return;
  }

  run.stats.cubeEvaluated++;
  let analysis: CubeAnalysis;
  try {
    analysis = await run.options.engine.cubeInfo({ board, onRoll: toRoll });
  } catch {
    return;
  }
  const verdict = analysis.properAction;
  const saysDouble = /^(re)?double/i.test(verdict);
  const saysNoDouble = /^(no (re)?double|too good)/i.test(verdict);

  /** The responder's question: take, or pass? */
  const tryResponse = (): boolean => {
    if (!saysDouble || run.seenContent.has(responseKey)) {
      return false;
    }
    const response = deriveCubeChoices(analysis, 'response');
    const margin = response.choices[1]?.equityLoss ?? 0;
    const consistent =
      (response.choices[0].action === 'take' && /take/i.test(verdict)) ||
      (response.choices[0].action === 'pass' && /pass/i.test(verdict));
    const bucket = `response-${response.choices[0].action}`;
    if (
      !consistent ||
      margin < quality.cubeMarginMin ||
      margin > quality.cubeMarginMax ||
      (run.cubeBuckets.get(bucket) ?? 0) >= run.diversity.cubeBucketCap ||
      !takeFromGame(run, quota, 'cube-handling')
    ) {
      return false;
    }
    run.stats.cubeAccepted++;
    accept(
      run,
      {
        id: 'pending',
        kind: 'cube',
        theme: 'cube-handling',
        source: run.options.source,
        // The hero responds; the doubler (on roll) becomes Black.
        board: asWhite(board, other(toRoll)),
        hero: 'white',
        match: MONEY,
        decision: 'response',
        choices: response.choices,
        verdict,
      } satisfies CubePuzzle,
      bucket,
    );
    return true;
  };

  /** The doubler's question: double, or roll? */
  const tryOffer = (): boolean => {
    if (run.seenContent.has(offerKey)) {
      return false;
    }
    const offer = deriveCubeChoices(analysis, 'offer');
    const margin = offer.choices[1]?.equityLoss ?? 0;
    const consistent =
      (offer.choices[0].action === 'double' && saysDouble) ||
      (offer.choices[0].action === 'no-double' && saysNoDouble);
    const bucket = /too good/i.test(verdict)
      ? 'offer-too-good'
      : `offer-${offer.choices[0].action}`;
    if (
      !consistent ||
      margin < quality.cubeMarginMin ||
      margin > quality.cubeMarginMax ||
      (run.cubeBuckets.get(bucket) ?? 0) >= run.diversity.cubeBucketCap ||
      !takeFromGame(run, quota, 'cube-handling')
    ) {
      return false;
    }
    run.stats.cubeAccepted++;
    accept(
      run,
      {
        id: 'pending',
        kind: 'cube',
        theme: 'cube-handling',
        source: run.options.source,
        board: asWhite(board, toRoll),
        hero: 'white',
        match: MONEY,
        decision: 'offer',
        choices: offer.choices,
        verdict,
      } satisfies CubePuzzle,
      bucket,
    );
    return true;
  };

  // A double-worthy position answers both questions; serve whichever flavor
  // the set still lacks, preferring a missing "you should double" drill.
  const offerDoubleCount = run.cubeBuckets.get('offer-double') ?? 0;
  if (saysDouble && offerDoubleCount === 0) {
    tryOffer() || tryResponse();
  } else {
    tryResponse() || tryOffer();
  }
}

/** Self-play one money game at screen strength, harvesting candidates. */
async function playOneGame(
  run: Run,
  dice: { rollDie(): 1 | 2 | 3 | 4 | 5 | 6 },
): Promise<void> {
  const maxTurns = run.options.maxTurnsPerGame ?? DEFAULT_MAX_TURNS;
  const quota = new Map<PuzzleTheme, number>();
  let state: GameState = startGame(dice);
  for (let turn = 0; turn < maxTurns; turn++) {
    const current = state.turn;
    if (!current || done(run) || stopped(run)) {
      break;
    }
    let screened: readonly RankedPlay[] = [];
    try {
      screened = await run.options.engine.screenPlays(
        { board: state.board, onRoll: current.player },
        current.roll,
      );
    } catch {
      return; // an unexpected engine rejection ends this game quietly
    }

    await considerPlay(
      run,
      quota,
      state.board,
      current.player,
      current.roll,
      screened,
    );

    if (screened.length > 0) {
      for (const movement of screened[0].play.movements) {
        state = applyTurnMovement(state, movement.from, movement.die);
      }
    }
    state = commitPlayOnly(state);
    if (state.result) {
      return;
    }
    if (done(run) || stopped(run)) {
      return;
    }

    const toRoll = other(current.player);
    await considerCube(run, quota, state.board, toRoll, turn);
    state = startNextTurn(state, [dice.rollDie(), dice.rollDie()]);
  }
}

/**
 * Run the pipeline to its target (or budget, or cancellation). Deterministic
 * for a fixed seed and a deterministic engine.
 */
export async function mineSelfPlayPuzzles(
  options: SelfPlayMiningOptions,
): Promise<SelfPlayMiningResult> {
  const run: Run = {
    options,
    quality: { ...SELF_PLAY_QUALITY, ...options.quality },
    diversity: { ...SELF_PLAY_DIVERSITY, ...options.diversity },
    byTheme: new Map(),
    cubeBuckets: new Map(),
    puzzles: [],
    seenPlays: new Set(),
    seenCubes: new Set(),
    seenContent: new Set(options.existingContentKeys ?? []),
    stats: {
      games: 0,
      playScreened: 0,
      playConfirmed: 0,
      playDeepRejected: 0,
      cubeEvaluated: 0,
      cubeAccepted: 0,
    },
  };
  const dice = createSeededDice(options.seed);

  for (
    let game = 0;
    game < options.maxGames && !done(run) && !stopped(run);
    game++
  ) {
    run.stats.games++;
    options.onProgress?.({
      games: run.stats.games,
      keepers: run.puzzles.length,
    });
    await playOneGame(run, dice);
  }

  return { puzzles: run.puzzles, stats: { ...run.stats } };
}

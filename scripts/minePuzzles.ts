/**
 * Curated-puzzle mining (ticket 11): the real gnubg WASM engine self-plays
 * money games at clean 0-ply, every decision point is screened cheaply, and
 * promising positions are confirmed at full strength (2-ply). A position
 * becomes a puzzle when it has a clear best answer (second-best loses at
 * least MARGIN_MIN) yet plausible-looking alternatives (second-best within
 * MARGIN_MAX, several distinct candidates). Themes are tagged by the
 * heuristics in src/puzzles/mining.ts. Positions come only from self-play —
 * nothing is copied from books or other published sources.
 *
 * Output: src/puzzles/curatedSet.ts (regenerated in place).
 * Run with: npm run mine:puzzles
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGnubgSession } from '../src/engine/node/loadGnubg';
import type { GnubgSession } from '../src/engine/session';
import type { RankedPlay } from '../src/engine/types';
import { boardKey } from '../src/puzzles/grade';
import {
  classifyPlayTheme,
  deriveCubeChoices,
  mirrorBoard,
  mirrorMovement,
} from '../src/puzzles/mining';
import type {
  CubePuzzle,
  PlayAnswer,
  PlayPuzzle,
  Puzzle,
  PuzzleMatchContext,
  PuzzleTheme,
} from '../src/puzzles/types';
import { PUZZLE_THEMES } from '../src/puzzles/types';
import type { BoardState, DiceRoll, GameState, Player } from '../src/rules';
import {
  applyMovement,
  applyTurnMovement,
  commitPlayOnly,
  createSeededDice,
  pipCount,
  startGame,
  startNextTurn,
} from '../src/rules';

/** How many puzzles each theme should ship with. */
const TARGET_PER_THEME = 30;
/** Acceptance floor: warn when any theme ships with fewer (ticket 17). */
const MIN_PER_THEME = 25;
/** 0-ply screen window for the second-best play's loss. */
const SCREEN_MIN = 0.02;
const SCREEN_MAX = 0.6;
/** Full-strength requirements: a clear best with tempting alternatives. */
const MARGIN_MIN = 0.05;
const MARGIN_MAX = 0.3;
const MIN_CANDIDATES = 4;
/** Diversity: per game, at most this many puzzles of one theme. */
const PER_GAME_THEME_CAP = 1;
/**
 * Diversity: at most this many cube puzzles of one flavor (verdict class).
 * Scaled with TARGET_PER_THEME (ticket 17 kept the 1/3-of-target ratio the
 * 6-puzzle set used; five flavors at the old cap of 2 would hard-limit the
 * cube theme to 10).
 */
const CUBE_BUCKET_CAP = 10;
/** Cube decisions: both sides' errors must be real but not absurd. */
const CUBE_MARGIN_MIN = 0.05;
const CUBE_MARGIN_MAX = 0.45;
/** Self-play budget (the loop stops early once every theme is full). */
const MAX_GAMES = 2000;
const MAX_TURNS_PER_GAME = 180;
const SEED = 20261022;

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

interface MinedSet {
  readonly byTheme: Map<PuzzleTheme, Puzzle[]>;
  readonly cubeBuckets: Map<string, number>;
  total(): number;
  wants(theme: PuzzleTheme): boolean;
  wantsCubeBucket(bucket: string): boolean;
  add(theme: PuzzleTheme, puzzle: Puzzle, bucket?: string): void;
}

function createMinedSet(): MinedSet {
  const byTheme = new Map<PuzzleTheme, Puzzle[]>(
    PUZZLE_THEMES.map((theme) => [theme, []]),
  );
  const cubeBuckets = new Map<string, number>();
  return {
    byTheme,
    cubeBuckets,
    total() {
      let n = 0;
      for (const list of byTheme.values()) {
        n += list.length;
      }
      return n;
    },
    wants(theme) {
      return (byTheme.get(theme)?.length ?? 0) < TARGET_PER_THEME;
    },
    wantsCubeBucket(bucket) {
      return (cubeBuckets.get(bucket) ?? 0) < CUBE_BUCKET_CAP;
    },
    add(theme, puzzle, bucket) {
      byTheme.get(theme)?.push(puzzle);
      if (bucket) {
        cubeBuckets.set(bucket, (cubeBuckets.get(bucket) ?? 0) + 1);
      }
    },
  };
}

/** Per-game diversity limits, so one game cannot dominate a theme. */
interface GameQuota {
  readonly byTheme: Map<PuzzleTheme, number>;
}

function takeFromGame(quota: GameQuota, theme: PuzzleTheme): boolean {
  const used = quota.byTheme.get(theme) ?? 0;
  if (used >= PER_GAME_THEME_CAP) {
    return false;
  }
  quota.byTheme.set(theme, used + 1);
  return true;
}

/** Build a play puzzle from a full-strength ranking, mirrored to White. */
function buildPlayPuzzle(
  board: BoardState,
  hero: Player,
  roll: DiceRoll,
  theme: PuzzleTheme,
  ranked: readonly RankedPlay[],
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
    source: 'curated',
    board: whiteBoard,
    hero: 'white',
    match: MONEY,
    roll,
    answers,
  };
}

interface MiningStats {
  games: number;
  playScreened: number;
  playConfirmed: number;
  cubeEvaluated: number;
  cubeAccepted: number;
}

/** One decision point considered during self-play. */
function considerPlay(
  session: GnubgSession,
  mined: MinedSet,
  quota: GameQuota,
  seenPlays: Set<string>,
  stats: MiningStats,
  board: BoardState,
  player: Player,
  roll: DiceRoll,
  screened: readonly RankedPlay[],
): void {
  if (screened.length < MIN_CANDIDATES) {
    return;
  }
  const screenMargin = screened[1]?.equityLoss ?? 0;
  if (screenMargin < SCREEN_MIN || screenMargin > SCREEN_MAX) {
    return;
  }
  const theme = classifyPlayTheme(asWhite(board, player));
  if (!theme || !mined.wants(theme)) {
    return;
  }
  if ((quota.byTheme.get(theme) ?? 0) >= PER_GAME_THEME_CAP) {
    return;
  }
  const key = `${boardKey(asWhite(board, player))}#${[...roll].sort().join('')}`;
  if (seenPlays.has(key)) {
    return;
  }
  seenPlays.add(key);

  stats.playScreened++;
  // Confirm at full strength: the stored answers are always 2-ply truth.
  const full = session.rankPlays({ board, onRoll: player }, roll);
  if (full.length < MIN_CANDIDATES) {
    return;
  }
  const margin = full[1].equityLoss;
  if (margin < MARGIN_MIN || margin > MARGIN_MAX) {
    return;
  }
  if (!takeFromGame(quota, theme)) {
    return;
  }
  stats.playConfirmed++;
  mined.add(theme, buildPlayPuzzle(board, player, roll, theme, full));
  log(
    `  + ${theme} play puzzle (margin ${margin.toFixed(3)}, ` +
      `${full.length} candidates)`,
  );
}

/** A pre-roll moment: maybe a cube question for either side. */
function considerCube(
  session: GnubgSession,
  mined: MinedSet,
  quota: GameQuota,
  seenCubes: Set<string>,
  stats: MiningStats,
  board: BoardState,
  toRoll: Player,
  turnIndex: number,
): void {
  if (!mined.wants('cube-handling') || turnIndex < 6) {
    return;
  }
  if ((quota.byTheme.get('cube-handling') ?? 0) >= PER_GAME_THEME_CAP) {
    return;
  }
  // Cheap screen: cube questions get interesting once the roller leads.
  const lead = pipCount(board, other(toRoll)) - pipCount(board, toRoll);
  if (lead < 8) {
    return;
  }
  const key = `${boardKey(asWhite(board, toRoll))}#cube`;
  if (seenCubes.has(key)) {
    return;
  }
  seenCubes.add(key);

  stats.cubeEvaluated++;
  let analysis: ReturnType<GnubgSession['cubeInfo']>;
  try {
    analysis = session.cubeInfo({ board, onRoll: toRoll });
  } catch {
    return;
  }
  const verdict = analysis.properAction;
  const saysDouble = /^(re)?double/i.test(verdict);
  const saysNoDouble = /^(no (re)?double|too good)/i.test(verdict);

  /** The responder's question: take, or pass? */
  const tryResponse = (): boolean => {
    if (!saysDouble) {
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
      margin < CUBE_MARGIN_MIN ||
      margin > CUBE_MARGIN_MAX ||
      !mined.wantsCubeBucket(bucket) ||
      !takeFromGame(quota, 'cube-handling')
    ) {
      return false;
    }
    stats.cubeAccepted++;
    mined.add(
      'cube-handling',
      {
        id: 'pending',
        kind: 'cube',
        theme: 'cube-handling',
        source: 'curated',
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
    log(`  + cube response puzzle (${verdict}, margin ${margin.toFixed(3)})`);
    return true;
  };

  /** The doubler's question: double, or roll? */
  const tryOffer = (): boolean => {
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
      margin < CUBE_MARGIN_MIN ||
      margin > CUBE_MARGIN_MAX ||
      !mined.wantsCubeBucket(bucket) ||
      !takeFromGame(quota, 'cube-handling')
    ) {
      return false;
    }
    stats.cubeAccepted++;
    mined.add(
      'cube-handling',
      {
        id: 'pending',
        kind: 'cube',
        theme: 'cube-handling',
        source: 'curated',
        board: asWhite(board, toRoll),
        hero: 'white',
        match: MONEY,
        decision: 'offer',
        choices: offer.choices,
        verdict,
      } satisfies CubePuzzle,
      bucket,
    );
    log(`  + cube offer puzzle (${verdict}, margin ${margin.toFixed(3)})`);
    return true;
  };

  // A double-worthy position answers both questions; serve whichever flavor
  // the set still lacks, preferring a missing "you should double" drill.
  const offerDoubleCount = mined.cubeBuckets.get('offer-double') ?? 0;
  if (saysDouble && offerDoubleCount === 0) {
    tryOffer() || tryResponse();
  } else {
    tryResponse() || tryOffer();
  }
}

function log(message: string): void {
  console.log(message);
}

/** Self-play one money game at clean 0-ply, harvesting candidates. */
function playGame(
  session: GnubgSession,
  mined: MinedSet,
  seenPlays: Set<string>,
  seenCubes: Set<string>,
  stats: MiningStats,
  dice: { rollDie(): 1 | 2 | 3 | 4 | 5 | 6 },
): void {
  const quota: GameQuota = { byTheme: new Map() };
  let state: GameState = startGame(dice);
  for (let turn = 0; turn < MAX_TURNS_PER_GAME; turn++) {
    const current = state.turn;
    if (!current) {
      break;
    }
    let screened: readonly RankedPlay[] = [];
    try {
      screened = session.rankPlays(
        { board: state.board, onRoll: current.player },
        current.roll,
        { difficulty: 'expert' },
      );
    } catch {
      return; // an unexpected engine rejection ends this game quietly
    }

    considerPlay(
      session,
      mined,
      quota,
      seenPlays,
      stats,
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

    const toRoll = other(current.player);
    considerCube(
      session,
      mined,
      quota,
      seenCubes,
      stats,
      state.board,
      toRoll,
      turn,
    );
    state = startNextTurn(state, [dice.rollDie(), dice.rollDie()]);
  }
}

function render(puzzles: readonly Puzzle[]): string {
  return `/**
 * The bundled curated puzzle set (GLOSSARY "Curated puzzle").
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run mine:puzzles
 * (scripts/minePuzzles.ts: engine self-play sweeps positions, keeps the
 * instructive ones, and grades every answer at full strength. Themes are
 * tagged by position heuristics. No positions are copied from books or
 * other published sources.)
 *
 * curatedPuzzles.validation.test.ts re-evaluates every stored answer
 * against the real WASM engine, so stale or wrong answer data cannot ship.
 */

// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: engine equities are data, not math constants
import type { Puzzle } from './types';

export const CURATED_PUZZLES: readonly Puzzle[] = ${JSON.stringify(
    puzzles,
    null,
    2,
  )};
`;
}

export async function minePuzzles(): Promise<void> {
  log('Loading gnubg WASM…');
  const session = await loadGnubgSession();
  const mined = createMinedSet();
  const seenPlays = new Set<string>();
  const seenCubes = new Set<string>();
  const stats: MiningStats = {
    games: 0,
    playScreened: 0,
    playConfirmed: 0,
    cubeEvaluated: 0,
    cubeAccepted: 0,
  };
  const dice = createSeededDice(SEED);
  const started = Date.now();

  const done = () => PUZZLE_THEMES.every((theme) => !mined.wants(theme));

  for (let game = 0; game < MAX_GAMES && !done(); game++) {
    stats.games++;
    playGame(session, mined, seenPlays, seenCubes, stats, dice);
    if ((game + 1) % 20 === 0) {
      const counts = PUZZLE_THEMES.map(
        (theme) => `${theme} ${mined.byTheme.get(theme)?.length ?? 0}`,
      ).join(', ');
      log(
        `game ${game + 1}: ${counts} ` +
          `(${Math.round((Date.now() - started) / 1000)}s)`,
      );
    }
  }

  // Stable ids ordered by theme, then by discovery.
  const puzzles: Puzzle[] = [];
  let serial = 0;
  for (const theme of PUZZLE_THEMES) {
    for (const puzzle of mined.byTheme.get(theme) ?? []) {
      serial++;
      puzzles.push({
        ...puzzle,
        id: `curated-${String(serial).padStart(3, '0')}`,
      } as Puzzle);
    }
  }

  const target = fileURLToPath(
    new URL('../src/puzzles/curatedSet.ts', import.meta.url),
  );
  writeFileSync(target, render(puzzles));

  log('');
  log(`Mined ${puzzles.length} puzzles in ${stats.games} games:`);
  for (const theme of PUZZLE_THEMES) {
    log(`  ${theme}: ${mined.byTheme.get(theme)?.length ?? 0}`);
  }
  log(
    `play candidates screened ${stats.playScreened}, confirmed ` +
      `${stats.playConfirmed}; cube positions evaluated ${stats.cubeEvaluated},` +
      ` accepted ${stats.cubeAccepted}.`,
  );
  log(`Wrote ${target}`);
  for (const theme of PUZZLE_THEMES) {
    const count = mined.byTheme.get(theme)?.length ?? 0;
    if (count < MIN_PER_THEME) {
      log(
        `WARNING: ${theme} has ${count} < ${MIN_PER_THEME} puzzles — ` +
          'raise MAX_GAMES or loosen diversity caps.',
      );
    }
  }
}

/**
 * The player-facing glossary (ticket 32). One source of truth for both the
 * inline tooltips (GlossaryTerm) and the Learn > Glossary page. Definitions
 * are sourced from the canonical GLOSSARY.md but rewritten for players, not
 * developers: `short` is the one-line tooltip, `long` the fuller entry.
 */

export type GlossaryCategory = 'play' | 'analysis' | 'puzzles';

export interface GlossaryEntryData {
  /** The word as it reads in a sentence or heading. */
  readonly term: string;
  /** One plain sentence — the tooltip copy. */
  readonly short: string;
  /** A fuller player-facing definition for the glossary page. */
  readonly long: string;
  /** Which part of the app the term belongs to, for grouping on the page. */
  readonly category: GlossaryCategory;
}

/** A glossary entry with its stable id, as the page and tooltips consume it. */
export interface GlossaryEntry extends GlossaryEntryData {
  readonly id: GlossaryTermId;
}

/** The glossary page's sections, in reading order. */
export const GLOSSARY_CATEGORIES: ReadonlyArray<{
  id: GlossaryCategory;
  label: string;
  blurb: string;
}> = [
  {
    id: 'play',
    label: 'Playing',
    blurb: 'Words you meet at the board.',
  },
  {
    id: 'analysis',
    label: 'Analysis & review',
    blurb: 'How the engine grades your play.',
  },
  {
    id: 'puzzles',
    label: 'Puzzle themes',
    blurb: 'What each set of puzzles trains.',
  },
];

const ENTRIES = {
  // --- Playing -----------------------------------------------------------
  pips: {
    term: 'Pip count',
    short:
      'How far each side still has to travel — the total steps to bring every checker home and bear it off. Lower is ahead in the race.',
    long: 'Each point a checker moves is one pip. Your pip count adds up every step your checkers still need to reach home and come off the board. The lower number is winning the race, and the gap tells you by how much.',
    category: 'play',
  },
  match: {
    term: 'Match',
    short:
      'A series of games played to a points target, using the doubling cube and the Crawford rule.',
    long: 'A match runs until one player reaches the agreed points target (anywhere from 1 to 25). Games inside it can be worth more than one point through gammons and the doubling cube, so a match is rarely just a count of games won.',
    category: 'play',
  },
  game: {
    term: 'Game',
    short:
      'One game of backgammon within a match — from the opening roll to a win or a conceded cube.',
    long: 'A single game ends when someone bears off all fifteen checkers (a plain win, a gammon, or a backgammon) or when a player passes a double rather than play on. A match is made of one game after another.',
    category: 'play',
  },
  play: {
    term: 'Play',
    short:
      'Everything you do with one dice roll — all your checker moves together. It is the unit the analyzer scores.',
    long: 'A play is your complete action for a roll: both dice used (or all four on a double), every checker movement combined. The analyzer grades a whole play against the engine’s best, not each checker hop on its own.',
    category: 'play',
  },
  'doubling-cube': {
    term: 'Doubling cube',
    short:
      'The cube marked 2, 4, 8…64 that raises the stakes: offer it to double, and your opponent must take at the new value or pass and lose the game now.',
    long: 'Before rolling you may offer the cube to double the stakes. Your opponent either takes — accepting the game at twice the value and the right to redouble later — or passes, conceding the game at its current value. Used well it is where most of a match is won or lost.',
    category: 'play',
  },
  crawford: {
    term: 'Crawford game',
    short:
      'The single game right after someone reaches match point, where doubling is switched off to give the trailer one fair game at the current stakes.',
    long: 'The Crawford rule fires exactly once per match: the first game after either player gets within one point of winning is played with no doubling allowed. After that one game, the cube comes back and the trailer can start doubling again.',
    category: 'play',
  },
  jacoby: {
    term: 'Jacoby rule',
    short:
      'A money-play rule: a gammon or backgammon counts only as a single until someone has turned the cube.',
    long: 'In money play the Jacoby rule stops gammons and backgammons from counting double unless the cube has already been turned that game. It keeps either side from sitting on an undoubled position purely to grind out a gammon, so the cube stays central to the game.',
    category: 'play',
  },
  race: {
    term: 'Race',
    short:
      'A position where the two sides have passed each other, so nobody can be hit — a pure sprint to bear off first.',
    long: 'Once no checker can be hit by the other side, the game is a race: both players simply run home and bear off. With no contact left, the pip count decides it, and the app can even finish a race on autopilot.',
    category: 'play',
  },
  gammon: {
    term: 'Gammon',
    short:
      'A win worth double, scored when the loser has not borne off a single checker yet.',
    long: 'Bear off all fifteen before your opponent takes even one off and you win a gammon — twice the game’s value. If they also still have a checker in your home board or on the bar, it is a backgammon, worth triple.',
    category: 'play',
  },

  // --- Analysis & review -------------------------------------------------
  equity: {
    term: 'Equity',
    short:
      'What the position is worth to a player right now, counting every way the game can still turn out.',
    long: 'Equity is the expected result of a position — roughly, the average points you would score from here if the game were played out many times. A play that raises your equity is good; one that lowers it costs you.',
    category: 'analysis',
  },
  emg: {
    term: 'EMG',
    short:
      'Equity on a normalized scale (money-equivalent), so a mistake costs the same whatever the match score.',
    long: 'EMG restates match equity on a steady scale, like a money game, so the cost of an error is comparable whether it happened at the start of a match or at double match point. It is how the analyzer keeps every mistake on the same yardstick.',
    category: 'analysis',
  },
  pr: {
    term: 'PR',
    short:
      'Performance rating: how far your play drifted from the engine, on the scale serious players use. Lower is better — under about 5 is world-class.',
    long: 'PR (performance rating) scores a game or match by the equity you gave away per unforced decision, scaled the way the wider backgammon world reads it. Lower is better: roughly, under 5 is world-class, 5 to 8 expert, 8 to 13 advanced, 13 to 20 intermediate, and above that still finding your feet.',
    category: 'analysis',
  },
  'error-rate': {
    term: 'Error rate',
    short:
      'Your average equity lost per decision across a game or match — the single number that grades your play. Shown here as PR. Lower is better.',
    long: 'The error rate adds up all the equity you gave away and divides by the number of real decisions you faced (forced plays do not count). It is the headline quality score, shown here as PR: the smaller it is, the closer you played to the engine.',
    category: 'analysis',
  },
  luck: {
    term: 'Luck',
    short:
      'How kind the dice were — the equity your rolls handed you versus an average roll from the same spots. Positive is lucky; it is separate from PR, which grades only your decisions.',
    long: 'For every roll, the engine compares what your best play was worth against the average over all 21 possible rolls from that position. The difference is that roll’s luck, and the game’s figure adds them up: a big plus means the dice did you favours, a minus means they did not. It is deliberately kept apart from PR so you can tell a bad-dice loss from a bad-play one.',
    category: 'analysis',
  },
  error: {
    term: 'Error',
    short:
      'A play or cube decision that lost equity against the engine’s best choice — the bigger the loss, the worse the error.',
    long: 'Every decision is compared with the engine’s top choice; the equity you gave up is the error. Forced plays, where only one move is legal, are left out because there was nothing to get wrong.',
    category: 'analysis',
  },
  blunder: {
    term: 'Blunder',
    short:
      'A serious mistake — a play or cube decision that threw away at least 0.08 equity versus the engine’s best.',
    long: 'A blunder is the worst class of error, costing 0.08 equity or more. These are the decisions worth studying hardest, and the app mines them from your own games to build puzzles.',
    category: 'analysis',
  },
  dubious: {
    term: 'Dubious',
    short:
      'A slightly off choice — it cost a little equity, but not enough to count as a real error.',
    long: 'Dubious is the gentlest mark the analyzer gives: the play was not best, but the equity lost was small. Worth noticing, rarely worth losing sleep over.',
    category: 'analysis',
  },
  'two-ply': {
    term: '2-ply',
    short:
      'How deep the engine looked before scoring: it weighed every play, then every reply. One ply is one half-turn of look-ahead.',
    long: 'A ply is one side’s turn of look-ahead. At 2-ply the engine considers each candidate play and the opponent’s best answer before judging it. Analyzing deeper (3-ply) looks one turn further and is slower but sharper on close decisions.',
    category: 'analysis',
  },
  'tutor-mode': {
    term: 'Tutor mode',
    short:
      'A toggle that turns on live coaching — a hint, the eval bar, and feedback after each play — without changing your opponent.',
    long: 'With Tutor mode on you can ask for a hint, watch the eval bar, and see how each committed play scored, all at full engine strength. It is off by default so that games you want on your record stay unassisted.',
    category: 'analysis',
  },
  'eval-bar': {
    term: 'Eval bar',
    short:
      'The bar showing who is ahead right now and by how much, filling toward the side the engine favors.',
    long: 'The eval bar is a running read-out of the current position’s evaluation — White’s share of the game shown in the two checker colors, with the win chance and equity spelled out beside it. It updates as the game goes and only appears in Tutor mode.',
    category: 'analysis',
  },
  hint: {
    term: 'Hint',
    short:
      'Reveals the engine’s best play for the roll you are facing, on demand.',
    long: 'Ask for a hint and the engine shows its top play for your current roll. Available only in Tutor mode, it is there to learn from rather than to lean on.',
    category: 'analysis',
  },

  // --- Puzzle themes -----------------------------------------------------
  priming: {
    term: 'Priming',
    short: 'Build a wall of points in front of enemy checkers to trap them.',
    long: 'A prime is a row of made points your opponent cannot jump. Priming puzzles are about building and holding that wall — and about escaping one when it is aimed at you.',
    category: 'puzzles',
  },
  blitzing: {
    term: 'Blitzing',
    short: 'Attack an anchorless opponent while the bar holds them back.',
    long: 'A blitz piles checkers onto your home board fast, hitting and pointing to keep the opponent stuck on the bar. These puzzles test when to press the attack and when it has run out of steam.',
    category: 'puzzles',
  },
  'holding-game': {
    term: 'Holding game',
    short: 'Hold an anchor and play the waiting game from behind.',
    long: 'When you are behind in the race, an anchor deep in the opponent’s board keeps a shot alive. Holding-game puzzles are about timing — staying put, keeping your position, and waiting for the hit that turns the game.',
    category: 'puzzles',
  },
  'bear-off': {
    term: 'Bear-off',
    short:
      'The last phase: taking checkers off once they are all home — safely, without leaving a shot.',
    long: 'Bearing off means removing checkers from your home board. These puzzles test doing it in the right order so you come off fastest and, when there is still contact, without handing the opponent a shot.',
    category: 'puzzles',
  },
  'cube-handling': {
    term: 'Cube handling',
    short: 'Judge the double — offer, take, and pass at the right price.',
    long: 'Good cube handling is knowing when a position is strong enough to double, and whether an offered cube is a take or a pass. These puzzles drill those decisions, where whole matches are routinely won and lost.',
    category: 'puzzles',
  },
} as const satisfies Record<string, GlossaryEntryData>;

export type GlossaryTermId = keyof typeof ENTRIES;

export const GLOSSARY: Record<GlossaryTermId, GlossaryEntryData> = ENTRIES;

/** Whether a string names a glossary entry — guards ids from other modules. */
export function hasGlossaryEntry(id: string): id is GlossaryTermId {
  return Object.hasOwn(GLOSSARY, id);
}

/** Look an entry up by id, with the id carried onto the returned entry. */
export function glossaryEntry(id: GlossaryTermId): GlossaryEntry {
  return { id, ...GLOSSARY[id] };
}

/** Every entry of a category, in the order declared above. */
export function glossaryByCategory(
  category: GlossaryCategory,
): GlossaryEntry[] {
  return (Object.keys(GLOSSARY) as GlossaryTermId[])
    .filter((id) => GLOSSARY[id].category === category)
    .map((id) => glossaryEntry(id));
}
